import React from 'react';
import './ResumeEditor.css'; // We'll use a shared CSS file for the editor

interface EditableFieldProps {
  value: string;
  onChange: (newValue: string) => void;
}

export const EditableField: React.FC<EditableFieldProps> = ({ value, onChange }) => {
  return (
    <textarea
      className="editable-textarea"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      // Auto-resize the textarea based on content
      rows={Math.max(2, Math.ceil(value.length / 60))}
    />
  );
};