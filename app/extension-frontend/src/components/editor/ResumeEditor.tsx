import React, { useState } from 'react';
import { TailoredContent } from '../../types';
import { EditableField } from './EditableField';
import { compilePdf } from '../../api/resumeApi';
import { Spinner } from '../ui/Spinner';
import './ResumeEditor.css';

interface ResumeEditorProps {
  content: TailoredContent;
}

export const ResumeEditor: React.FC<ResumeEditorProps> = ({ content }) => {
  const [editedContent, setEditedContent] = useState<TailoredContent>(content);
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState('');

  const handleExperienceChange = (jobIndex: number, pointIndex: number, newValue: string) => {
    const newExperience = [...editedContent.experience];
    newExperience[jobIndex].points[pointIndex] = newValue;
    setEditedContent({ ...editedContent, experience: newExperience });
  };

  const handleCompileClick = async () => {
    setIsCompiling(true);
    setError('');
    try {
      const pdfBlob = await compilePdf(editedContent);
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Tailored_Resume.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compilation failed.");
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="editor-container">
      <div className="editor-section">
        <h4>Summary (Objective)</h4>
        <EditableField
          value={editedContent.summary}
          onChange={(newValue) => setEditedContent({ ...editedContent, summary: newValue })}
        />
      </div>

      <div className="editor-section">
        <h4>Experience</h4>
        {editedContent.experience.map((job, jobIndex) => (
          <div key={jobIndex} className="editor-job">
            <div className="editor-job-header">{job.company} - {job.title}</div>
            {job.points.map((point, pointIndex) => (
              <EditableField
                key={pointIndex}
                value={point}
                onChange={(newValue) => handleExperienceChange(jobIndex, pointIndex, newValue)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* You can add similar editable sections for Projects if desired */}

      <div className="compile-button-container">
        <button className="analyze-button" onClick={handleCompileClick} disabled={isCompiling}>
          {isCompiling ? <Spinner size="small" /> : 'Compile & Download PDF'}
        </button>
        {isCompiling && <p className="loading-message sub-text">This may take a moment...</p>}
        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
};