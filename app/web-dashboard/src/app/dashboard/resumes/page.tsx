'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext'; 
import { listResumes, deleteResume, updateResumeAutoscore } from '@/lib/api';
import { FaFilePdf, FaTrash, FaPlus} from 'react-icons/fa';
import { ResumeItem } from '@/types';
import { FilePreviewModal } from '@/components/ui/FilePreviewModal';
import { UploadResumeModal } from '@/components/modals/UploadResumeModal';
import { Skeleton } from '@/components/ui/Skeleton';


export default function MyResumesPage() {
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewResume, setPreviewResume] = useState<ResumeItem | null>(null);

  const toast = useToast(); 

  const fetchData = async () => {
    try {
      const data = await listResumes();
      console.log("Fetched Resumes:", data);
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
        <ResumesGridSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          
          {/* --- 1. Upload New Card --- */}
          <div 
            onClick={() => setIsUploadOpen(true)}
            className="border-2 border-dashed border-border bg-card/50 hover:bg-card hover:border-primary rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all group h-72" /* Fixed Height h-72 */
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
              className="bg-card border border-border rounded-xl p-5 flex flex-col h-72 hover:border-primary transition-all relative group cursor-pointer shadow-sm hover:shadow-md"
            >
              
              {/* --- Header Section (Fixed at Top) --- */}
              <div className="flex items-start justify-between mb-2">
                <div className="p-3 bg-red-500/10 text-red-400 rounded-lg">
                  <FaFilePdf size={24} />
                </div>
                <button 
                  onClick={(e) => handleDelete(resume.id, e)}
                  className="text-muted hover:text-error p-2 rounded hover:bg-error/10 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  title="Delete"
                >
                  <FaTrash size={14} />
                </button>
              </div>

              {/* --- Body Section (Takes available space) --- */}
              <div className="flex-1 min-h-0 flex flex-col">
                <h4 className="font-bold text-foreground truncate text-lg" title={resume.company}>
                  {resume.company}
                </h4>
                <p className="text-xs text-muted truncate mt-1 mb-3" title={resume.filename}>
                  {resume.filename}
                </p>

                {/* Tags Container - Scrolls if too many tags, preventing layout break */}
                <div className="flex flex-wrap gap-1.5 content-start overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pr-1">
                   {[...(resume.tags_role || []), ...(resume.tags_category || [])].map((tag, i) => (
                     <span key={i} className="text-[10px] px-2 py-1 rounded-md bg-secondary text-gray-300 border border-border whitespace-nowrap">
                       {tag}
                     </span>
                   ))}
                </div>
              </div>

              {/* --- Footer Section (Pinned to Bottom) --- */}
              <div className="pt-4 border-t border-border mt-3 flex items-center justify-between bg-card z-10">
                   <span className="text-[10px] text-muted">
                        Uploaded: {resume.created_at ? new Date(resume.created_at).toLocaleDateString() : 'N/A'} 
                   </span>
                   
                   {/* Autoscore Toggle */}
                   <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                     <span className="text-[10px] text-muted">Auto-Score</span>
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
          ))}
        </div>
      )}

      {/* --- Upload Modal --- */}
      {/* --- NEW: Reusable Upload Modal --- */}
      <UploadResumeModal 
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={(newResume) => {
            // Update list immediately
            setResumes([newResume.resume, ...resumes]);
        }}
      />

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

const ResumeCardSkeleton = () => (
  <div className="bg-card border border-border rounded-xl p-5 flex flex-col h-72 shadow-sm">
    <div className="flex items-start justify-between mb-2">
      <Skeleton className="h-12 w-12 rounded-lg" />
      <Skeleton variant="circle" className="h-8 w-8" />
    </div>

    <div className="flex-1 min-h-0 flex flex-col">
      <Skeleton variant="line" className="h-6 w-2/3 mt-1" />
      <Skeleton variant="line" className="h-3 w-4/5 mt-3 mb-4" />

      <div className="flex flex-wrap gap-1.5 content-start">
        <Skeleton variant="pill" className="h-5 w-14" />
        <Skeleton variant="pill" className="h-5 w-16" />
        <Skeleton variant="pill" className="h-5 w-12" />
        <Skeleton variant="pill" className="h-5 w-20" />
      </div>
    </div>

    <div className="pt-4 border-t border-border mt-3 flex items-center justify-between">
      <Skeleton variant="line" className="h-3 w-24" />
      <div className="flex items-center gap-2">
        <Skeleton variant="line" className="h-3 w-14" />
        <Skeleton variant="pill" className="h-5 w-9" />
      </div>
    </div>
  </div>
);

const ResumesGridSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
    <div className="border-2 border-dashed border-border bg-card/50 rounded-xl p-6 flex flex-col items-center justify-center h-72">
      <Skeleton variant="circle" className="h-16 w-16 mb-4" />
      <Skeleton variant="line" className="h-5 w-24" />
      <Skeleton variant="line" className="h-3 w-28 mt-2" />
    </div>

    {Array.from({ length: 7 }).map((_, index) => (
      <ResumeCardSkeleton key={index} />
    ))}
  </div>
);