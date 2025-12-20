'use client';

import { useState } from 'react';
import { uploadResume } from '@/lib/api';
import { ResumeItem, UploadResumeResponse } from '@/types';
import { FaCloudUploadAlt, FaTimes } from 'react-icons/fa';
import { TagSelector } from '@/components/ui/TagSelector';
import { useToast } from '@/context/ToastContext';

// Reuse constants
const ROLE_TAGS = ['AI Engineer', 'Data Scientist', 'Software Engineer', 'Data Engineer', 'DevOps', 'Product Management', 'AI Scientist', 'Data Analyst', 'Business Analyst'];
const CATEGORY_TAGS = ['Finance', 'Healthcare', 'AdTech', 'EdTech', 'Banking', 'Ecommerce', 'Operation'];

interface UploadResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newResume: UploadResumeResponse) => void;
}

export const UploadResumeModal: React.FC<UploadResumeModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [autoscore, setAutoscore] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  const [isUploading, setIsUploading] = useState(false);
  const toast = useToast();

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setIsUploading(true);
    try {
      const newResume = await uploadResume(
        uploadFile, 
        companyName || "General", 
        autoscore,
        selectedRoles,
        selectedCategories
      );
      
      toast.success("Resume uploaded successfully!");
      onSuccess(newResume);
      
      // Cleanup
      setUploadFile(null);
      setCompanyName('');
      setAutoscore(false);
      setSelectedRoles([]);
      setSelectedCategories([]);
      onClose();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload resume.");
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-card border border-border rounded-xl w-full max-w-lg p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-foreground">Upload Resume</h3>
          <button onClick={onClose} className="text-muted hover:text-white"><FaTimes /></button>
        </div>

        <form onSubmit={handleUpload} className="space-y-5">
          
          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-muted mb-2">Company Name (Optional)</label>
            <input 
              type="text" 
              placeholder="e.g. Google"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full bg-input border border-border rounded-lg p-3 text-foreground focus:ring-2 focus:ring-primary outline-none transition"
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

          {/* Tags */}
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

          {/* Autoscore */}
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
  );
};