import React from 'react';
import { AnalysisResult } from '../types';

interface AnalysisDisplayProps {
  result: AnalysisResult;
}

export const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ result }) => {
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
    </section>
  );
};