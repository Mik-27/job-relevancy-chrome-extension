import { useState, useEffect } from 'react';
import './App.css';
// Import our new shared types
import { AnalysisResult, ChromeMessage } from './types';

function App() {
  const [resumeText, setResumeText] = useState('');
  // The type for analysisResult now comes from our imported interface
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // The message parameter is now strongly typed
    const messageListener = (message: ChromeMessage) => {
      if (message.type === "analysisComplete") {
        setAnalysisResult(message.data);
        setIsLoading(false);
      } else if (message.type === "analysisError") {
        setError(message.error);
        setIsLoading(false);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, []);

  const handleAnalyzeClick = () => {
    setIsLoading(true);
    setError('');
    setAnalysisResult(null);

    // Send a strongly-typed message to the background script
    chrome.runtime.sendMessage({
      type: "startAnalysis",
      resumeText: resumeText,
    });
  };

  return (
    // The JSX part of the component does not need any changes
    <main className="app-container">
      <header>
        <h1>Resume Analyzer</h1>
        <p>Paste your resume and click analyze to score it against the current job posting.</p>
      </header>
      <section className="resume-input-section">
        <textarea
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          placeholder="Paste your resume text here..."
          className="resume-textarea"
        />
        <button 
          onClick={handleAnalyzeClick} 
          disabled={isLoading || !resumeText}
          className="analyze-button"
        >
          {isLoading ? 'Analyzing...' : 'Analyze'}
        </button>
      </section>
      {isLoading && <p className="loading-message">Scraping page and calling AI, please wait...</p>}
      {error && <p className="error-message">Error: {error}</p>}
      {analysisResult && (
        <section className="results-section">
          <h2>Analysis Result</h2>
          <div className="score-container">
            <p>Relevancy Score:</p>
            <span className="score">{analysisResult.relevancyScore}%</span>
          </div>
          <h3>Suggestions for Improvement:</h3>
          <ul className="suggestions-list">
            {analysisResult.suggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

export default App;