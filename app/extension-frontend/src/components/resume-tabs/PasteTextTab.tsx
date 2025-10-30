import React from 'react';

interface PasteTextTabProps {
  resumeText: string;
  setResumeText: (text: string) => void;
}

export const PasteTextTab: React.FC<PasteTextTabProps> = ({ resumeText, setResumeText }) => {
  return (
    <div className="paste-text-container">
      <p>Paste your full resume text below.</p>
      <textarea
        value={resumeText}
        onChange={(e) => setResumeText(e.target.value)}
        placeholder="Paste your resume text here..."
        className="resume-textarea" // Reuse existing style
      />
    </div>
  );
};