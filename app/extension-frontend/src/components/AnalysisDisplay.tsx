import React, { useState } from 'react';
import { AnalysisResult, TailoredResumeSchema } from '../types';
import { Spinner } from './ui/Spinner';
import { SuggestionCard } from './ui/SuggestionCard';
import { generateTailoredContent } from '../api/resumeApi';
import './AnalysisDisplay.css';

interface AnalysisDisplayProps {
  // It receives the result, which can be partial while loading
  result: Partial<AnalysisResult>;
  initialResumeText: string;
  initialJobDescriptionText: string;
  onTailoringSuccess: (content: TailoredResumeSchema) => void;
}

export const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ 
  result, 
  initialResumeText, 
  initialJobDescriptionText,
  onTailoringSuccess
}) => {
  // --- All state is now managed locally ---
  const [isGeneratingEditor, setIsGeneratingEditor] = useState(false);
//   const [isGeneratingCL, setIsGeneratingCL] = useState(false);
  const [error, setError] = useState('');

  const handleGoToEditorClick = async () => {
    setIsGeneratingEditor(true);
    setError('');
    try {
      // 1. Call API to get JSON content
      const content = await generateTailoredContent(initialResumeText, initialJobDescriptionText);
      
      // 2. Pass content up to MainApp to switch views
      onTailoringSuccess(content); 
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate AI content.");
    } finally {
      setIsGeneratingEditor(false);
    }
  };

//   const handleGenerateCLClick = async () => {
//     setIsGeneratingCL(true);
//     setError('');
//     try {
//       const response = await generateCoverLetter(initialResumeText, initialJobDescriptionText);
//       // Send message to content script to show the modal
//       const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
//       if (tab && tab.id) {
//         chrome.tabs.sendMessage(tab.id, {
//           type: "showCoverLetterModal",
//           text: response.cover_letter_text,
//         });
//       }
//     } catch (err) {
//       setError(err instanceof Error ? err.message : "Failed to generate cover letter.");
//     } finally {
//       setIsGeneratingCL(false);
//     }
//   };
  

  // Otherwise, render the main analysis results
  return (
    <>
      <section className="results-section">
        <h2>Analysis Result</h2>
        <div className="score-container">
          <p>Relevancy Score:</p>
          {result.relevancyScore !== undefined ? (
            <span className="score">{result.relevancyScore}%</span>
          ) : (
            <Spinner size="small" />
          )}
        </div>
        <h3>Suggestions for Improvement:</h3>
        {result.suggestions ? (
          <div className="flex flex-col gap-2">
            {result.suggestions.map((item, index) => (
              <SuggestionCard key={index} item={item} />
            ))}
          </div>
        ) : (
          <Spinner/>
        )}

        <div className="tailor-section">
          <button 
            className="analyze-button"
            onClick={handleGoToEditorClick}
            disabled={isGeneratingEditor || !result.suggestions}
          >
            {isGeneratingEditor ? <Spinner size="small" /> : 'Tailor with AI Editor'}
          </button>
        </div>

        {/* <div className="cover-letter-section">
          <button 
            className="analyze-button secondary"
            onClick={handleGenerateCLClick}
            disabled={isGeneratingEditor || isGeneratingCL || !result.suggestions}
          >
            {isGeneratingCL ? <Spinner size="small" /> : 'Generate Cover Letter'}
          </button>
        </div> */}
        
        {error && <p className="error-message" style={{ marginTop: '1rem' }}>{error}</p>}
      </section>
    </>
  );
};