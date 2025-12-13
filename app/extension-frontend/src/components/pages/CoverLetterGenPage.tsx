import React, { useState, useEffect } from 'react';
import { generateCoverLetterFromProfile, getUserStatus } from '../../api/resumeApi';
import { UserStatus } from '../../types';
import { Spinner } from '../ui/Spinner';
import { FaFileSignature } from 'react-icons/fa';
import './css/CoverLetterGenPage.css';

interface CoverLetterGenPageProps {
  jobDescription: string;
  onNavigateProfile: () => void;
}

export const CoverLetterGenPage: React.FC<CoverLetterGenPageProps> = ({ 
  jobDescription, 
  onNavigateProfile 
}) => {
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  // 1. Check for Master CV
  useEffect(() => {
    getUserStatus()
      .then(setUserStatus)
      .catch(() => setError("Failed to load user profile."))
      .finally(() => setLoadingProfile(false));
  }, []);

  // 2. Handle Generation
  const handleGenerate = async () => {
    if (!userStatus || !jobDescription) return;
    
    setIsGenerating(true);
    setError('');

    try {
      // A. Call Backend
      const response = await generateCoverLetterFromProfile(jobDescription);

      // B. Send message to Background (Relay)
      // We do NOT use chrome.tabs here anymore.
      await new Promise<void>((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: "showCoverLetterModal",
          text: response.cover_letter_text,
        }, (res) => {
          if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
          if (res && res.error) return reject(new Error(res.error));
          resolve();
        });
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (loadingProfile) return <div className="page-content"><Spinner /></div>;

  // State: No CV Uploaded
  if (userStatus && !userStatus.has_master_cv) {
    return (
      <div className="page-content" style={{ textAlign: 'center', marginTop: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem', color: '#a0a0a0' }}><FaFileSignature /></div>
        <h3>No Master CV Found</h3>
        <p style={{ color: '#a0a0a0', marginBottom: '2rem' }}>
          Please upload a Master CV in your profile to auto-generate cover letters.
        </p>
        <button className="analyze-button" onClick={onNavigateProfile}>
          Go to Web Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="info-box">
        <h4>Cover Letter Generator</h4>
        <p>
          We will use your <strong>Master CV</strong> and the current page's job description to write a tailored cover letter.
        </p>
      </div>

      {!jobDescription && (
        <p className="error-message">Warning: No Job Description found on this page.</p>
      )}

      {isGenerating && (
        <p className="loading-message sub-text">
          Analyzing CV and writing letter...
        </p>
      )}

      {error && <p className="error-message" style={{ marginTop: '1rem' }}>{error}</p>}

      <button 
        className="analyze-button generate-cl-button" 
        onClick={handleGenerate}
        disabled={isGenerating || !jobDescription}
      >
        {isGenerating ? <><Spinner size="small" />&nbsp; Analyzing CV and writing letter...</> : 'Generate Cover Letter'}
      </button>
      
    </div>
  );
};