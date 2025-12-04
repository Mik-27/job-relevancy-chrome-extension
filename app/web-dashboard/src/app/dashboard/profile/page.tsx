'use client';

import { useState, useEffect } from 'react';
import { UserProfile } from '@/types';
import { getUserProfile, updateUserProfile, uploadUserCV } from '@/lib/api';
import { FaTimes, FaDownload, FaExternalLinkAlt } from 'react-icons/fa';

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Separate state for file uploading to show distinct feedback
  const [uploadingCV, setUploadingCV] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // --- NEW: State for CV Modal ---
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

  // --- NEW: Handle CV Upload ---
  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadingCV(true);
      setMessage({ type: '', text: '' });
      
      try {
        const updated = await uploadUserCV(e.target.files[0]);
        setProfile(updated); // Updates state with new CV URL immediately
        setMessage({ type: 'success', text: 'Master CV uploaded successfully!' });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to upload CV.";
        setMessage({ type: 'error', text: errorMessage });
      } finally {
        setUploadingCV(false);
        // Reset the input value so the same file can be selected again if needed
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

  // --- NEW: Helper to determine file type and render content ---
  const renderCvContent = (url: string) => {
    // Simple check for file extension in the signed URL
    // Note: Signed URLs often have query params, so we check content before '?'
    const cleanUrl = url.split('?')[0].toLowerCase();
    const isPdf = cleanUrl.endsWith('.pdf');

    if (isPdf) {
      return (
        <iframe 
          src={url} 
          className="w-full h-full rounded-b-lg border-0" 
          title="CV Preview"
        />
      );
    } else {
      // Fallback for Word Docs using Google Docs Viewer
      const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
      return (
        <iframe 
          src={googleViewerUrl} 
          className="w-full h-full rounded-b-lg border-0" 
          title="CV Preview"
        />
      );
    }
  };

  if (loading) return <div className="text-gray-400 p-8">Loading profile...</div>;
  if (!profile) return <div className="text-red-400 p-8">Error loading profile.</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-white">My Profile</h1>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg space-y-8">
        
        {/* Form for Text Fields */}
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* ... (Keep all your existing text inputs from the previous step) ... */}
            {/* Row 1: Names */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ... Inputs ... */}
                 <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">First Name</label>
                    <input name="first_name" value={profile.first_name || ''} onChange={handleChange} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Last Name</label>
                    <input name="last_name" value={profile.last_name || ''} onChange={handleChange} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white outline-none focus:border-blue-500" />
                </div>
            </div>
             {/* Row 2: Contact */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                    <input value={profile.email || ''} disabled className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-gray-500 cursor-not-allowed" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Phone</label>
                    <input name="phone_number" value={profile.phone_number || ''} onChange={handleChange} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white outline-none focus:border-blue-500" />
                </div>
            </div>
            {/* Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">LinkedIn</label>
                    <input name="linkedin_profile" value={profile.linkedin_profile || ''} onChange={handleChange} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white outline-none focus:border-blue-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Website</label>
                    <input name="personal_website" value={profile.personal_website || ''} onChange={handleChange} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white outline-none focus:border-blue-500" />
                </div>
            </div>
            {/* Location */}
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Location</label>
                <input name="location" value={profile.location || ''} onChange={handleChange} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white outline-none focus:border-blue-500" />
            </div>
            
            <div className="flex justify-end">
                 <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-lg transition disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save Profile Details'}
                 </button>
            </div>
        </form>

        {/* --- NEW: Master CV Section --- */}
        <div className="pt-8 border-t border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Master CV / Career Info</h2>
          
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Upload PDF or Word (Max 5MB)
              </label>
              <input 
                type="file" 
                accept=".pdf,.doc,.docx"
                onChange={handleCVUpload}
                disabled={uploadingCV}
                className="block w-full text-sm text-gray-400
                  file:mr-4 file:py-2.5 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-gray-700 file:text-white
                  hover:file:bg-gray-600
                  cursor-pointer file:cursor-pointer"
              />
              {uploadingCV && <p className="text-sm text-blue-400 mt-2">Uploading...</p>}
            </div>

            {/* --- UPDATED: View CV Button --- */}
            <div className="w-full md:w-auto">
              {profile.cv_url ? (
                <button 
                  type="button"
                  onClick={() => setShowCvModal(true)}
                  className="flex items-center justify-center w-full md:w-auto py-2.5 px-4 border border-gray-600 hover:border-gray-500 rounded-lg text-gray-300 hover:text-white transition bg-gray-800"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  View Current CV
                </button>
              ) : (
                <span className="text-gray-500 text-sm italic">No CV uploaded yet</span>
              )}
            </div>
          </div>
        </div>

        {/* Global Feedback Messages */}
        {message.text && (
            <div className={`p-3 rounded-lg ${message.type === 'success' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
              {message.text}
            </div>
        )}

      </div>

      {/* --- NEW: CV PREVIEW MODAL --- */}
      {showCvModal && profile.cv_url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowCvModal(false)}>
          {/* Modal Content Container */}
          <div 
            className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800/50 rounded-t-xl">
              <h3 className="text-lg font-semibold text-white">Master CV Preview</h3>
              <div className="flex items-center gap-2">
                {/* Download Button */}
                <a 
                  href={profile.cv_url} 
                  download 
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
                  title="Download Original"
                >
                  <FaDownload />
                </a>
                 {/* Open in New Tab Button */}
                 <a 
                  href={profile.cv_url} 
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
                  title="Open in New Tab"
                >
                  <FaExternalLinkAlt />
                </a>
                {/* Close Button */}
                <button 
                  onClick={() => setShowCvModal(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-red-900/50 hover:text-red-400 rounded-lg transition ml-2"
                  title="Close"
                >
                  <FaTimes size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body (The Viewer) */}
            <div className="flex-1 bg-gray-800 relative">
               {renderCvContent(profile.cv_url)}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}