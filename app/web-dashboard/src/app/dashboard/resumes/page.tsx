'use client';

import { useState, useEffect } from 'react';
import { listResumes, deleteResume, uploadResume } from '@/lib/api';
import { FaFilePdf, FaTrash, FaPlus, FaTimes, FaCloudUploadAlt } from 'react-icons/fa';
import { ResumeItem } from '@/types';
import { FilePreviewModal } from '@/components/ui/FilePreviewModal';

export default function MyResumesPage() {
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewResume, setPreviewResume] = useState<ResumeItem | null>(null);

  // Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [autoscore, setAutoscore] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fetchData = async () => {
    try {
      const data = await listResumes();
      setResumes(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering card click if we add one later
    if (!window.confirm("Are you sure you want to delete this resume?")) return;
    
    try {
      await deleteResume(id);
      setResumes(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      alert("Failed to delete resume");
      console.error(error);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsUploading(true);
    try {
      await uploadResume(uploadFile, companyName || "General", autoscore);
      await fetchData(); // Refresh list
      setIsModalOpen(false);
      // Reset form
      setUploadFile(null);
      setCompanyName('');
      setAutoscore(false);
    } catch (error) {
      alert("Upload failed");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
            <h1 className="text-3xl font-bold text-foreground">My Resumes</h1>
            <p className="text-muted mt-1">Manage your uploaded resumes and tailored versions.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-muted animate-pulse">Loading resumes...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          
          {/* --- 1. Upload New Card --- */}
          <div 
            onClick={() => setIsModalOpen(true)}
            className="border-2 border-dashed border-border bg-card/50 hover:bg-card hover:border-primary rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all group h-48"
          >
            <div className="p-4 rounded-full bg-secondary group-hover:bg-primary/20 text-muted group-hover:text-primary transition-colors mb-4">
              <FaPlus size={24} />
            </div>
            <h3 className="font-semibold text-foreground">Upload New</h3>
            <p className="text-xs text-muted mt-1">PDF format supported</p>
          </div>

          {/* --- 2. Resume Cards --- */}
          {resumes.map((resume) => (
            <div 
              key={resume.id} 
              onClick={() => setPreviewResume(resume)}
              className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between h-48 hover:border-primary transition-all relative group cursor-pointer shadow-sm hover:shadow-md"
            >  
              {/* Top Section */}
              <div className="flex items-start justify-between">
                <div className="p-3 bg-red-500/10 text-red-400 rounded-lg">
                  <FaFilePdf size={24} />
                </div>
                {/* Delete Button (Hidden by default, shown on group hover) */}
                <button 
                  onClick={(e) => handleDelete(resume.id, e)}
                  className="text-muted hover:text-error p-2 rounded hover:bg-error/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete"
                >
                  <FaTrash size={14} />
                </button>
              </div>

              {/* Content */}
              <div>
                <h4 className="font-bold text-foreground truncate" title={resume.company}>
                  {resume.company}
                </h4>
                <p className="text-xs text-muted truncate mt-1" title={resume.filename}>
                  {resume.filename}
                </p>
                <div className="mt-3 flex items-center gap-2">
                    {resume.autoscore && (
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                            Auto-Score
                        </span>
                    )}
 
                    <span className="text-[10px] text-muted">
                        Uploaded: {new Date().toLocaleDateString()} 
                    </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- Upload Modal --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
          <div 
            className="bg-card border border-border rounded-xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-foreground">Upload Resume</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-white"><FaTimes /></button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              
              {/* Company Name Input */}
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Company Name (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Google"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-input border border-border rounded-lg p-3 text-foreground focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              {/* File Input */}
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Resume File (PDF)</label>
                <div className="border border-border bg-input rounded-lg p-2">
                    <input 
                        type="file" 
                        accept=".pdf"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        className="block w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-secondary file:text-foreground hover:file:bg-border cursor-pointer"
                    />
                </div>
              </div>

              {/* Autoscore Checkbox */}
              <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-secondary/20">
                <input 
                  type="checkbox" 
                  id="autoscore"
                  checked={autoscore}
                  onChange={(e) => setAutoscore(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 text-primary focus:ring-primary bg-input"
                />
                <label htmlFor="autoscore" className="text-sm text-foreground cursor-pointer select-none">
                  Enable Auto-Scoring
                </label>
              </div>

              <button 
                type="submit" 
                disabled={!uploadFile || isUploading}
                className="w-full bg-primary hover:bg-blue-600 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {isUploading ? (
                   'Uploading...'
                ) : (
                   <><FaCloudUploadAlt size={18} /> Upload Resume</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- NEW: Resume Preview Modal --- */}
      <FilePreviewModal 
        isOpen={!!previewResume}
        onClose={() => setPreviewResume(null)}
        fileUrl={previewResume?.file_url || null}
        title={`${previewResume?.company} - ${previewResume?.filename}`}
        fileName={previewResume?.filename}
      />
      
    </div>
  );
}