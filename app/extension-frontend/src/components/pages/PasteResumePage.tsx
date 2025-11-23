import React, { useState } from 'react';
import { Spinner } from '../ui/Spinner';

interface PasteResumePageProps {
  onAnalyze: (text: string) => void;
  isAnalyzing: boolean;
}

export const PasteResumePage: React.FC<PasteResumePageProps> = ({ onAnalyze, isAnalyzing }) => {
  const [text, setText] = useState('');

  return (
    <div className="page-content">
      <p>Paste your full resume text below.</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste your resume text here..."
        className="resume-textarea"
        style={{ minHeight: '200px' }}
      />
      
      <div style={{ marginTop: '1rem' }}>
        <button 
          className="analyze-button" 
          onClick={() => onAnalyze(text)}
          disabled={!text.trim() || isAnalyzing}
        >
          {isAnalyzing ? <Spinner size="small" /> : 'Analyze Text'}
        </button>
      </div>
    </div>
  );
};