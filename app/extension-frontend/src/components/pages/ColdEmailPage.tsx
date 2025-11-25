import React, { useState } from 'react';
import { triggerColdOutreach } from '../../api/resumeApi';
import { Contact } from '../../types';
import { Spinner } from '../ui/Spinner';
import { FaPlus, FaTrash } from 'react-icons/fa';
import './ColdEmailPage.css'; // We'll create this css

interface ColdEmailPageProps {
  onBack: () => void;
}

export const ColdEmailPage: React.FC<ColdEmailPageProps> = ({ onBack }) => {
  // Initialize with one empty row
  const [contacts, setContacts] = useState<Contact[]>([{ name: '', email: '', company: '' }]);
  const [isSending, setIsSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

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
      const newContacts = contacts.filter((_, i) => i !== index);
      setContacts(newContacts);
    }
  };

  const handleSubmit = async () => {
    // Basic validation
    const validContacts = contacts.filter(c => c.name && c.email && c.company);
    if (validContacts.length === 0) {
      setError("Please add at least one complete contact.");
      return;
    }

    setIsSending(true);
    setError('');
    try {
      await triggerColdOutreach(validContacts);
      setSuccess(true);
      setContacts([{ name: '', email: '', company: '' }]); // Reset form
    } catch (err) {
      setError(err instanceof Error ? err.message : "Workflow failed.");
    } finally {
      setIsSending(false);
    }
  };

  if (success) {
    return (
      <div className="page-content" style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚀</div>
        <h3>Workflow Started!</h3>
        <p style={{ color: '#a0a0a0' }}>
          Your contacts have been sent to the AI agent. Check your email drafts folder in a few minutes.
        </p>
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
      <p style={{ color: '#a0a0a0', fontSize: '0.9rem', marginBottom: '1rem' }}>
        Enter contacts below. Our AI agent will research them and draft personalized emails for you.
      </p>

      <div className="contacts-form">
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

      {error && <p className="error-message">{error}</p>}

      <div style={{ marginTop: '2rem' }}>
        <button 
          className="analyze-button" 
          onClick={handleSubmit}
          disabled={isSending}
        >
          {isSending ? <Spinner size="small" /> : 'Start AI Agent'}
        </button>
      </div>
    </div>
  );
};