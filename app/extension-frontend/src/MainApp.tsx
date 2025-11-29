import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import type { Session } from '@supabase/supabase-js';
import { AnalysisResult, ApplyAutofillResponse, RelayApplyMessage, RelayScanMessage, ScanPageResponse, TailoredResumeSchema } from './types';
import { Home } from './components/dashboard/Home';
// We reuse the existing tab components as "Pages" for now
import { PasteResumePage } from './components/pages/PasteResumePage';
import { MasterCVPage } from './components/pages/MasterCVPage';
import { UploadResumeTab } from './components/resume-tabs/UploadResumeTab';
import { ChooseResumeTab } from './components/resume-tabs/ChooseResumeTab';
import { ColdEmailPage } from './components/pages/ColdEmailPage';
import { AnalysisDisplay } from './components/AnalysisDisplay';
import { Profile } from './components/profile/Profile';
import { generateAutofillResponses, getAnalysisScore, getAnalysisSuggestions } from './api/resumeApi';
import { Spinner } from './components/ui/Spinner';
import { supabase } from './lib/supabaseClient';
import { ResumeEditor } from './components/editor/ResumeEditor';
import { AutofillProgressPage } from './components/pages/AutofillProgressPage';


// NEW: Expanded View Types
type AppView = 'home' | 'profile' | 'choose_resume' | 'upload_resume' | 'paste_text' | 'master_cv' | 'analysis_results' | 'editor' | 'cold_email' | 'autofill_progress';

type AppStatus = 'idle' | 'scraping' | 'analyzing_score' | 'analyzing_suggestions' | 'autofilling' | 'generating_content' | 'complete' | 'error';

