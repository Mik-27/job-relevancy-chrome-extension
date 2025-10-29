import React, { useState } from 'react';
import { uploadResume } from '../api/resumeApi';

interface ResumeUploaderProps {
  onUploadSuccess: (fileUrl: string) => void;
}

export const ResumeUploader: React.FC<ResumeUploaderProps> = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFile(event.target.files[0]);
      setError('');
    }
  };

  const handleUploadClick = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError('');
    try {
      const result = await uploadResume(selectedFile);
      onUploadSuccess(result.file_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <input type="file" accept=".pdf" onChange={handleFileChange} />
      <button onClick={handleUploadClick} disabled={!selectedFile || isUploading}>
        {isUploading ? 'Uploading...' : 'Upload Resume'}
      </button>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
};