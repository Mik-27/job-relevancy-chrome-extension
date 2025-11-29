import React from 'react';
import { Spinner } from '../ui/Spinner';
import { FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

interface AutofillProgressPageProps {
  status: string;
  count: number | null; // Number of fields filled (null if in progress)
  error: string;
  onBack: () => void;
}

export const AutofillProgressPage: React.FC<AutofillProgressPageProps> = ({ 
  status, 
  count, 
  error, 
  onBack 
}) => {
  
  // 1. Error State
  if (error) {
    return (
      <div className="page-content" style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem', color: '#ff4d4d' }}>
          <FaExclamationCircle />
        </div>
        <h3>Autofill Failed</h3>
        <p className="error-message">{error}</p>
        <button className="analyze-button" onClick={onBack}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  // 2. Success State (Count is present)
  if (count !== null) {
    return (
      <div className="page-content" style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem', color: '#64ffda' }}>
          <FaCheckCircle />
        </div>
        <h3>Success!</h3>
        <p style={{ color: '#f0f0f0', fontSize: '1.1rem', margin: '1rem 0' }}>
          AI Agent filled <strong>{count}</strong> questions.
        </p>
        <p style={{ color: '#a0a0a0', fontSize: '0.9rem' }}>
          Review the answers on the page (highlighted in green) before submitting.
        </p>
        <button className="analyze-button" onClick={onBack}>
          Done
        </button>
      </div>
    );
  }

  // 3. Loading State (Default)
  let message = "Initializing...";
  if (status === 'scraping') message = "Scanning page for questions...";
  if (status === 'analyzing_suggestions') message = "AI is drafting responses...";
  if (status === 'filling') message = "Applying answers to form...";

  return (
    <div className="page-content" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100%',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <Spinner />
      <h3 style={{ marginTop: '1.5rem', color: '#f0f0f0' }}>{message}</h3>
      <p style={{ color: '#a0a0a0', fontSize: '0.9rem' }}>Please do not close the overlay.</p>
    </div>
  );
};