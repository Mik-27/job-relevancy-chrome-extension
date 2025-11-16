import React, { useState } from 'react';
import { Spinner } from './ui/Spinner';
import { compileCoverLetterPdf } from '../api/resumeApi';
import './CoverLetterDisplay.css'; // Import the new CSS

interface CoverLetterDisplayProps {
  initialText: string;
  onClose: () => void;
}

export const CoverLetterDisplay: React.FC<CoverLetterDisplayProps> = ({ initialText, onClose }) => {
  const [editedText, setEditedText] = useState(initialText);
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState('');

  const handleDownload = async () => {
    setIsCompiling(true);
    setError('');
    try {
      const pdfBlob = await compileCoverLetterPdf(editedText);
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Cover_Letter.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download.");
    } finally {
      setIsCompiling(false);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Edit Cover Letter</h2>
        <textarea 
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          className="cover-letter-textarea" 
        />
        <div className="modal-actions">
          {error && <p className="error-message" style={{ marginRight: 'auto' }}>{error}</p>}
          <button onClick={onClose} className="secondary-button">Close</button>
          <button onClick={handleDownload} className="analyze-button" disabled={isCompiling}>
            {isCompiling ? <Spinner size="small" /> : 'Download as PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};