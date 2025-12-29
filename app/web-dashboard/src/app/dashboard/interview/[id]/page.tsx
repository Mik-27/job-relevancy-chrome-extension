'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getLiveInterviewWebSocketUrl, getUserProfile, endInterviewSession } from '@/lib/api';
import { useLiveInterview } from '@/hooks/useLiveInterview';
import { ShadowReport as ShadowReportType } from '@/types';
import { ShadowReport } from '@/components/interview/ShadowReport';
import { FaMicrophone, FaPhoneSlash, FaRobot, FaUser } from 'react-icons/fa';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import './page.css';

export default function LiveInterviewPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState('Candidate');
  const [report, setReport] = useState<ShadowReportType | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  
  // Auto-scroll ref
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { status, isSpeaking, connect, disconnect, errorMsg, volume, transcript } = useLiveInterview(wsUrl);

  useEffect(() => {
    // 1. Get User Name
    getUserProfile().then(p => setUserName(p.first_name)).catch(() => {});
    
    // 2. Get WS URL
    getLiveInterviewWebSocketUrl(sessionId)
      .then((url => {setWsUrl(url); }))
      .catch((err) => console.error("Failed to get WS URL", err));
  }, [sessionId]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const handleEndSession = async () => {
    disconnect(); // Stop audio
    setGeneratingReport(true);
    try {
        const data = await endInterviewSession(sessionId); // appId here is session_id
        setReport(data);
    } catch (e) {
        console.error(e);
        // router.back(); // Fallback if fails
    } finally {
        setGeneratingReport(false);
    }
  };

  if (generatingReport) {
      return (
          <div className="h-screen flex flex-col items-center justify-center text-center">
              <Spinner size="large" className="text-primary mb-4" />
              <h2 className="text-2xl font-bold text-white">Generating Shadow Report...</h2>
              <p className="text-muted">The Hiring Manager is reviewing your answers.</p>
          </div>
      )
  }

  if (report) {
      return (
          <div className="max-w-5xl mx-auto p-8">
              <button onClick={() => router.back()} className="mb-6 text-muted hover:text-white">&larr; Back to Roadmap</button>
              <ShadowReport report={report} />
          </div>
      )
  }

  return (
    <div className="interview-grid">
      
      {/* --- LEFT COLUMN: Personas --- */}
      <div className="interview-sidebar">
        
        {/* Agent Persona */}
        <div className="avatar-container">
          <div className={`avatar-circle avatar-ai ${isSpeaking ? 'speaking' : ''}`}>
            <FaRobot />
          </div>
          <div className="avatar-name">Alex (Talent Specialist)</div>
          <div className="avatar-status">
            {isSpeaking ? <span className="text-blue-400">Speaking...</span> : "Listening"}
          </div>
        </div>

        <div className="sidebar-divider"></div>

        {/* User Persona */}
        <div className="avatar-container w-full">
          <div className="avatar-circle avatar-user">
            <FaUser />
          </div>
          <div className="avatar-name">{userName}</div>
          
          {/* Volume Visualizer */}
          <div className="volume-wrapper">
            <div className="volume-track">
              <div 
                className="volume-fill" 
                style={{ width: `${volume}%` }}
              ></div>
            </div>
            <div className="volume-labels">
              <span>QUIET</span>
              <span className={volume > 20 ? 'text-blue-400' : ''}>SPEAKING...</span>
              <span className={volume > 70 ? 'text-green-400' : ''}>HEALTHY</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-auto w-full">
          {status === 'idle' || status === 'error' || status === 'connecting' ? (
            <button 
              onClick={connect}
              disabled={!wsUrl}
              className="w-full bg-primary hover:bg-blue-600 text-white py-3 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2 transition-all"
            >
              {status === 'connecting' ? <Spinner size="small" /> : <><FaMicrophone /> Start Interview</>}
            </button>
          ) : (
            <button 
              onClick={handleEndSession}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2 transition-all"
            >
              <FaPhoneSlash /> End Session
            </button>
          )}
          {errorMsg && <p className="text-red-400 text-xs text-center mt-2">{errorMsg}</p>}
        </div>
      </div>

      {/* --- RIGHT COLUMN: Transcript --- */}
      <div className="chat-container">
        <div className="p-4 border-b border-gray-700 bg-black/20">
            <h3 className="font-bold text-white">Live Transcript</h3>
        </div>
        
        <div className="chat-messages">
          {transcript.length === 0 && (
             <div className="text-center text-muted mt-10 italic">
                Ready to start. Click the button on the left to begin...
             </div>
          )}

          {transcript.map((msg, index) => (
            <div key={index} className={`flex flex-col ${msg.role === 'ai' ? 'items-start' : 'items-end'}`}>
              <span className="sender-name">{msg.role === 'ai' ? 'Alex' : 'You'}</span>
              <div className={`message-bubble ${msg.role === 'ai' ? 'message-ai' : 'message-user'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
      </div>

    </div>
  );
}