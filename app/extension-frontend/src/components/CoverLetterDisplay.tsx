import React, { useState } from 'react';
import { Spinner } from './ui/Spinner';
import { compileCoverLetterPdf } from '../api/resumeApi'; // Import the new API function

interface CoverLetterDisplayProps {
  initialText: string;
  onClose: () => void;
}

export const CoverLetterDisplay: React.FC<CoverLetterDisplayProps> = ({ initialText, onClose }) => {
  // NEW: State to hold the editable text
  const [editedText, setEditedText] = useState(initialText);
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState('');

  const handleDownload = async () => {
    setIsCompiling(true);
    setError('');
    try {
      const pdfBlob = await compileCoverLetterPdf(editedText);
      
      // Trigger download
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
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Edit and Download Cover Letter</h2>
        {/* Textarea is no longer readOnly */}
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