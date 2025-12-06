'use client';

import { useState, useEffect } from 'react';
import { UserProfile } from '@/types';
import { getUserProfile, updateUserProfile, uploadUserCV } from '@/lib/api';
import { FilePreviewModal } from '@/components/ui/FilePreviewModal';

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCV, setUploadingCV] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showCvModal, setShowCvModal] = useState(false);

  useEffect(() => {
    getUserProfile()
      .then(setProfile)
      .catch(() => setMessage({ type: 'error', text: 'Failed to load profile.' }))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (profile) {
      setProfile({ ...profile, [e.target.name]: e.target.value });
    }
  };

  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadingCV(true);
      setMessage({ type: '', text: '' });
      
      try {
        const updated = await uploadUserCV(e.target.files[0]);
        setProfile(updated);
        setMessage({ type: 'success', text: 'Master CV uploaded successfully!' });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to upload CV.";
        setMessage({ type: 'error', text: errorMessage });
      } finally {
        setUploadingCV(false);
        e.target.value = ''; 
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const updated = await updateUserProfile(profile);
      setProfile(updated);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save changes.' });
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const renderCvContent = (url: string) => {
    const cleanUrl = url.split('?')[0].toLowerCase();
    const isPdf = cleanUrl.endsWith('.pdf');

    if (isPdf) {
      return <iframe src={url} className="w-full h-full rounded-b-lg border-0" title="CV Preview" />;
    } else {
      const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
      return <iframe src={googleViewerUrl} className="w-full h-full rounded-b-lg border-0" title="CV Preview" />;
    }
  };

  if (loading) return <div className="text-muted p-8 animate-pulse">Loading profile...</div>;
  if (!profile) return <div className="text-error p-8">Error loading profile.</div>;

  // --- Shared Styles ---
  const labelClass = "block text-sm font-medium text-muted mb-2";
  // Using semantic colors defined in tailwind.config.ts
  const inputClass = "w-full bg-input border border-border rounded-lg p-3 text-foreground placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all";
  const disabledInputClass = "w-full bg-[#222] border border-border rounded-lg p-3 text-gray-500 cursor-not-allowed";

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-foreground">My Profile</h1>

      <div className="bg-card border border-border rounded-xl p-6 shadow-lg space-y-8">
        
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Row 1: Names */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className={labelClass}>First Name</label>
                    <input name="first_name" value={profile.first_name || ''} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Last Name</label>
                    <input name="last_name" value={profile.last_name || ''} onChange={handleChange} className={inputClass} />
                </div>
            </div>

             {/* Row 2: Contact */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className={labelClass}>Email</label>
                    <input value={profile.email || ''} disabled className={disabledInputClass} />
                </div>
                <div>
                    <label className={labelClass}>Phone</label>
                    <input name="phone_number" value={profile.phone_number || ''} onChange={handleChange} className={inputClass} />
                </div>
            </div>

            {/* Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className={labelClass}>LinkedIn</label>
                    <input name="linkedin_profile" value={profile.linkedin_profile || ''} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                    <label className={labelClass}>Website</label>
                    <input name="personal_website" value={profile.personal_website || ''} onChange={handleChange} className={inputClass} />
                </div>
            </div>

            {/* Location */}
            <div>
                <label className={labelClass}>Location</label>
                <input name="location" value={profile.location || ''} onChange={handleChange} className={inputClass} />
            </div>
            
            <div className="flex justify-end">
                 <button 
                    type="submit" 
                    disabled={saving} 
                    className="bg-primary hover:bg-blue-600 text-white font-medium py-2.5 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    {saving ? 'Saving...' : 'Save Profile Details'}
                 </button>
            </div>
        </form>

        {/* --- Master CV Section --- */}
        <div className="pt-8 border-t border-border">
          <h2 className="text-xl font-semibold text-foreground mb-4">Master CV / Career Info</h2>
          
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex-1 w-full">
              <label className={labelClass}>
                Upload PDF or Word (Max 5MB)
              </label>
              {/* File Input Styling */}
              <input 
                type="file" 
                accept=".pdf,.doc,.docx"
                onChange={handleCVUpload}
                disabled={uploadingCV}
                className="block w-full text-sm text-muted
                  file:mr-4 file:py-2.5 file:px-4
                  file:rounded-lg file:border file:border-border
                  file:text-sm file:font-semibold
                  file:bg-input file:text-foreground
                  hover:file:bg-secondary
                  cursor-pointer file:cursor-pointer"
              />
              {uploadingCV && <p className="text-sm text-primary mt-2">Uploading...</p>}
            </div>

            <div className="w-full md:w-auto">
              {profile.cv_url ? (
                <button 
                  type="button"
                  onClick={() => setShowCvModal(true)}
                  className="flex items-center justify-center w-full md:w-auto py-2.5 px-4 border border-border hover:border-gray-500 rounded-lg text-muted hover:text-white transition bg-secondary/50"
                >
                  View Current CV
                </button>
              ) : (
                <span className="text-muted text-sm italic">No CV uploaded yet</span>
              )}
            </div>
          </div>
        </div>

        {/* Feedback Messages */}
        {message.text && (
            <div className={`p-3 rounded-lg border ${
                message.type === 'success' 
                ? 'bg-success/10 text-success border-success/20' 
                : 'bg-error/10 text-error border-error/20'
            }`}>
              {message.text}
            </div>
        )}

      </div>

      {/* --- CV PREVIEW MODAL --- */}
      {showCvModal && profile.cv_url && (  
        <FilePreviewModal 
          isOpen={showCvModal}
          onClose={() => setShowCvModal(false)}
          fileUrl={profile?.cv_url || null}
          title="Master CV Preview"
          fileName={`Master_CV_${profile?.first_name || 'User'}.pdf`}
        />
      )}
    </div>
  );
}