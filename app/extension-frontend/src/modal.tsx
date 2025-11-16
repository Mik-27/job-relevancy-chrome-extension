import React from 'react';
import ReactDOM from 'react-dom/client';
import { CoverLetterDisplay } from './components/CoverLetterDisplay';
import './App.css'; // Reuse main styles

// This function will be called by our content script
export function injectCoverLetterModal(initialText: string) {
  // Create a div that will serve as the root for our React app
  const modalRoot = document.createElement('div');
  modalRoot.id = 'cover-letter-modal-root';
  document.body.appendChild(modalRoot);

  const root = ReactDOM.createRoot(modalRoot);
  
  const handleClose = () => {
    root.unmount(); // Unmount the React component
    document.body.removeChild(modalRoot); // Remove the div from the DOM
  };

  root.render(
    <React.StrictMode>
      <CoverLetterDisplay initialText={initialText} onClose={handleClose} />
    </React.StrictMode>
  );
}