import React from 'react';
import { AnalysisResult } from '../types';

interface AnalysisDisplayProps {
  result: AnalysisResult;
  isTailoring: boolean;
  onTailorClick: () => void; // A function to be called when the button is clicked
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

      {/* --- NEW: Tailoring Button --- */}
      <div className="tailor-section">
        <button 
          className="analyze-button" // Reuse the same button style
          onClick={onTailorClick}
          disabled={isTailoring}
        >
          {isTailoring ? 'Generating PDF...' : 'Tailor Resume & Download PDF'}
        </button>
      </div>
    </section>
  );
};