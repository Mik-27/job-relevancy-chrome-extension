import React, { useState, useEffect } from 'react';
import { Application, InterviewPrep, TechnicalQuestion, ResumeDeepDiveQuestion, BehavioralQuestion } from '@/types';
import { updateApplication, getInterviewPrep, generateInterviewPrep } from '@/lib/api';
import { FaTimes, FaRobot, FaClipboardList, FaBuilding, FaCode, FaUserTie } from 'react-icons/fa';
import { Spinner } from '../ui/Spinner/Spinner';

interface JobDetailModalProps {
  app: Application;
  onClose: () => void;
  onUpdate: (updatedApp: Application) => void;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({ app, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'prep'>('details');
  const [jdText, setJdText] = useState(app.job_description || '');
  const [prepData, setPrepData] = useState<InterviewPrep | null>(null);
  const [loadingPrep, setLoadingPrep] = useState(false);
  const [isSavingJD, setIsSavingJD] = useState(false);

  // Fetch prep data if it exists
  useEffect(() => {
    if (activeTab === 'prep' && !prepData) {
        setLoadingPrep(true);
        getInterviewPrep(app.id)
            .then(setPrepData)
            .catch(() => {}) // Ignore 404
            .finally(() => setLoadingPrep(false));
    }
  }, [activeTab, app.id]);

  const handleSaveJD = async () => {
    setIsSavingJD(true);
    try {
        const updated = await updateApplication(app.id, { job_description: jdText });
        onUpdate(updated);
        // Force switch to prep to encourage generation
        setActiveTab('prep');
    } finally {
        setIsSavingJD(false);
    }
  };

  const handleGenerate = async () => {
    setLoadingPrep(true);
    try {
        const data = await generateInterviewPrep(app.id);
        setPrepData(data);
    } catch (e) {
        alert("Generation failed");
    } finally {
        setLoadingPrep(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 border-b border-border flex justify-between items-start">
            <div>
                <h2 className="text-2xl font-bold text-foreground">{app.company_name}</h2>
                <p className="text-muted">{app.job_title}</p>
            </div>
            <button onClick={onClose} className="text-muted hover:text-white"><FaTimes size={20}/></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-6">
            <button 
                onClick={() => setActiveTab('details')}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition ${activeTab === 'details' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-white'}`}
            >
                Details & JD
            </button>
            <button 
                onClick={() => setActiveTab('prep')}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition flex items-center gap-2 ${activeTab === 'prep' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-white'}`}
            >
                <FaRobot /> Interview Kit
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
            
            {/* --- TAB: DETAILS --- */}
            {activeTab === 'details' && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-muted mb-2">Job Description</label>
                        <p className="text-xs text-gray-500 mb-2">Paste the full JD here to enable AI features.</p>
                        <textarea 
                            className="w-full h-64 bg-input border border-border rounded-lg p-3 text-foreground resize-none focus:border-primary outline-none"
                            placeholder="Paste job description here..."
                            value={jdText}
                            onChange={(e) => setJdText(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end">
                        <button onClick={handleSaveJD} disabled={isSavingJD} className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50">
                            {isSavingJD ? 'Saving...' : 'Save Description'}
                        </button>
                    </div>
                </div>
            )}

            {/* --- TAB: PREP --- */}
            {activeTab === 'prep' && (
                <div>
                    {!app.job_description && !jdText ? (
                        <div className="text-center py-10 text-muted">
                            <FaClipboardList className="mx-auto text-4xl mb-4 opacity-50" />
                            <p>Please add a Job Description in the Details tab first.</p>
                        </div>
                    ) : (
                        <>
                            {!prepData ? (
                                <div className="text-center py-10">
                                    <div className="mb-4">
                                        <h3 className="text-lg font-semibold text-foreground">Generate Interview Kit</h3>
                                        <p className="text-muted text-sm max-w-md mx-auto mt-2">
                                            Our AI will analyze your resume against this JD to create custom questions and study points.
                                        </p>
                                    </div>
                                    <button onClick={handleGenerate} disabled={loadingPrep} className="bg-primary hover:bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-2 mx-auto">
                                        {loadingPrep ? <Spinner size="small"/> : <><FaRobot /> Generate Kit</>}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                                    
                                    {/* Company Analysis */}
                                    <section>
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-3"><FaBuilding className="text-blue-400"/> Company Insights</h3>
                                        <div className="bg-secondary/20 p-4 rounded-lg border border-border">
                                            <p className="text-sm text-gray-300"><strong>Tech Stack:</strong> {prepData.content.company_analysis.tech_stack.join(', ')}</p>
                                            <p className="text-sm text-gray-300 mt-2"><strong>Challenges:</strong></p>
                                            <ul className="list-disc list-inside text-sm text-muted">
                                                {prepData.content.company_analysis.challenges.map((c:string, i:number) => <li key={i}>{c}</li>)}
                                            </ul>
                                        </div>
                                    </section>

                                    {/* Technical Questions */}
                                    <section>
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-3"><FaCode className="text-green-400"/> Technical Questions</h3>
                                        <div className="space-y-3">
                                            {prepData.content.technical_questions.map((q: TechnicalQuestion, i: number) => (
                                                <div key={i} className="bg-secondary/10 p-4 rounded-lg border border-border/50">
                                                    <p className="font-medium text-foreground mb-2">{q.question}</p>
                                                    <div className="bg-black/20 p-3 rounded text-sm text-muted">
                                                        <span className="text-green-400 font-bold text-xs uppercase tracking-wide">Expected Answer: </span>
                                                        {q.answer_key}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                    
                                    {/* Resume Deep Dive */}
                                    <section>
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-3"><FaUserTie className="text-purple-400"/> Resume Deep Dive</h3>
                                        <div className="space-y-3">
                                            {prepData.content.resume_deep_dive.map((q: ResumeDeepDiveQuestion, i: number) => (
                                                <div key={i} className="bg-secondary/10 p-4 rounded-lg border border-border/50">
                                                    <p className="font-medium text-foreground">{q.question}</p>
                                                    <p className="text-xs text-muted mt-1 italic">{q.context}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

        </div>
      </div>
    </div>
  );
};