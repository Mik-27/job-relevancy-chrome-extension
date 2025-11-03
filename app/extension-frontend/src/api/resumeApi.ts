import { Resume, UploadResponse } from "../types";

const API_BASE_URL = "http://127.0.0.1:8000/api";

export const uploadResume = async (file: File, company: string): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("company", company);

  const response = await fetch(`${API_BASE_URL}/resumes/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "File upload failed");
  }

  return response.json();
};


export const listResumes = async (): Promise<Resume[]> => {
  const response = await fetch(`${API_BASE_URL}/resumes/`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error("Failed to fetch resumes");
  }

  // The backend returns the list directly, so we can just return the JSON
  return response.json();
};


export const getResumeContent = async (resumeId: number): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/resumes/${resumeId}/content`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error("Failed to fetch resume content");
  }

  // The backend returns the raw text, so we use .text()
  return response.text();
};


export const tailorResume = async (resumeText: string, jobDescriptionText: string): Promise<Blob> => {
  const response = await fetch(`${API_BASE_URL}/tailor/`, { // Note the trailing slash
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ resumeText, jobDescriptionText }),
  });

  if (!response.ok) {
    // Try to get a more specific error message from the backend
    const errorData = await response.json().catch(() => ({ detail: "Failed to generate PDF." }));
    throw new Error(errorData.detail || "Failed to generate tailored resume.");
  }

  // The response is the raw PDF file, so we get it as a blob
  return response.blob();
};