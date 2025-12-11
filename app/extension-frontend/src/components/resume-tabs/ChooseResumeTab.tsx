import React, { useState, useEffect } from 'react';
import { FaCalculator, FaTrash } from 'react-icons/fa';
import { listResumes, getResumeContent, deleteResume, getAnalysisScore } from '../../api/resumeApi';
import { ResumeWithScore } from '../../types';
import { Spinner } from '../ui/Spinner';
import './ChooseResumeTab.css';

interface ChooseResumeTabProps {
  setSelectedResumeText: (text: string) => void;
  jobDescriptionText: string;
}


export const ChooseResumeTab: React.FC<ChooseResumeTabProps> = ({ setSelectedResumeText, jobDescriptionText }) => {
  const [resumes, setResumes] = useState<ResumeWithScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);
  const [isScoring, setIsScoring] = useState(false);

  useEffect(() => {
    const fetchResumes = async () => {
      setIsLoading(true);
      try {
        const resumeList = await listResumes();
        setResumes(resumeList);
      } catch (error) {
        console.error("Failed to fetch resumes", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchResumes();
  }, []);

  // --- NEW: Manual Handler for Scoring ---
  const handleAutoScore = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent bubbling
    
    if (!jobDescriptionText) {
      alert("Job description not loaded yet. Please wait or reload.");
      return;
    }

    // 1. Identify resumes to score
    // (Resumes with autoscore=true, limit to top 3)
    const resumesToScore = resumes.filter(r => r.autoscore).slice(0, 3);

    if (resumesToScore.length === 0) {
      alert("No resumes have auto-scoring enabled.");
      return;
    }

    setIsScoring(true);

    // 2. Set their status to 'loading' immediately (Optimistic UI)
    setResumes(current => current.map(r => 
      resumesToScore.some(rts => rts.id === r.id) ? { ...r, score: 'loading' } : r
    ));

    try {
      // 3. Create promises for scoring
      const scorePromises = resumesToScore.map(async resume => {
        try {
          // We must fetch content first to score it
          const content = await getResumeContent(resume.id);
          const scoreResponse = await getAnalysisScore(content, jobDescriptionText);
          return { id: resume.id, score: scoreResponse.relevancyScore };
        } catch (error) {
          console.error(`Failed to get score for resume ${resume.id}:`, error);
          return { id: resume.id, score: undefined }; // Mark as failed/undefined
        }
      });

      // 4. Wait for results
      const results = await Promise.all(scorePromises);

      // 5. Update state with actual scores
      setResumes(current => current.map(r => {
        const result = results.find(res => res.id === r.id);
        // If we have a result, use it. Otherwise keep existing state (or reset to undefined)
        return result ? { ...r, score: result.score } : r;
      }));

    } catch (error) {
      console.error("Batch scoring failed", error);
    } finally {
      setIsScoring(false);
    }
  };

  // Helper function to determine the CSS class for the score ---
  const getScoreColorClass = (score: number | undefined): string => {
    if (score === undefined) return '';
    if (score > 80) return 'good';
    if (score > 60) return 'medium';
    return 'low';
  };

  // CHANGED: This handler is now for the entire list item
  const handleItemClick = async (resume: ResumeWithScore) => {
    // If the user is already selecting this resume, do nothing.
    if (selectedResumeId === resume.id) return;

    try {
      const content = await getResumeContent(resume.id);
      setSelectedResumeText(content);
      setSelectedResumeId(resume.id);
    } catch (error) {
      alert("Failed to load resume content.");
      console.error("Failed to load resume content", error);
    }
  };

  // CHANGED: This handler now stops the click from bubbling up to the parent item
  const handleDeleteClick = async (e: React.MouseEvent, resumeId: number) => {
    e.stopPropagation(); // VERY IMPORTANT: Prevents the handleItemClick from firing

    if (!window.confirm("Are you sure you want to delete this resume? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteResume(resumeId);
      setResumes(currentResumes => currentResumes.filter(r => r.id !== resumeId));
      if (selectedResumeId === resumeId) {
        setSelectedResumeId(null);
        setSelectedResumeText('');
      }
    } catch (error) {
      console.error("Failed to delete resume:", error);
      alert("Could not delete the resume. Please try again.");
    }
  };

  if (isLoading) return <p>Loading resumes...</p>;
  if (resumes.length === 0) return <p>No resumes uploaded yet. Please use the "Upload Resume" tab.</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <p style={{ margin: 0 }}>Select a resume to analyze:</p>
        
        {/* --- NEW: Scoring Button --- */}
        <button 
          className="autoscore-button"
          onClick={handleAutoScore}
          disabled={isScoring || !jobDescriptionText}
          title="Calculate relevancy for enabled resumes"
        >
          {isScoring ? <Spinner size="small" /> : <><FaCalculator style={{marginRight: '6px'}}/> AutoScore</>}
        </button>
      </div>
      <ul className="resume-list">
        {resumes.map(resume => (
          // CHANGED: onClick handler is now on the <li> element
          <li 
            key={resume.id} 
            className={`resume-list-item ${resume.id === selectedResumeId ? 'selected' : ''}`}
            onClick={() => handleItemClick(resume)}
          >
            <div className="resume-info">
              <strong>{resume.company}</strong>
              <span>{resume.filename}</span>
            </div>
            <div className="resume-actions">
              {/* --- NEW: Conditional rendering for the score/spinner --- */}
              {resume.score === 'loading' ? (
                <div className="score-spinner-container"><Spinner size="small" /></div>
              ) : (
                typeof resume.score === 'number' && <span className={`score-badge ${getScoreColorClass(resume.score)}`}>{resume.score}%</span>
              )}
              <button 
                className="delete-icon-button" 
                onClick={(e) => handleDeleteClick(e, resume.id)}
                aria-label={`Delete resume for ${resume.company}`}
              >
                <FaTrash />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};