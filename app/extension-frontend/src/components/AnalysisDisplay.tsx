import React from 'react';
import { AnalysisResult } from '../types';
import { Spinner } from './ui/Spinner';

interface AnalysisDisplayProps {
  result: AnalysisResult;
  isTailoring: boolean;
  onTailorClick: () => void;
}

export const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ result, isTailoring, onTailorClick }) => {
  return (
    <section className="results-section">
      <h2>Analysis Result</h2>
      <div className="score-container">
        <p>Relevancy Score:</p>
        <span className="score">{result.relevancyScore}%</span>
      </div>
      <h3>Suggestions for Improvement:</h3>
      <ul className="suggestions-list">
        {result.suggestions.map((suggestion, index) => (
          <li key={index}>{suggestion}</li>
        ))}
      </ul>

      <div className="tailor-section">
        <button 
          className="analyze-button"
          onClick={onTailorClick}
          disabled={isTailoring}
        >
          {/* --- NEW: Specific button text --- */}
          {isTailoring ?  <Spinner size="small" /> : 'Tailor Resume & Download PDF'}
        </button>
        {/* --- NEW: Specific sub-text for the slow process --- */}
        {isTailoring && <p className="loading-message sub-text">This may take up to 30 seconds...</p>}
      </div>
    </section>
  );
};