import React, { useState } from 'react';
import { AnalysisResult, TailoredResumeSchema } from '../types';
import { Spinner } from './ui/Spinner';
import { generateTailoredContent, generateCoverLetter } from './../api/resumeApi'; // Import the API call here
import { ResumeEditor } from './editor/ResumeEditor';
import { CoverLetterDisplay } from './CoverLetterDisplay';

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
  
  const [isGeneratingCL, setIsGeneratingCL] = useState(false);
  const [coverLetterText, setCoverLetterText] = useState<string | null>(null);
  const [clError, setClError] = useState('');


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

  const handleGenerateCLClick = async () => {
    setIsGeneratingCL(true);
    setClError('');
    try {
      const response = await generateCoverLetter(initialResumeText, initialJobDescriptionText);
      setCoverLetterText(response.cover_letter_text);
    } catch (err) {
      setClError(err instanceof Error ? err.message : "Failed to generate cover letter.");
    } finally {
      setIsGeneratingCL(false);
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

      {/* --- NEW: Cover Letter Section --- */}
      <div className="cover-letter-section">
        <button 
          className="analyze-button secondary" // Use a secondary style
          onClick={handleGenerateCLClick}
          disabled={isGeneratingCL}
        >
          {isGeneratingCL ? <Spinner size="small" /> : 'Generate Cover Letter'}
        </button>
        {clError && <p className="error-message">{clError}</p>}
      </div>

      {/* --- NEW: Render Modal Conditionally --- */}
      {coverLetterText && (
        <CoverLetterDisplay 
          initialText={coverLetterText} 
          onClose={() => setCoverLetterText(null)} 
        />
      )}
    </section>
  );
};