'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext'; 
import { listResumes, deleteResume, uploadResume, updateResumeAutoscore } from '@/lib/api';
import { FaFilePdf, FaTrash, FaPlus, FaTimes, FaCloudUploadAlt } from 'react-icons/fa';
import { ResumeItem } from '@/types';
import { FilePreviewModal } from '@/components/ui/FilePreviewModal';
import { TagSelector } from '@/components/ui/TagSelector';

// Constants (Same as extension)
const ROLE_TAGS = ['AI Engineer', 'Data Scientist', 'Software Engineer', 'Data Engineer', 'DevOps', 'Product Management', 'AI Scientist', 'Data Analyst', 'Business Analyst'];
const CATEGORY_TAGS = ['Finance', 'Healthcare', 'AdTech', 'EdTech', 'Banking', 'Ecommerce', 'Operation'];

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

  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const toast = useToast(); 

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

  // --- Handlers ---  

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsUploading(true);
    try {
      await uploadResume(
        uploadFile, 
        companyName || "General", 
        autoscore,
        selectedRoles,
        selectedCategories
      );
      await fetchData();
      setIsModalOpen(false);
      setUploadFile(null);
      setCompanyName('');
      setAutoscore(false);
      setSelectedRoles([]);
      setSelectedCategories([]);
      toast.success("Resume uploaded successfully.");
    } catch (error) {
      toast.error("Failed to upload resume. Please try again.");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering card click if we add one later
    if (!window.confirm("Are you sure you want to delete this resume?")) return;
    
    try {
      await deleteResume(id);
      setResumes(prev => prev.filter(r => r.id !== id));
      toast.success("Resume deleted successfully.");
    } catch (error) {
      toast.error("Failed to delete resume.");
      console.error(error);
    }
  };

  // --- Handle Toggle ---
  const handleToggleAutoscore = async (id: number, currentStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the preview modal
    
    const newStatus = !currentStatus;

    // Frontend Check: Limit to 3
    if (newStatus) {
      const activeCount = resumes.filter(r => r.autoscore).length;
      if (activeCount >= 3) {
        toast.error("Limit Reached: You can only enable auto-scoring for 3 resumes.");
        return;
      }
    }

    try {
      // Optimistic Update (makes UI feel instant)
      setResumes(prev => prev.map(r => r.id === id ? { ...r, autoscore: newStatus } : r));
      
      // Call API
      await updateResumeAutoscore(id, newStatus);
    } catch (error) {
      // Revert on failure
      setResumes(prev => prev.map(r => r.id === id ? { ...r, autoscore: currentStatus } : r));
      toast.error("Failed to update auto-scoring status.");
      console.error(error);
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
                {/* --- NEW: Tags Display --- */}
                <div className="flex flex-wrap gap-1 mt-3 mb-2">
                   {[...(resume.tags_role || []), ...(resume.tags_category || [])].slice(0, 3).map((tag, i) => (
                     <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted border border-border">
                       {tag}
                     </span>
                   ))}
                   {/* Show +X if there are more than 3 tags */}
                   {((resume.tags_role?.length || 0) + (resume.tags_category?.length || 0)) > 3 && (
                     <span className="text-[10px] px-1 py-0.5 text-muted">...</span>
                   )}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted">
                      Uploaded: {new Date().toLocaleDateString()} 
                  </span>

                  <div className="flex items-center justify-between">
                    <span className="mr-2 text-[10px] text-muted">Auto-Score</span>
                 
                    {/* Custom Toggle Switch */}
                    <button
                      onClick={(e) => handleToggleAutoscore(resume.id, resume.autoscore, e)}
                      className={`
                        relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none
                        ${resume.autoscore ? 'bg-primary' : 'bg-gray-600'}
                     `}
                      title="Toggle Auto-Scoring"
                    >
                      <span
                        className={`
                        inline-block h-3 w-3 transform rounded-full bg-white transition-transform
                        ${resume.autoscore ? 'translate-x-5' : 'translate-x-1'}
                        `}
                      />
                    </button>
                  </div>
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

              {/* --- NEW: Tag Selectors --- */}
              <div className="p-4 bg-[#262626] rounded-lg border border-border">
                <TagSelector 
                    label="Roles" 
                    options={ROLE_TAGS} 
                    selectedTags={selectedRoles} 
                    onChange={setSelectedRoles} 
                />
                <div className="h-px bg-border my-4"></div>
                <TagSelector 
                    label="Industry / Category" 
                    options={CATEGORY_TAGS} 
                    selectedTags={selectedCategories} 
                    onChange={setSelectedCategories} 
                />
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