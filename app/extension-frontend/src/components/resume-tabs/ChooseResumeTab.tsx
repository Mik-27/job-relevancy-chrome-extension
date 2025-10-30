import React, { useState, useEffect } from 'react';
import { listResumes, getResumeContent } from '../../api/resumeApi'; // API functions
import { Resume } from '../../types'; // We'll define this type

interface ChooseResumeTabProps {
  setSelectedResumeText: (text: string) => void;
}

export const ChooseResumeTab: React.FC<ChooseResumeTabProps> = ({ setSelectedResumeText }) => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchResumes = async () => {
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

  const handleSelectResume = async (resumeId: number) => {
    try {
        const content = await getResumeContent(resumeId);
        setSelectedResumeText(content);
        alert("Resume content loaded!");
    } catch (error) {
        console.error("Failed to load resume content", error);
        alert("Failed to load resume content: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  if (isLoading) return <p>Loading resumes...</p>;
  if (resumes.length === 0) return <p>No resumes uploaded yet. Please use the "Upload Resume" tab.</p>;

  return (
    <div className='choose-resume-container'>
        <p>Choose one of your previously uploaded resumes.</p>
        <ul>
        {resumes.map(resume => (
            <li key={resume.id}>
            <strong>{resume.company}</strong> - {resume.filename}
            <button onClick={() => handleSelectResume(resume.id)}>Select</button>
            </li>
        ))}
        </ul>
    </div>
  );
};