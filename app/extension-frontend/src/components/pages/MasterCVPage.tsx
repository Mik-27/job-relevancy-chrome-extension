import React, { useState, useEffect } from 'react';
import { getUserProfile, generateFromMasterCV } from '../../api/resumeApi';
import { UserProfile, TailoredContent, TailoredResumeSchema } from '../../types';
import { Spinner } from '../ui/Spinner';

interface MasterCVPageProps {
  jobDescription: string;
  onGenerationSuccess: (content: TailoredResumeSchema) => void;
  onNavigateProfile: () => void;
}

export const MasterCVPage: React.FC<MasterCVPageProps> = ({ 
  jobDescription, 
  onGenerationSuccess, 
  onNavigateProfile 
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  // 1. Check if user has a Master CV uploaded
  useEffect(() => {
    getUserProfile()
      .then(setProfile)
      .catch(() => setError("Failed to load user profile."))
      .finally(() => setLoadingProfile(false));
  }, []);

  // 2. Handle the Generation Logic
  const handleGenerate = async () => {
    if (!profile || !jobDescription) return;
    
    setIsGenerating(true);
    setError('');

    try {
      // A. Get the content from the LLM (using Master CV from DB)
      const aiContent: TailoredContent = await generateFromMasterCV(jobDescription);

      // B. Merge with Profile Data on Frontend to create the full object for the Editor
      const fullResumeData: TailoredResumeSchema = {
        name: `${profile.first_name} ${profile.last_name}`,
        email: profile.email,
        phone: profile.phone_number,
        location: profile.location,
        linkedin_url: profile.linkedin_profile,
        portfolio_url: profile.personal_website || '',
        github_url: '', // Add to profile later if needed
        ...aiContent
      };

      // C. Pass to parent to open Editor
      onGenerationSuccess(fullResumeData);

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
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
        <h3>No Master CV Found</h3>
        <p style={{ color: '#a0a0a0', marginBottom: '2rem' }}>
          You need to upload a Master CV (PDF) in your profile to use this feature.
        </p>
        <button className="analyze-button" onClick={onNavigateProfile}>
          Go to Profile
        </button>
      </div>
    );
  }

  // State: Ready to Generate
  return (
    <div className="page-content">
      <div className="info-box" style={{ backgroundColor: '#2a3a5c', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #1a6aff' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#64ffda' }}>Ready to Tailor</h4>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          We will extract relevant projects and skills from your <strong>Master CV</strong> to match the current job description.
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
        {isGenerating ? <Spinner size="small" /> : 'Generate Targeted Resume'}
      </button>
      
      {isGenerating && (
        <p className="loading-message sub-text">
          Reading PDF and selecting content... (approx 20s)
        </p>
      )}
      
      {error && <p className="error-message" style={{ marginTop: '1rem' }}>{error}</p>}
    </div>
  );
};