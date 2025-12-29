'use client';

import { useState, useEffect } from 'react';
import { getInterviewSessions } from '@/lib/api';
import { FaMicrophone, FaCalendarAlt, FaPlay } from 'react-icons/fa';
import Link from 'next/link';

interface InterviewSession {
  id: string;
  title: string;
  status: string;
  created_at: Date;
}

export default function InterviewSessionsPage() {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInterviewSessions()
      .then(setSessions)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-foreground">Interview Sessions</h1>
      </div>

      {loading ? (
        <div className="text-muted">Loading history...</div>
      ) : sessions.length === 0 ? (
        <div className="text-center p-10 bg-card border border-border rounded-xl text-muted">
            No interviews yet. Go to the Application Tracker to start one!
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <Link 
              key={session.id} 
              href={`/dashboard/interview/${session.id}`}
              className="bg-card border border-border rounded-xl p-6 flex justify-between items-center hover:border-primary transition-all group"
            >
              <div className="flex items-center gap-4">
                 <div className="h-12 w-12 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xl">
                    <FaMicrophone />
                 </div>
                 <div>
                    <h3 className="font-bold text-lg text-foreground">{session.title}</h3>
                    <p className="text-sm text-muted flex items-center gap-2">
                        <FaCalendarAlt size={12} />
                        {new Date(session.created_at).toLocaleDateString()} at {new Date(session.created_at).toLocaleTimeString()}
                    </p>
                 </div>
              </div>
              
              <div className="flex items-center gap-4">
                 <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                    {session.status}
                 </span>
                 {session.status === 'active' && <FaPlay className="text-muted group-hover:text-primary transition-colors" />}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}