export const MainApp: React.FC<{ session: Session }> = ({ session }) => {
  const [resumeText, setResumeText] = useState('');
  const [jobDescriptionText, setJobDescriptionText] = useState('');
  
  // We keep uploadVersion to trigger refreshes of the list
  const [uploadVersion, setUploadVersion] = useState(0);

  // UI State
  const [view, setView] = useState<AppView>('home');
  const [previousView, setPreviousView] = useState<AppView>('home');

  const [analysisResult, setAnalysisResult] = useState<Partial<AnalysisResult> | null>(null);
  const [tailoredContent, setTailoredContent] = useState<TailoredResumeSchema | null>(null);
  const [autofillCount, setAutofillCount] = useState<number | null>(null);

  const [status, setStatus] = useState<AppStatus>('idle');
  const [error, setError] = useState('');

  // Initial Scrape Logic (Unchanged)
  useEffect(() => {
    setStatus('scraping');
    const timer = setTimeout(() => {
      const pageText = document.body.innerText;
      if (pageText && pageText.length > 50) {
        setJobDescriptionText(pageText);
        setStatus('idle');
      } else {
        console.log("Waiting for content...");
        setStatus('idle');
      }
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleAutofillClick = async () => {
    console.log("Starting Autofill...");
    setView('autofill_progress');
    setAutofillCount(null);
    setStatus('scraping'); // Show generic spinner or create a new status 'autofilling'
    setError('');

    try {
      if (!jobDescriptionText) {
        throw new Error("Job description not loaded.");
      }

      // --- CHANGED: Send message to Background Relay instead of chrome.tabs ---
      // We wrap this in a Promise to handle the callback style of runtime.sendMessage
      const scanResponse = await new Promise<ScanPageResponse>((resolve, reject) => {
        const message: RelayScanMessage = { type: "RELAY_SCAN_PAGE" };

        chrome.runtime.sendMessage(message, (response: ScanPageResponse) => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message));
          }
          // Handle explicit errors returned from background/content script
          if (response && response.error) {
            return reject(new Error(response.error));
          }
          resolve(response);
        });
      });
      
      console.log("Scan response:", scanResponse);

      if (!scanResponse || !scanResponse.fields || scanResponse.fields.length === 0) {
        throw new Error("No fillable personal response questions found.");
      }

      setStatus('analyzing_suggestions');

      // 3. Call Backend (Unchanged)
      const { mappings } = await generateAutofillResponses(scanResponse.fields, jobDescriptionText);

      setStatus('autofilling');
      // 4. Apply Changes (Via Relay)
      // --- CHANGED: Send message to Background Relay ---
      const fillResponse = await new Promise<ApplyAutofillResponse>((resolve, reject) => {
        const message: RelayApplyMessage = { 
          type: "RELAY_APPLY_AUTOFILL", 
          mappings: mappings 
        };
        
        chrome.runtime.sendMessage(message, (response: ApplyAutofillResponse) => {
           if (chrome.runtime.lastError) {
             return reject(new Error(chrome.runtime.lastError.message));
           }
           if (response && response.error) {
             return reject(new Error(response.error));
           }
           resolve(response);
        });
      });
      
    //   alert(`Successfully autofilled ${fillResponse.count} fields!`);
      setStatus('complete');
      setAutofillCount(fillResponse.count);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Autofill failed.");
      setStatus('error');
    }
  };

  // --- Navigation Helpers ---
  const goHome = () => {
    setError('');
    setStatus('idle');
    setView('home');
  };

  const handleProfileClick = () => setView('profile');

  // --- 2. Shared Handlers ---

  // Called when Master CV flow finishes generating content
  const handleMasterCVSuccess = (content: TailoredResumeSchema) => {
    setTailoredContent(content); 
    setPreviousView('master_cv'); // Remember where we came from
    setView('editor'); 
  };

  // Called when AnalysisDisplay finishes generating content
  const handleStandardTailoringSuccess = (content: TailoredResumeSchema) => {
    setTailoredContent(content);
    setPreviousView('analysis_results'); // Remember where we came from
    setView('editor');
  };

  // Core Analysis Logic
  const startAnalysis = async (textToAnalyze: string) => {
    if (!textToAnalyze.trim()) {
      alert("Resume content is empty.");
      return;
    }
    
    // Switch to results view immediately
    setView('analysis_results'); 
    setStatus('analyzing_score');
    setError('');
    setAnalysisResult({});

    try {
      // Re-verify JD just in case
      let jd = jobDescriptionText;
      if (!jd) {
         jd = document.body.innerText;
         setJobDescriptionText(jd);
      }

      // Parallel fetching
      const [scoreResponse, suggestionsResponse] = await Promise.all([
        getAnalysisScore(textToAnalyze, jd),
        getAnalysisSuggestions(textToAnalyze, jd)
      ]);

      setAnalysisResult({
        relevancyScore: scoreResponse.relevancyScore,
        suggestions: suggestionsResponse.suggestions
      });
      setStatus('complete');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMessage);
      setStatus('error');
    }
  };

  // --- Logic Adapters ---

  // When a resume is uploaded successfully
  const handleUploadSuccess = useCallback((parsedText: string) => {
    setResumeText(parsedText);
    setUploadVersion(v => v + 1);
    // After upload, ask user if they want to analyze immediately
    if(window.confirm("Upload successful! Analyze this resume now?")) {
        startAnalysis(parsedText);
    } else {
        goHome();
    }
  }, []);

  // When a resume is selected from the list
  const handleResumeSelection = (text: string) => {
    setResumeText(text);
    startAnalysis(text); // Auto-start analysis on selection
  };

  // --- NEW: Navigation Interceptor ---
  // This function decides if we switch views OR run an action
  const handleNavigation = (destination: string) => {
    console.log(`Navigating to: ${destination}`);
    if (destination === 'autofill_action') {
      handleAutofillClick();
    } else {
      // It's a view change
      setView(destination as AppView);
    }
  };

  // --- Render Logic based on View ---
  const renderContent = () => {
    switch (view) {
      case 'home':
        return <Home onNavigate={handleNavigation} userName={session.user.user_metadata.first_name || 'User'} />;
      
      case 'profile':
        return <Profile onBack={goHome} />;

      case 'upload_resume':
        return (
          <div className="page-container">
            <button onClick={goHome} className="back-link">&larr;</button>
            <h2>Upload Resume</h2>
            <UploadResumeTab onUploadSuccess={handleUploadSuccess} />
          </div>
        );

      case 'choose_resume':
        return (
          <div className="page-container">
            <button onClick={goHome} className="back-link">&larr;</button>
            <ChooseResumeTab 
              key={uploadVersion} 
              // When user clicks "Select", we now trigger analysis immediately
              setSelectedResumeText={handleResumeSelection} 
              jobDescriptionText={jobDescriptionText} 
            />
          </div>
        );

      case 'paste_text':
        return (
          <div className="page-container">
            <button onClick={goHome} className="back-link">&larr;</button>
            <h2>Paste Resume</h2>
            {/* Use new component */}
            <PasteResumePage 
              onAnalyze={(text) => {
                setResumeText(text); // Update state
                startAnalysis(text); // Trigger analysis
              }}
              isAnalyzing={status.startsWith('analyzing')}
            />
          </div>
        );

      case 'master_cv':
        return (
            <div className="page-container">
              <button onClick={goHome} className="back-link">&larr;</button>
              <h2>Auto-Tailor from CV</h2>
              <MasterCVPage 
                jobDescription={jobDescriptionText}
                onGenerationSuccess={handleMasterCVSuccess}
                onNavigateProfile={() => setView('profile')}
              />
            </div>
        );

      case 'analysis_results':
        return (
          <div className="page-container">
            <button onClick={goHome} className="back-link">&larr;</button>
            
            {status === 'error' && <p className="error-message">{error}</p>}
            
            {/* Loading State */}
            {(status.startsWith('analyzing') || status === 'scraping') && (
               <div style={{textAlign: 'center', padding: '2rem'}}>
                  <Spinner />
                  <p>Analyzing Resume...</p>
               </div>
            )}

            {/* Results */}
            {analysisResult && (status === 'complete' || status.startsWith('analyzing')) && (
              <AnalysisDisplay 
                result={analysisResult}
                initialResumeText={resumeText}
                initialJobDescriptionText={jobDescriptionText}
                // Pass the handler to switch to editor view
                onTailoringSuccess={handleStandardTailoringSuccess}
              />
            )}
          </div>
        );

      case 'editor':
        return (
          <div className="page-container">
             {/* Smart Back Button: Goes back to wherever we came from */}
             <button onClick={() => setView(previousView)} className="back-link">&larr;</button>
             <h2>Review & Compile</h2>
             {tailoredContent && (
               <ResumeEditor 
                 content={tailoredContent} 
               />
             )}
          </div>
        );

      case 'cold_email':
        return <ColdEmailPage onBack={goHome} />;

      // NEW: Case for the progress page
      case 'autofill_progress':
        return (
          <AutofillProgressPage 
            status={status}
            count={autofillCount}
            error={error}
            onBack={goHome}
          />
        );

      default:
        return <div>Page not found</div>;
    }
  };

  return (
    <main>
      {/* Shared Header */}
      <div className="top-bar">
        <button 
          onClick={() => document.getElementById('resume-analyzer-overlay-root')?.remove()} 
          className="close-button"
          style={{ border: 'none', fontSize: '1.2rem', padding: '0 0.5rem', marginLeft: 'auto', background: 'transparent', color: '#fff', cursor: 'pointer' }}
        >
          &times;
        </button>
      </div>
      
      {view !== 'profile' && (
        <header className="app-header">
            <div className="user-info">
            <p>Welcome,</p>
            <span onClick={handleProfileClick} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                {session.user.user_metadata.first_name || session.user.email}
            </span>
            </div>
            <button onClick={handleLogout} className="logout-button">Sign Out</button>
        </header>
      )}

      {renderContent()}
    </main>
  );
};