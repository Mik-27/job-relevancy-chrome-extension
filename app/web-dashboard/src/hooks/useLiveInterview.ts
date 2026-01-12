import { useState, useRef, useEffect, useCallback } from 'react';

// Fix TS global scope for older browsers
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
//   timestamp: Date;
}

export const useLiveInterview = (wsUrl: string | null) => {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<ChatMessage[]>([]);
  const [volume, setVolume] = useState(0); // This will update at ~60fps
  const [errorMsg, setErrorMsg] = useState('');

  const ws = useRef<WebSocket | null>(null);
  
  // Audio Contexts
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Audio Queue
  const nextStartTimeRef = useRef<number>(0);
  const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  
  // Volume Animation
  const volumeRef = useRef(0); // Stores the latest raw volume instantly
  const animFrameRef = useRef<number | null>(null);

  // --- Helpers ---
  const float32ToInt16 = (float32: Float32Array): Int16Array => {
    const int16 = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16;
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer as ArrayBuffer;
  };

  // Helper to append text to the last message if it's from the same role (streaming effect)
  const appendToTranscript = (role: 'user' | 'ai', text: string) => {
    setTranscript(prev => {
      const last = prev[prev.length - 1];
      // If the last message was from AI and we are receiving more AI text, append it
      if (last && last.role === role) {
        return [
          ...prev.slice(0, -1),
          { ...last, text: last.text + text }
        ];
      }
      // Otherwise, start a new bubble
      return [...prev, { role, text, timestamp: new Date() }];
    });
  };

  // --- Volume Animation Loop ---
  const startVolumeLoop = () => {
    const loop = () => {
      // Smoothly interpolate towards the target volume for a nicer visual effect
      setVolume(v => {
        const target = volumeRef.current;
        const diff = target - v;
        return v + (diff * 0.2); // Smoothing factor
      });
      animFrameRef.current = requestAnimationFrame(loop);
    };
    loop();
  };

  const stopVolumeLoop = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    setVolume(0);
    volumeRef.current = 0;
  };

  // --- 1. Audio Player (Output - 24kHz) ---
  const playAudioChunk = async (base64Data: string) => {
    try {
      if (!audioContextOutRef.current) {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        audioContextOutRef.current = new AudioCtor({ sampleRate: 24000 });
      }
      const ctx = audioContextOutRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const arrayBuffer = base64ToArrayBuffer(base64Data);
      const int16Data = new Int16Array(arrayBuffer);
      const float32Data = new Float32Array(int16Data.length);

      for (let i = 0; i < int16Data.length; i++) {
        float32Data[i] = int16Data[i] / 32768.0;
      }

      const audioBuffer = ctx.createBuffer(1, float32Data.length, 24000);
      audioBuffer.copyToChannel(float32Data, 0);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      const startTime = Math.max(now, nextStartTimeRef.current);
      source.start(startTime);
      nextStartTimeRef.current = startTime + audioBuffer.duration;
      
      scheduledSourcesRef.current.push(source);
      setIsSpeaking(true);

      source.onended = () => {
        scheduledSourcesRef.current = scheduledSourcesRef.current.filter(s => s !== source);
        if (scheduledSourcesRef.current.length === 0) {
          setIsSpeaking(false);
        }
      };

    } catch (e) {
      console.error("Playback error:", e);
    }
  };

  // --- 2. Audio Recorder (Input - 16kHz) ---
  const startRecording = async () => {
    try {
      // Stop any existing loop
      stopVolumeLoop();

      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      audioContextInRef.current = new AudioCtor({ sampleRate: 16000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          sampleRate: 16000, 
          channelCount: 1, 
          echoCancellation: true, 
          autoGainControl: true,
          noiseSuppression: true
        } 
      });
      streamRef.current = stream;

      const source = audioContextInRef.current.createMediaStreamSource(stream);
      const processor = audioContextInRef.current.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // 1. Calculate Volume (Update Ref, NOT State)
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        // Update the ref. The animation loop will pick this up.
        volumeRef.current = Math.min(100, Math.floor(rms * 1000)); // Increased sensitivity

        // 2. Send to Backend
        if (ws.current?.readyState === WebSocket.OPEN) {
            const pcmInt16 = float32ToInt16(inputData);
            const base64Audio = arrayBufferToBase64(pcmInt16.buffer as ArrayBuffer);
            
            ws.current.send(JSON.stringify({
              realtime_input: {
                media_chunks: [{
                  mime_type: "audio/pcm", 
                  data: base64Audio
                }]
              }
            }));
        }
      };

      source.connect(processor);
      
      // Connect to a GainNode(0) -> Destination to keep the processor alive without feedback
      const gainNode = audioContextInRef.current.createGain();
      gainNode.gain.value = 0;
      processor.connect(gainNode);
      gainNode.connect(audioContextInRef.current.destination);

      // Start the UI animation loop
      startVolumeLoop();

    } catch (err) {
      console.error("Mic Error:", err);
      setErrorMsg("Microphone access denied.");
      setStatus('error');
    }
  };

  const stopRecording = () => {
    stopVolumeLoop();
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextInRef.current) {
        audioContextInRef.current.close();
        audioContextInRef.current = null;
    }
  };

  // --- 3. Connection Management ---
  const connect = useCallback(() => {
    if (!wsUrl) return;
    if (ws.current) ws.current.close();

    setStatus('connecting');
    setErrorMsg('');
    
    const socket = new WebSocket(wsUrl);
    ws.current = socket;

    socket.onopen = () => {
      console.log("WebSocket connected");
      setStatus('connected');
      setTimeout(() => startRecording(), 100);
    };

    socket.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'audio') {
          playAudioChunk(msg.data);
        }
        else if (msg.type === 'transcript' && msg.role === 'ai') {
            appendToTranscript('ai', msg.data);
        } else if (msg.type === 'transcript' && msg.role === 'user') {
            appendToTranscript('user', msg.data);
        }
      } catch (e) { console.error(e); }
    };

    socket.onerror = (e) => {
      console.error("WS Error", e);
      setStatus('error');
      setErrorMsg("Connection failed.");
    };

    socket.onclose = () => {
      setStatus('idle');
      stopRecording();
    };
  }, [wsUrl]);

  const disconnect = useCallback(() => {
    if (ws.current) ws.current.close();
    stopRecording();
    if (audioContextOutRef.current) {
        audioContextOutRef.current.close();
        audioContextOutRef.current = null;
    }
    setStatus('idle');
  }, []);

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return { status, isSpeaking, connect, disconnect, errorMsg, volume, transcript };
};