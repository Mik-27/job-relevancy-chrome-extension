import React, { useState } from 'react';
import { AnalysisResult } from '../types';
import { Spinner } from './ui/Spinner';
import { tailorResume } from './../api/resumeApi'; // Import the API call here

interface AnalysisDisplayProps {
  result: Partial<AnalysisResult>;
  initialResumeText: string;
  initialJobDescriptionText: string;
}

export const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ 
  result, 
  initialResumeText, 
  initialJobDescriptionText 
}) => {
  // NEW: State for tailoring is now managed locally within this component
  const [isTailoring, setIsTailoring] = useState(false);
  const [tailorError, setTailorError] = useState('');

  const handleTailorClick = async () => {
    setIsTailoring(true);
    setTailorError('');
    try {
      const pdfBlob = await tailorResume(initialResumeText, initialJobDescriptionText);
      
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Tailored_Resume.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (err) {
      const errorMessage = err instanceof Error ? `PDF Generation Failed: ${err.message}` : "An unknown error occurred during tailoring.";
      setTailorError(errorMessage);
    } finally {
      setIsTailoring(false);
    }
  };

  return (
    <section className="results-section">
      <h2>Analysis Result</h2>
      
      <div className="score-container">
        <p>Relevancy Score:</p>
        {/* This logic correctly handles a missing score */}
        {result.relevancyScore !== undefined ? (
          <span className="score">{result.relevancyScore}%</span>
        ) : (
          <Spinner size="small" />
        )}
      </div>

      <h3>Suggestions for Improvement:</h3>
      {/* This logic correctly handles missing suggestions */}
      {result.suggestions ? (
        <ul className="suggestions-list">
          {result.suggestions.map((suggestion, index) => (
            <li key={index}>{suggestion}</li>
          ))}
        </ul>
      ) : (
        <Spinner />
      )}

      <div className="tailor-section">
        <button 
          className="analyze-button"
          onClick={handleTailorClick}
          // Button is disabled until all data is present
          disabled={isTailoring || result.relevancyScore === undefined || !result.suggestions}
        >
          {isTailoring ? <Spinner size="small" /> : 'Tailor Resume & Download PDF'}
        </button>
        {isTailoring && <p className="loading-message sub-text">This may take up to 30 seconds...</p>}
        {tailorError && <p className="error-message">{tailorError}</p>}
      </div>
    </section>
  );
};