import { useState, useEffect, useCallback } from 'react';
import './App.css';
import { AnalysisResult, ChromeMessage } from './types';
import { Tabs } from './components/ui/Tabs';
import { PasteTextTab } from './components/resume-tabs/PasteTextTab';
import { UploadResumeTab } from './components/resume-tabs/UploadResumeTab';
import { ChooseResumeTab } from './components/resume-tabs/ChooseResumeTab';
import { AnalysisDisplay } from './components/AnalysisDisplay';

function App() {
  // This state holds the final resume content ready for analysis
  const [resumeText, setResumeText] = useState('');
  
  // This state is just to trigger a refresh of the "ChooseResume" tab after an upload
  const [uploadVersion, setUploadVersion] = useState(0);

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Listener for results from background script (no change)
  useEffect(() => {
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
    if (!resumeText.trim()) {
      alert("Please select or paste resume content before analyzing.");
      return;
    }
    setIsLoading(true);
    setError('');
    setAnalysisResult(null);

    // This is now fully functional and sends the correct resume text
    chrome.runtime.sendMessage({
      type: "startAnalysis",
      resumeText: resumeText,
    });
  };

  // This function is passed to the Upload tab.
  // When an upload succeeds, it increments the version, forcing the Choose tab to re-render and refetch.
  const handleUploadSuccess = useCallback(() => {
    setUploadVersion(v => v + 1);
  }, []);

  const tabs = [
    { 
      label: "Paste Text", 
      content: <PasteTextTab resumeText={resumeText} setResumeText={setResumeText} /> 
    },
    { 
      label: "Upload Resume", 
      content: <UploadResumeTab onUploadSuccess={handleUploadSuccess} /> 
    },
    { 
      label: "Choose Resume", 
      // The key prop is essential here. When it changes, React remounts the component.
      content: <ChooseResumeTab key={uploadVersion} setSelectedResumeText={setResumeText} /> 
    },
  ];

  return (
    <main>
      <header>
        <h1>Resume Analyzer</h1>
      </header>
      
      <Tabs tabs={tabs} />

      <hr style={{ margin: '1rem 0' }} />

      <section className="analysis-section">
        <h3>Analyze Against Job Posting</h3>
        {/* And the new class for the button */}
        <button 
            onClick={handleAnalyzeClick} 
            disabled={isLoading || !resumeText.trim()}
            className="analyze-button"
        >
            {isLoading ? 'Analyzing...' : 'Analyze Current Page'}
        </button>
      </section>

      {isLoading && <p className="loading-message">Analyzing, please wait...</p>}
      {error && <p className="error-message">Error: {error}</p>}
      {analysisResult && <AnalysisDisplay result={analysisResult} />}
    </main>
  );
}

export default App;