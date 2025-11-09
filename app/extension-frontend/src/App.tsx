import { useState, useEffect, useCallback } from 'react';
import './App.css';
import { AnalysisResult } from './types';
import { Tabs } from './components/ui/Tabs';
import { PasteTextTab } from './components/resume-tabs/PasteTextTab';
import { UploadResumeTab } from './components/resume-tabs/UploadResumeTab';
import { ChooseResumeTab } from './components/resume-tabs/ChooseResumeTab';
import { AnalysisDisplay } from './components/AnalysisDisplay';
import { getAnalysisScore, getAnalysisSuggestions } from './api/resumeApi';
import { Spinner } from './components/ui/Spinner';


// Define the possible statuses for our application workflow
type AppStatus = 'idle' | 'scraping' | 'analyzing_score' | 'analyzing_suggestions' | 'generating_content' | 'complete' | 'error';


function App() {
  const [resumeText, setResumeText] = useState('');
  const [jobDescriptionText, setJobDescriptionText] = useState('');
  const [uploadVersion, setUploadVersion] = useState(0);

  const [analysisResult, setAnalysisResult] = useState<Partial<AnalysisResult> | null>(null);
  const [status, setStatus] = useState<AppStatus>('idle');
  const [error, setError] = useState('');


  useEffect(() => {
    // Set a status to prevent other actions while scraping
    setStatus('scraping');
    chrome.runtime.sendMessage({ type: "getJobDescription" }, (response) => {
      if (chrome.runtime.lastError || response.error) {
        // Don't show an error, just fail silently. The user can still analyze manually.
        console.error("Initial scrape failed:", chrome.runtime.lastError?.message || response.error);
        setJobDescriptionText(''); // Ensure it's empty on failure
      } else if (response && response.text) {
        setJobDescriptionText(response.text);
      }
      setStatus('idle'); // Return to idle after initial scrape attempt
    });
  }, []);


  const handleAnalyzeClick = async () => {
    if (!resumeText.trim()) {
      alert("Please select or paste resume content before analyzing.");
      return;
    }
    setStatus('scraping');
    setError('');
    setAnalysisResult(null);

    try {
      // We need the job description first, which still comes from the background script
      const jobDescription = await new Promise<string>((resolve, reject) => {
        chrome.runtime.sendMessage({ type: "getJobDescription" }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.text) {
            resolve(response.text);
          } else {
            reject(new Error("Could not scrape job description."));
          }
        });
      });
      setJobDescriptionText(jobDescription);

      // Fetch the score
      setStatus('analyzing_score');
      const scoreResponse = await getAnalysisScore(resumeText, jobDescription);
      setAnalysisResult(prev => ({ ...prev, relevancyScore: scoreResponse.relevancyScore }));

      // Fetch the suggestions
      setStatus('analyzing_suggestions');
      const suggestionsResponse = await getAnalysisSuggestions(resumeText, jobDescription);
      setAnalysisResult(prev => ({ ...prev, suggestions: suggestionsResponse.suggestions }));

      setStatus('complete');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during analysis.";
      setError(errorMessage);
      setStatus('error');
      setAnalysisResult(null); // Clear partial results on error
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
      content: <ChooseResumeTab key={uploadVersion} setSelectedResumeText={setResumeText} jobDescriptionText={jobDescriptionText} /> 
    },
  ];

  const isProcessingAnalysis = status === 'scraping' || status === 'analyzing_score' || status === 'analyzing_suggestions';

  return (
    <main>
      <header>
        <h1>Resume Analyzer</h1>
      </header>
      
      <Tabs tabs={tabs} />

      <hr style={{ margin: '1rem 0' }} />

      <section className="analysis-section">
        <h3>Analyze Against Job Posting</h3>
        <button 
          onClick={handleAnalyzeClick} 
          disabled={isProcessingAnalysis || !resumeText.trim()} 
          className="analyze-button"
        >
          {isProcessingAnalysis ? 'Analyzing...' : 'Analyze Current Page'}
        </button>
      </section>

      {status === 'scraping' && <Spinner />}
      
      {status === 'error' && <p className="error-message">Error: {error}</p>}
      
      {/* Render the AnalysisDisplay as soon as analysis starts (after scraping) */}
      {isProcessingAnalysis && analysisResult && (
        <AnalysisDisplay 
          result={analysisResult}
          initialResumeText={resumeText}
          initialJobDescriptionText={jobDescriptionText}
        />
      )}
      
      {/* Also render it when the process is complete */}
      {status === 'complete' && analysisResult && (
        <AnalysisDisplay 
          result={analysisResult as AnalysisResult} // We can assert the full type here
          initialResumeText={resumeText}
          initialJobDescriptionText={jobDescriptionText}
        />
      )}
    </main>
  );
}

export default App;