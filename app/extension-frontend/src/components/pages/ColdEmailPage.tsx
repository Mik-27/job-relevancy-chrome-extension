import React, { useState } from 'react';
import { triggerColdOutreach } from '../../api/resumeApi';
import { Spinner } from '../ui/Spinner';
import { FaPlus, FaTrash, FaFileUpload, FaKeyboard } from 'react-icons/fa';
import './ColdEmailPage.css';

interface ColdEmailPageProps {
  onBack: () => void;
}

type InputMode = 'manual' | 'upload';

export interface Contact {
  name: string;
  email: string;
  company: string;
}

export const ColdEmailPage: React.FC<ColdEmailPageProps> = ({ onBack }) => {
  const [mode, setMode] = useState<InputMode>('manual');
  
  // Manual Mode State
  const [contacts, setContacts] = useState<Contact[]>([{ name: '', email: '', company: '' }]);
  
  // Upload Mode State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isSending, setIsSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // --- Handlers for Manual Mode ---
  const handleInputChange = (index: number, field: keyof Contact, value: string) => {
    const newContacts = [...contacts];
    newContacts[index][field] = value;
    setContacts(newContacts);
  };

  const addRow = () => {
    setContacts([...contacts, { name: '', email: '', company: '' }]);
  };

  const removeRow = (index: number) => {
    if (contacts.length > 1) {
      setContacts(contacts.filter((_, i) => i !== index));
    }
  };

  // --- Handler for File Mode ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError('');
    }
  };

  // --- Main Submit ---
  const handleSubmit = async () => {
    setIsSending(true);
    setError('');

    try {
      if (mode === 'manual') {
        const validContacts = contacts.filter(c => c.name && c.email && c.company);
        if (validContacts.length === 0) throw new Error("Please add at least one complete contact.");
        
        await triggerColdOutreach({ contacts: validContacts });
        setContacts([{ name: '', email: '', company: '' }]); // Reset
      } else {
        if (!selectedFile) throw new Error("Please select a file.");
        
        await triggerColdOutreach({ file: selectedFile });
        setSelectedFile(null); // Reset
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start workflow.");
    } finally {
      setIsSending(false);
    }
  };

  if (success) {
    return (
      <div className="page-content success-view">
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚀</div>
        <h3>Workflow Started!</h3>
        <p>The AI Agent is now researching and drafting emails.</p>
        <button className="analyze-button" onClick={() => { setSuccess(false); onBack(); }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="page-container">
      <button onClick={onBack} className="back-link">&larr; Back to Dashboard</button>
      <h2>Cold Email Outreach</h2>

      {/* --- Toggle Switch --- */}
      <div className="mode-toggle">
        <button 
          className={`toggle-btn ${mode === 'manual' ? 'active' : ''}`}
          onClick={() => setMode('manual')}
        >
          <FaKeyboard /> Manual Entry
        </button>
        <button 
          className={`toggle-btn ${mode === 'upload' ? 'active' : ''}`}
          onClick={() => setMode('upload')}
        >
          <FaFileUpload /> Upload Excel
        </button>
      </div>

      {mode === 'manual' ? (
        <div className="contacts-form">
          <p className="helper-text">Enter contacts individually.</p>
          {contacts.map((contact, index) => (
            <div key={index} className="contact-row">
              <input 
                placeholder="Name" 
                value={contact.name} 
                onChange={(e) => handleInputChange(index, 'name', e.target.value)} 
              />
              <input 
                placeholder="Company" 
                value={contact.company} 
                onChange={(e) => handleInputChange(index, 'company', e.target.value)} 
              />
              <input 
                placeholder="Email" 
                value={contact.email} 
                onChange={(e) => handleInputChange(index, 'email', e.target.value)} 
              />
              {contacts.length > 1 && (
                <button className="remove-row-btn" onClick={() => removeRow(index)}>
                  <FaTrash />
                </button>
              )}
            </div>
          ))}
          <button className="add-row-btn" onClick={addRow}>
            <FaPlus /> Add Contact
          </button>
        </div>
      ) : (
        <div className="upload-section">
          <p className="helper-text">
            Upload an Excel (.xlsx) or CSV file. <br/>
            <strong>Required columns:</strong> Name, Email, Company.
          </p>
          <div className="file-drop-area">
            <input type="file" accept=".xlsx, .csv" onChange={handleFileChange} />
          </div>
          {selectedFile && <p className="file-name">Selected: {selectedFile.name}</p>}
        </div>
      )}

      {error && <p className="error-message">{error}</p>}

      <div style={{ marginTop: '2rem' }}>
        <button 
          className="analyze-button" 
          onClick={handleSubmit}
          disabled={isSending || (mode === 'upload' && !selectedFile)}
        >
          {isSending ? <Spinner size="small" /> : 'Start AI Agent'}
        </button>
      </div>
    </div>
  );
};