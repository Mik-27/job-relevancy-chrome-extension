'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  getApplication, updateApplication, 
  getInterviewRounds, createInterviewRound, updateInterviewRound, deleteInterviewRound, generateRoundPrep 
} from '@/lib/api';
import { Application, InterviewRound, InterviewType, RoundStatus } from '@/types';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { useToast } from '@/context/ToastContext';
import { 
  FaArrowLeft, FaCalendarAlt, FaPlus, FaRobot, FaTrash, 
  FaCheckCircle, FaSave, FaTimes 
} from 'react-icons/fa';

export default function ApplicationRoadmapPage() {
  const params = useParams();
  const router = useRouter();
  // Safe cast for Next.js params
  const appId = Array.isArray(params.id) ? params.id[0] : params.id;
  const toast = useToast();

  const [app, setApp] = useState<Application | null>(null);
  const [rounds, setRounds] = useState<InterviewRound[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States for JD Editing
  const [jdText, setJdText] = useState('');
  const [isSavingJD, setIsSavingJD] = useState(false);

  // States for Add Round
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRoundType, setNewRoundType] = useState<InterviewType>('screening');
  const [newRoundDate, setNewRoundDate] = useState('');

  // States for Generating/Viewing Prep
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [viewPrepRound, setViewPrepRound] = useState<InterviewRound | null>(null);

  useEffect(() => {
    if (!appId) return;

    const init = async () => {
      try {
        const [appData, roundsData] = await Promise.all([
          getApplication(appId),
          getInterviewRounds(appId)
        ]);
        setApp(appData);
        setJdText(appData.job_description || '');
        setRounds(roundsData);
      } catch (error) {
        toast.error("Failed to load application data");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [appId, toast]);

  const handleSaveJD = async () => {
    if (!app) return;
    setIsSavingJD(true);
    try {
      // Correctly typed Partial<Application>
      await updateApplication(app.id, { job_description: jdText });
      toast.success("Job Description saved");
    } catch (e) {
      toast.error("Failed to save JD");
    } finally {
      setIsSavingJD(false);
    }
  };

  const handleAddRound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appId) return;
    try {
      const nextRoundNumber = rounds.length + 1;
      // Partial<InterviewRound> for creation
      const newRound = await createInterviewRound({
        application_id: appId,
        round_number: nextRoundNumber,
        interview_type: newRoundType,
        interview_date: newRoundDate ? new Date(newRoundDate).toISOString() : null,
        status: 'scheduled'
      });
      setRounds([...rounds, newRound]);
      setIsAddModalOpen(false);
      toast.success("Round added");
    } catch (e) {
      toast.error("Failed to add round");
    }
  };

  const handleDeleteRound = async (roundId: string) => {
    if (!confirm("Delete this interview round?")) return;
    try {
      await deleteInterviewRound(roundId);
      setRounds(rounds.filter(r => r.id !== roundId));
      toast.success("Round deleted");
    } catch (e) {
      toast.error("Failed to delete");
    }
  };

  const handleGeneratePrep = async (roundId: string) => {
    if (!jdText) {
      toast.error("Please add a Job Description on the left first.");
      return;
    }
    setGeneratingId(roundId);
    try {
      const updatedRound = await generateRoundPrep(roundId);
      // Update the local state with the new data containing the prep material
      setRounds(rounds.map(r => r.id === roundId ? updatedRound : r));
      toast.success("Interview Prep Generated!");
      setViewPrepRound(updatedRound);
    } catch (e) {
      toast.error("Generation failed. Try again.");
    } finally {
      setGeneratingId(null);
    }
  };

  const handleFeedbackChange = (roundId: string, feedback: string) => {
    setRounds(rounds.map(r => r.id === roundId ? { ...r, user_feedback: feedback } : r));
  };
  
  const saveFeedback = async (roundId: string, feedback: string, status: RoundStatus) => {
     try {
         await updateInterviewRound(roundId, { user_feedback: feedback, status });
         toast.success("Feedback saved");
     } catch(e) {
         toast.error("Failed to save feedback");
     }
  }

  if (loading) return <div className="p-10 flex justify-center"><Spinner size="large" className="text-primary"/></div>;
  if (!app) return <div className="p-10 text-muted">Application not found</div>;

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col max-w-7xl mx-auto">
        
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="text-muted hover:text-white transition">
            <FaArrowLeft />
        </button>
        <div>
            <h1 className="text-2xl font-bold text-foreground">{app.company_name}</h1>
            <p className="text-muted text-sm">{app.job_title} • <span className="capitalize">{app.status}</span></p>
        </div>
      </div>

      <div className="flex-1 min-h-0 ml-10 mr-10">
        
        {/* LEFT COL: Job Description */}
        {/* <div className="lg:col-span-1 bg-card border border-border rounded-xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border bg-secondary/20 flex justify-between items-center">
                <h3 className="font-semibold text-foreground">Job Description</h3>
                <button 
                    onClick={handleSaveJD} 
                    disabled={isSavingJD}
                    className="text-xs flex items-center gap-1 text-primary hover:text-white transition"
                >
                    <FaSave /> {isSavingJD ? 'Saving...' : 'Save'}
                </button>
            </div>
            <textarea 
                className="flex-1 bg-input text-foreground p-4 resize-none outline-none text-sm font-mono leading-relaxed"
                placeholder="Paste the Job Description here to enable AI features..."
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
            />
        </div> */}

        {/* RIGHT COL: Roadmap */}
        <div className="flex flex-col gap-4 overflow-y-auto pr-2">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-foreground">Interview Roadmap</h2>
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition"
                >
                    <FaPlus /> Add Round
                </button>
            </div>

            {rounds.length === 0 && (
                <div className="text-center p-10 border-2 border-dashed border-border rounded-xl text-muted">
                    <p>No interviews scheduled yet.</p>
                    <button onClick={() => setIsAddModalOpen(true)} className="text-primary hover:underline mt-2">Add your first round</button>
                </div>
            )}

            {rounds.map((round) => (
                <div key={round.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm transition hover:border-primary/30">
                    
                    {/* Round Header */}
                    <div className="p-4 border-b border-border/50 bg-secondary/30 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <span className="bg-primary/20 text-primary border border-primary/20 text-xs font-bold px-2 py-1 rounded">
                                Round {round.round_number}
                            </span>
                            <span className="text-foreground font-medium capitalize">
                                {round.interview_type.replace('_', ' ')}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted">
                            <div className="flex items-center gap-2">
                                <FaCalendarAlt />
                                {round.interview_date ? new Date(round.interview_date).toLocaleDateString() : 'TBD'}
                            </div>
                            <button onClick={() => handleDeleteRound(round.id)} className="text-muted hover:text-error transition"><FaTrash /></button>
                        </div>
                    </div>

                    {/* Round Content */}
                    <div className="p-5 flex flex-col gap-4">
                        
                        {/* Prep Section */}
                        {round.prep_material ? (
                            <div className="flex items-center justify-between bg-green-900/10 border border-green-500/20 p-3 rounded-lg">
                                <div className="flex items-center gap-2 text-green-400 text-sm">
                                    <FaCheckCircle />
                                    <span>AI Prep Guide Generated</span>
                                </div>
                                <button 
                                    onClick={() => setViewPrepRound(round)}
                                    className="text-sm text-foreground hover:text-primary underline decoration-dotted"
                                >
                                    View Guide
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted">Prepare for this interview with AI.</p>
                                <button 
                                    onClick={() => handleGeneratePrep(round.id)}
                                    disabled={generatingId === round.id}
                                    className="bg-secondary hover:bg-white/10 text-white text-xs px-3 py-2 rounded flex items-center gap-2 border border-border transition"
                                >
                                    {generatingId === round.id ? <Spinner size="small" /> : <><FaRobot /> Generate Prep Kit</>}
                                </button>
                            </div>
                        )}

                        {/* Feedback Section */}
                        { round.interview_date && (
                            <>
                                <div className="relative">
                                    <textarea 
                                        placeholder="Post-interview notes & feedback..."
                                        className="w-full bg-input border border-border rounded-lg p-3 text-sm text-foreground focus:border-primary outline-none transition"
                                        rows={2}
                                        value={round.user_feedback || ''}
                                        onChange={(e) => handleFeedbackChange(round.id, e.target.value)}
                                        // onBlur={(e) => saveFeedback(round.id, e.target.value)}
                                        />
                                </div>
                                {
                                    round.status === 'scheduled' && (
                                    <div className='flex flex-row gap-2'>
                                        <button
                                            onClick={() => saveFeedback(round.id, round.user_feedback || '', 'progressed')}
                                            className="bg-success hover:bg-green-600 text-white px-3 py-1 rounded-lg flex items-center gap-2 text-sm transition"
                                        >
                                            Progressed
                                        </button>
                                        <button
                                            onClick={() => saveFeedback(round.id, round.user_feedback || '', 'rejected')}
                                            className="bg-error hover:bg-red-600 text-white px-3 py-1 rounded-lg flex items-center gap-2 text-sm transition"
                                        >
                                            Rejected
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* --- Add Round Modal --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)}>
          <div className="bg-card border border-border rounded-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4 text-foreground">Add Interview Round</h3>
            <div className="space-y-4">
                <div>
                    <label className="text-xs text-muted block mb-1">Type</label>
                    <select 
                        className="w-full bg-input border border-border rounded p-2 text-foreground"
                        value={newRoundType}
                        onChange={e => setNewRoundType(e.target.value as InterviewType)}
                    >
                        <option value="screening">Recruiter Screening</option>
                        <option value="technical">Technical (Coding)</option>
                        <option value="system_design">System Design</option>
                        <option value="behavioral">Behavioral</option>
                        <option value="hiring_manager">Hiring Manager</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs text-muted block mb-1">Date</label>
                    <input 
                        type="date" 
                        className="w-full bg-input border border-border rounded p-2 text-foreground"
                        value={newRoundDate}
                        onChange={e => setNewRoundDate(e.target.value)}
                    />
                </div>
                <button onClick={handleAddRound} className="w-full bg-primary hover:bg-blue-600 text-white py-2 rounded-lg font-medium mt-2">
                    Save Round
                </button>
            </div>
          </div>
        </div>
      )}

      {/* --- View Prep Modal --- */}
      {viewPrepRound && viewPrepRound.prep_material && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setViewPrepRound(null)}>
          <div className="bg-card border border-border rounded-xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
             <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/10">
                <h3 className="font-bold text-lg capitalize text-foreground">{viewPrepRound.interview_type.replace('_', ' ')} Prep</h3>
                <button onClick={() => setViewPrepRound(null)} className="text-muted hover:text-white"><FaTimes size={20}/></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* 1. Focus Areas */}
                <section>
                    <h4 className="text-primary font-bold uppercase tracking-wider text-sm mb-3">Focus Areas</h4>
                    <div className="flex flex-wrap gap-2">
                        {viewPrepRound.prep_material.focus_areas.map((area, i) => (
                            <span key={i} className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-sm">{area}</span>
                        ))}
                    </div>
                </section>

                {/* 2. Questions */}
                <section>
                    <h4 className="text-primary font-bold uppercase tracking-wider text-sm mb-3">Practice Questions</h4>
                    <div className="space-y-4">
                        {viewPrepRound.prep_material.questions.map((q, i) => (
                            <div key={i} className="bg-secondary/20 p-4 rounded-lg border border-border">
                                <p className="font-medium text-lg mb-2 text-foreground">{q.q}</p>
                                <div className="bg-[#111] p-3 rounded text-sm text-gray-400">
                                    <strong className="text-green-400 block mb-1 text-xs uppercase">Hint:</strong>
                                    {q.hint}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 3. Tips */}
                <section>
                    <h4 className="text-primary font-bold uppercase tracking-wider text-sm mb-3">Strategy Tips</h4>
                    <ul className="list-disc list-inside text-gray-300 space-y-2">
                        {viewPrepRound.prep_material.tips.map((tip, i) => (
                            <li key={i}>{tip}</li>
                        ))}
                    </ul>
                </section>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}