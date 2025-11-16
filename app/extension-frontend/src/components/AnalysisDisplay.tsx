import React, { useState } from 'react';
import { AnalysisResult, TailoredResumeSchema } from '../types';
import { Spinner } from './ui/Spinner';
import { generateTailoredContent, generateCoverLetter } from '../api/resumeApi';
import { ResumeEditor } from './editor/ResumeEditor';
import { CoverLetterDisplay } from './CoverLetterDisplay';

// Define the two views within this component
type DisplayView = 'results' | 'editor';

interface AnalysisDisplayProps {
  // It receives the result, which can be partial while loading
  result: Partial<AnalysisResult>;
  initialResumeText: string;
  initialJobDescriptionText: string;
}

export const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ 
  result, 
  initialResumeText, 
  initialJobDescriptionText 
}) => {
  // --- All state is now managed locally ---
  const [view, setView] = useState<DisplayView>('results');
  const [isGeneratingEditor, setIsGeneratingEditor] = useState(false);
  const [isGeneratingCL, setIsGeneratingCL] = useState(false);
  const [error, setError] = useState('');
  
  const [tailoredContent, setTailoredContent] = useState<TailoredResumeSchema | null>(null);
  const [coverLetterText, setCoverLetterText] = useState<string | null>(null);

  const handleGoToEditorClick = async () => {
    setIsGeneratingEditor(true);
    setError('');
    try {
      const content = await generateTailoredContent(initialResumeText, initialJobDescriptionText);
      setTailoredContent(content);
      setView('editor');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate AI content.");
    } finally {
      setIsGeneratingEditor(false);
    }
  };

  const handleGenerateCLClick = async () => {
    setIsGeneratingCL(true);
    setError('');
    try {
      const response = await generateCoverLetter(initialResumeText, initialJobDescriptionText);
      setCoverLetterText(response.cover_letter_text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate cover letter.");
    } finally {
      setIsGeneratingCL(false);
    }
  };

  // If the view is 'editor', render the ResumeEditor
  if (view === 'editor' && tailoredContent) {
    return (
      <ResumeEditor 
        content={tailoredContent}
        onBack={() => setView('results')}
      />
    );
  }

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
            disabled={isGeneratingEditor || isGeneratingCL || !result.suggestions}
          >
            {isGeneratingEditor ? <Spinner size="small" /> : 'Tailor with AI Editor'}
          </button>
        </div>

        <div className="cover-letter-section">
          <button 
            className="analyze-button secondary"
            onClick={handleGenerateCLClick}
            disabled={isGeneratingEditor || isGeneratingCL || !result.suggestions}
          >
            {isGeneratingCL ? <Spinner size="small" /> : 'Generate Cover Letter'}
          </button>
        </div>
        
        {error && <p className="error-message" style={{ marginTop: '1rem' }}>{error}</p>}
      </section>

      {/* Render the Cover Letter modal conditionally */}
      {coverLetterText && (
        <CoverLetterDisplay 
          initialText={coverLetterText} 
          onClose={() => setCoverLetterText(null)} 
        />
      )}
    </>
  );
};