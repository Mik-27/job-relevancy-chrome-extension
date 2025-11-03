import { useState, useEffect, useCallback } from 'react';
import './App.css';
import { AnalysisResult, ChromeMessage } from './types';
import { Tabs } from './components/ui/Tabs';
import { PasteTextTab } from './components/resume-tabs/PasteTextTab';
import { UploadResumeTab } from './components/resume-tabs/UploadResumeTab';
import { ChooseResumeTab } from './components/resume-tabs/ChooseResumeTab';
import { AnalysisDisplay } from './components/AnalysisDisplay';
import { tailorResume } from './api/resumeApi';

function App() {
  // This state holds the final resume content ready for analysis
  const [resumeText, setResumeText] = useState('');
  const [jobDescriptionText, setJobDescriptionText] = useState(''); // NEW: State to hold the scraped JD
  const [isTailoring, setIsTailoring] = useState(false);
  
  // This state is just to trigger a refresh of the "ChooseResume" tab after an upload
  const [uploadVersion, setUploadVersion] = useState(0);

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Listener for results from background script (no change)
  useEffect(() => {
    const messageListener = (message: ChromeMessage) => {
      if (message.type === "analysisComplete") {
        setAnalysisResult(message.data.analysis);
        setJobDescriptionText(message.data.jobDescription);
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
    setJobDescriptionText('');

    // This is now fully functional and sends the correct resume text
    chrome.runtime.sendMessage({
      type: "startAnalysis",
      resumeText: resumeText,
    });
  };


  // NEW: Handler for the "Tailor Resume" button click
  const handleTailorClick = async () => {
    if (!resumeText || !jobDescriptionText) {
      setError("Cannot tailor resume. Missing original resume or job description.");
      return;
    }
    setIsTailoring(true);
    setError('');
    try {
      const pdfBlob = await tailorResume(resumeText, jobDescriptionText);
      
      // Create a URL for the blob and trigger download
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Tailored_Resume.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred during tailoring.");
    } finally {
      setIsTailoring(false);
    }
  };


  // This function accepts the parsed text
  const handleUploadSuccess = useCallback((parsedText: string) => {
    setResumeText(parsedText);
    setUploadVersion(v => v + 1);
    alert("Resume uploaded and content is ready for analysis!");
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
      {/* Pass the new state and handler to the display component */}
      {analysisResult && (
        <AnalysisDisplay 
          result={analysisResult} 
          isTailoring={isTailoring}
          onTailorClick={handleTailorClick}
        />
      )}
    </main>
  );
}

export default App;