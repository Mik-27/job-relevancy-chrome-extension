import React, { useState } from 'react';
import { uploadResume } from '../../api/resumeApi';

interface UploadResumeTabProps {
  onUploadSuccess: (parsedText: string) => void;
}

export const UploadResumeTab: React.FC<UploadResumeTabProps> = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFile(event.target.files[0]);
      setError('');
      setSuccessMessage('');
    }
  };

  const handleUploadClick = async () => {
    // Guard clause: ensure a file is selected
    if (!selectedFile) {
        setError("Please select a file to upload.");
        return;
    }

    setIsUploading(true);
    setError('');
    setSuccessMessage('');
    try {
      const result = await uploadResume(selectedFile, companyName || "General");
      setSuccessMessage(`✅ Resume for ${companyName || "General"} uploaded successfully!`);
      onUploadSuccess(result.content); // Notify parent to refetch the list of resumes
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="upload-form-container">
      <p>Upload your resume. Optionally, add the company name to keep it organized.</p>
      
      <div className="form-group">
        <label className='company-name' htmlFor="company-name">Company Name (Optional): </label>
        <input
          id="company-name"
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="e.g., Google, Microsoft..."
        />
      </div>

      <div className="form-group">
        <label className='file-upload' htmlFor="file-upload">Resume PDF</label>
        <input id="file-upload" type="file" accept=".pdf" onChange={handleFileChange} />
      </div>

      <button onClick={handleUploadClick} disabled={!selectedFile || isUploading} className="upload-button">
        {isUploading ? 'Uploading...' : 'Upload'}
      </button>

      {error && <p className="error-message">{error}</p>}
      {successMessage && <p className="success-message">{successMessage}</p>}
    </div>
  );
};