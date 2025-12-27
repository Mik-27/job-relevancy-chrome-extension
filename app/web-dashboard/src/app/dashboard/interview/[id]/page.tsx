'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getLiveInterviewWebSocketUrl } from '@/lib/api';
import { useLiveInterview } from '@/hooks/useLiveInterview';
import { FaMicrophone, FaPhoneSlash } from 'react-icons/fa';
import { Spinner } from '@/components/ui/Spinner/Spinner';

export default function LiveInterviewPage() {
  const params = useParams();
  const router = useRouter();
  const appId = params.id as string;
  const [wsUrl, setWsUrl] = useState<string | null>(null);

  // 1. Get volume from hook
  const { status, isSpeaking, connect, disconnect, errorMsg, volume } = useLiveInterview(wsUrl);

  useEffect(() => {
    getLiveInterviewWebSocketUrl(appId)
      .then(setWsUrl)
      .catch((err) => console.error("Failed to get WS URL", err));
  }, [appId]);

  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-6rem)]">
      
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-foreground mb-2">AI Mock Interview</h1>
        <p className="text-muted">Speak clearly. The AI will respond in real-time.</p>
      </div>

      <div className="relative flex items-center justify-center w-64 h-64 mb-10">
        {/* AI Speaking Indicator (Outer Ring) */}
        <div 
          className={`absolute w-full h-full rounded-full border-4 border-primary/30 transition-all duration-300
            ${isSpeaking ? 'scale-110 border-primary animate-pulse' : 'scale-100'}
          `}
        />
        
        {/* Status Circle */}
        <div className={`
          relative w-48 h-48 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500
          ${status === 'connected' ? 'bg-gradient-to-br from-green-500/20 to-green-900/20 border-green-500' : 'bg-card border-border'}
          border-2
        `}>
          {status === 'connecting' && <Spinner size="large" />}
          
          {status === 'connected' && (
             <FaMicrophone size={64} className={`text-white transition-opacity ${isSpeaking ? 'opacity-50' : 'opacity-100'}`} />
          )}

          {status === 'idle' && <div className="text-muted text-lg">Ready</div>}
          {status === 'error' && <div className="text-red-500 font-bold">Error</div>}
        </div>
      </div>

      {/* --- NEW: Volume Meter --- */}
      {status === 'connected' && (
        <div className="w-64 h-2 bg-secondary rounded-full overflow-hidden mb-8 relative">
           {/* Background track */}
           <div className="absolute inset-0 bg-[#333]"></div>
           {/* Active Bar */}
           <div 
             className="h-full bg-green-500 transition-all duration-75 ease-out" 
             style={{ width: `${volume}%` }}
           ></div>
        </div>
      )}

      <div className="flex gap-4 flex-col items-center">
        {errorMsg && <p className="text-red-400 text-sm mb-2">{errorMsg}</p>}

        {status === 'idle' || status === 'error' ? (
          <button 
            onClick={connect}
            disabled={!wsUrl}
            className="bg-primary hover:bg-blue-600 text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg flex items-center gap-3 transition-all transform hover:scale-105"
          >
            <FaMicrophone /> Start Session
          </button>
        ) : (
          <button 
            onClick={() => {
                disconnect();
                router.back(); 
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg flex items-center gap-3 transition-all"
          >
            <FaPhoneSlash /> End Interview
          </button>
        )}
      </div>

    </div>
  );
}