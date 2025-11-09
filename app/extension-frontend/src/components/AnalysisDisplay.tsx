import React, { useState } from 'react';
import { AnalysisResult, TailoredResumeSchema } from '../types';
import { Spinner } from './ui/Spinner';
import { generateTailoredContent } from './../api/resumeApi'; // Import the API call here
import { ResumeEditor } from './editor/ResumeEditor';

type DisplayView = 'results' | 'editor';

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
  const [view, setView] = useState<DisplayView>('results');
  const [isGenerating, setIsGenerating] = useState(false);
  const [tailoredContent, setTailoredContent] = useState<TailoredResumeSchema | null>(null);
  const [error, setError] = useState('');


  const handleGoToEditorClick = async () => {
    setIsGenerating(true);
    setError('');
    try {
      const content = await generateTailoredContent(initialResumeText, initialJobDescriptionText);
      setTailoredContent(content);
      setView('editor'); // Switch to the editor view on success
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate AI content.");
    } finally {
      setIsGenerating(false);
    }
  };

//   const handleTailorClick = async () => {
//     setIsTailoring(true);
//     setTailorError('');
//     try {
//       const pdfBlob = await tailorResume(initialResumeText, initialJobDescriptionText);
      
//       const url = window.URL.createObjectURL(pdfBlob);
//       const a = document.createElement('a');
//       a.href = url;
//       a.download = 'Tailored_Resume.pdf';
//       document.body.appendChild(a);
//       a.click();
//       a.remove();
//       window.URL.revokeObjectURL(url);

//     } catch (err) {
//       const errorMessage = err instanceof Error ? `PDF Generation Failed: ${err.message}` : "An unknown error occurred during tailoring.";
//       setTailorError(errorMessage);
//     } finally {
//       setIsTailoring(false);
//     }
//   };


  // If the view is 'editor', show the ResumeEditor component
  if (view === 'editor' && tailoredContent) {
    return (
      <ResumeEditor 
        content={tailoredContent}
        onBack={() => setView('results')} // Pass a function to switch the view back
      />
    );
  }

  return (
    <section className="results-section">
      <h2>Analysis Result</h2>
      <div className="score-container">
        <p>Relevancy Score:</p>
        <span className="score">{result.relevancyScore}%</span>
      </div>
      <h3>Suggestions for Improvement:</h3>
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
          onClick={handleGoToEditorClick}
          disabled={isGenerating || result.relevancyScore === undefined || !result.suggestions}
        >
          {isGenerating ? <Spinner size="small" /> : 'Tailor Resume with AI Editor'}
        </button>
        {isGenerating && <p className="loading-message sub-text">Generating editable content...</p>}
        {error && <p className="error-message">{error}</p>}
      </div>
    </section>
  );
};