import React, { useState, useEffect } from 'react';
import { getUserProfile, generateCoverLetterFromProfile } from '../../api/resumeApi';
import { UserProfile } from '../../types';
import { Spinner } from '../ui/Spinner';
import { FaFileSignature } from 'react-icons/fa';

interface CoverLetterGenPageProps {
  jobDescription: string;
  onNavigateProfile: () => void;
}

export const CoverLetterGenPage: React.FC<CoverLetterGenPageProps> = ({ 
  jobDescription, 
  onNavigateProfile 
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  // 1. Check for Master CV
  useEffect(() => {
    getUserProfile()
      .then(setProfile)
      .catch(() => setError("Failed to load user profile."))
      .finally(() => setLoadingProfile(false));
  }, []);

  // 2. Handle Generation
  const handleGenerate = async () => {
    if (!profile || !jobDescription) return;
    
    setIsGenerating(true);
    setError('');

    try {
      // A. Call Backend
      const response = await generateCoverLetterFromProfile(jobDescription);

      // B. Send message to content script to show the modal (Detached)
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: "showCoverLetterModal",
          text: response.cover_letter_text,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (loadingProfile) return <div className="page-content"><Spinner /></div>;

  // State: No CV Uploaded
  if (profile && !profile.cv_url) {
    return (
      <div className="page-content" style={{ textAlign: 'center', marginTop: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem', color: '#a0a0a0' }}><FaFileSignature /></div>
        <h3>No Master CV Found</h3>
        <p style={{ color: '#a0a0a0', marginBottom: '2rem' }}>
          Please upload a Master CV in your profile to auto-generate cover letters.
        </p>
        <button className="analyze-button" onClick={onNavigateProfile}>
          Go to Profile
        </button>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="info-box" style={{ backgroundColor: '#2a3a5c', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #1a6aff' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#64ffda' }}>Cover Letter Generator</h4>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          We will use your <strong>Master CV</strong> and the current page's job description to write a tailored cover letter.
        </p>
      </div>

      {!jobDescription && (
        <p className="error-message">Warning: No Job Description found on this page.</p>
      )}

      <button 
        className="analyze-button" 
        onClick={handleGenerate}
        disabled={isGenerating || !jobDescription}
      >
        {isGenerating ? <Spinner size="small" /> : 'Generate Cover Letter'}
      </button>
      
      {isGenerating && (
        <p className="loading-message sub-text">
          Analyzing CV and writing letter...
        </p>
      )}
      
      {error && <p className="error-message" style={{ marginTop: '1rem' }}>{error}</p>}
    </div>
  );
};