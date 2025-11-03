import React, { useState, useEffect } from 'react';
// NEW: Import the trash icon from the react-icons library
import { FaTrash } from 'react-icons/fa';
import { listResumes, getResumeContent, deleteResume } from '../../api/resumeApi';
import { Resume } from '../../types';
import './ChooseResumeTab.css';

interface ChooseResumeTabProps {
  setSelectedResumeText: (text: string) => void;
}

export const ChooseResumeTab: React.FC<ChooseResumeTabProps> = ({ setSelectedResumeText }) => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);

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

  // CHANGED: This handler is now for the entire list item
  const handleItemClick = async (resume: Resume) => {
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
      <p>Choose one of your previously uploaded resumes.</p>
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
            {/* CHANGED: The text button is replaced with an icon button */}
            <button 
              className="delete-icon-button" 
              onClick={(e) => handleDeleteClick(e, resume.id)}
              aria-label={`Delete resume for ${resume.company}`} // Good for accessibility
            >
              <FaTrash />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};