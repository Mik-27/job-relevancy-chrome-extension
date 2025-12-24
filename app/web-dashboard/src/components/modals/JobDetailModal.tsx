import React, { useState } from 'react';
import { Application, } from '@/types';
import { updateApplication } from '@/lib/api';
import { FaTimes } from 'react-icons/fa';

interface JobDetailModalProps {
  app: Application;
  onClose: () => void;
  onUpdate: (updatedApp: Application) => void;
}

export const JobDetailModal: React.FC<JobDetailModalProps> = ({ app, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'prep'>('details');
  const [jdText, setJdText] = useState(app.job_description || '');
  const [isSavingJD, setIsSavingJD] = useState(false);

  // Fetch prep data if it exists
//   useEffect(() => {
//     if (activeTab === 'prep' && !prepData) {
//         setLoadingPrep(true);
//         getInterviewPrep(app.id)
//             .then(setPrepData)
//             .catch(() => {}) // Ignore 404
//             .finally(() => setLoadingPrep(false));
//     }
//   }, [activeTab, app.id]);

  const handleSaveJD = async () => {
    setIsSavingJD(true);
    try {
        const updated = await updateApplication(app.id, { job_description: jdText });
        onUpdate(updated);
        // Force switch to prep to encourage generation
        setActiveTab('prep');
    } finally {
        setIsSavingJD(false);
        onClose();
    }
  };

//   const handleGenerate = async () => {
//     setLoadingPrep(true);
//     try {
//         const data = await generateInterviewKit(app.id);
//         setPrepData(data);
//     } catch (e) {
//         alert("Generation failed");
//     } finally {
//         setLoadingPrep(false);
//     }
//   };

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
            {/* <button 
                onClick={() => setActiveTab('prep')}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition flex items-center gap-2 ${activeTab === 'prep' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-white'}`}
            >
                <FaRobot /> Interview Kit
            </button> */}
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

        </div>
      </div>
    </div>
  );
};