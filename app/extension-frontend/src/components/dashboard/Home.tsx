import React from 'react';
import { FaFileUpload, FaList, FaPaste, FaMagic, FaEnvelope, FaFileSignature } from 'react-icons/fa';
import './Home.css';

interface HomeProps {
  onNavigate: (view: string) => void;
  userName: string;
}

export const Home: React.FC<HomeProps> = ({ onNavigate, userName }) => {
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Hello, {userName} 👋</h2>
        <p>What would you like to do today?</p>
      </div>

      <div className="action-grid">
        {/* --- Select RResume --- */}
        <div className="action-card primary" onClick={() => onNavigate('choose_resume')}>
          <div className="card-icon"><FaList /></div>
          <div className="card-title">Analyze Saved Resume</div>
          <div className="card-desc">Select from your uploaded resumes to analyze against this job.</div>
        </div>

        {/* --- Upload Resume --- */}
        <div className="action-card" onClick={() => onNavigate('upload_resume')}>
          <div className="card-icon"><FaFileUpload /></div>
          <div className="card-title">Upload New</div>
          <div className="card-desc">Upload a PDF resume</div>
        </div>

        {/* --- Paste Text --- */}
        <div className="action-card" onClick={() => onNavigate('paste_text')}>
          <div className="card-icon"><FaPaste /></div>
          <div className="card-title">Paste Text</div>
          <div className="card-desc">Manually enter details</div>
        </div>

        {/* --- Tailor from Master CV --- */}
        <div className="action-card" onClick={() => onNavigate('master_cv')}>
          <div className="card-icon"><FaMagic /></div>
          <div className="card-title">Auto-Tailor</div>
          <div className="card-desc">Generate from Master CV</div>
        </div>

        {/* --- Cover Letter Generation --- */}
        <div className="action-card" onClick={() => onNavigate('cover_letter_gen')}>
          <div className="card-icon"><FaFileSignature /></div>
          <div className="card-title">Cover Letter</div>
          <div className="card-desc">Generate from Master CV</div>
        </div>

        {/* --- Cold Email Workflow --- */}
        <div className="action-card" onClick={() => onNavigate('cold_email')}>
          <div className="card-icon"><FaEnvelope /></div>
          <div className="card-title">Cold Outreach</div>
          <div className="card-desc">Auto-draft emails via n8n</div>
        </div>

        {/* --- AUTOFILL --- */}
        <div className="action-card" onClick={() => onNavigate('autofill_action')}>
          <div className="card-icon"><FaMagic /></div>
          <div className="card-title">Autofill Application</div>
          <div className="card-desc">Fill form using your profile</div>
        </div>
      </div>
    </div>
  );
};