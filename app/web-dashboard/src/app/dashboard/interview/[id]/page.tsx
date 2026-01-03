'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getLiveInterviewWebSocketUrl, getUserProfile, endInterviewSession, getInterviewSession } from '@/lib/api';
import { useLiveInterview } from '@/hooks/useLiveInterview';
import { InterviewSession, ShadowReport as ShadowReportType } from '@/types';
import { ShadowReport } from '@/components/interview/ShadowReport';
import { FaArrowRight, FaHeadphones, FaInfoCircle, FaMicrophone, FaPhoneSlash, FaRobot, FaUser } from 'react-icons/fa';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import './page.css';

export default function LiveInterviewPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState('Candidate');
  const [sessionData, setSessionData] = useState<InterviewSession | null>(null);
  const [report, setReport] = useState<ShadowReportType | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  
  // Auto-scroll ref
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { status, isSpeaking, connect, disconnect, errorMsg, volume, transcript } = useLiveInterview(wsUrl);

  // 1. Initial Fetch: Check Session Status
  useEffect(() => {
    const init = async () => {
      try {
        // Fetch User
        getUserProfile().then(p => setUserName(p.first_name)).catch(() => {});

        // Fetch Session Details
        const session = await getInterviewSession(sessionId);
        setSessionData(session);

        if (session.status === 'completed' && session.report) {
          // If completed, show report immediately
          setReport(session.report);
          setLoading(false);
        } else {
          // If active, prepare WebSocket
          const url = await getLiveInterviewWebSocketUrl(sessionId);
          setWsUrl(url);
          setLoading(false);
        }
      } catch (err) {
        console.error("Initialization failed", err);
        setLoading(false);
      }
    };
    init();
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


  if (loading) {
    return <div className="h-screen flex items-center justify-center"><Spinner size="large" /></div>;
  }

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

  // Home Screen before starting interview  
  if (!hasStarted) {
    return (
      <div className="h-[calc(100vh-4.5rem)]">
        <div className="flex flex-col items-center justify-center h-full p-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-2xl w-full px-8 py-4 md:p-12 text-center">
                
                {/* --- Header --- */}
                <h1 className="text-4xl font-bold text-white mb-4">
                Ready for your interview?
                </h1>
                
                <p className="text-lg text-muted mb-7 leading-relaxed max-w-lg mx-auto">
                I&apos;m <span className="text-white font-semibold">Alex</span>, and I&apos;ll be conducting your 
                <span className="text-primary font-bold"> {sessionData?.title} </span> 
                today. We&apos;ll focus on your experience and skills relevant to the job description.
                </p>

                {/* --- Info Box --- */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 text-left mb-10">
                <div className="flex items-center gap-3 mb-4 text-blue-400">
                    <FaInfoCircle className="text-xl" />
                    <h3 className="font-bold text-lg">Quick Tips for Voice Interviewing:</h3>
                </div>
                
                <ul className="space-y-3 text-gray-300 text-sm md:text-base">
                    <li className="flex items-start gap-3">
                        <span className="mt-1 text-blue-500/50">•</span>
                        Use a quiet environment with minimal background noise.
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="mt-1 text-blue-500/50">•</span>
                        Speak clearly and naturally, just like a real video call.
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="mt-1 text-blue-500/50">•</span>
                        Wait for Alex to finish speaking completely before responding.
                    </li>
                    <li className="flex items-start gap-3">
                        <span className="mt-1 text-blue-500/50">•</span>
                        The session will take about {sessionData?.duration_minutes ?? sessionData?.duration_minutes ?? '10-15'} minutes.
                    </li>
                </ul>
                </div>

                {/* --- Action Button --- */}
                <button 
                    onClick={() => setHasStarted(true)}
                    className="w-full md:w-auto bg-primary hover:bg-blue-600 text-white text-lg font-bold py-4 px-10 rounded-full shadow-lg hover:shadow-blue-500/20 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-3 mx-auto"
                >
                    Start Interview Session <FaArrowRight />
                </button>

            </div>

            {/* Footer Text */}
            <p className="mt-6 text-xs text-muted flex items-center gap-2">
                <FaHeadphones /> Headphones recommended for best audio quality
            </p>

            </div>
      </div>
    );
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