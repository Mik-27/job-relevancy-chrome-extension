import { supabase } from '../lib/supabaseClient';
import { Resume, UploadResponse, ScoreResponse, SuggestionsResponse, TailoredResumeSchema, TailoredContent } from "../types";

const API_BASE_URL = "http://127.0.0.1:8000/api";


// --- NEW: Authenticated Fetch Helper ---
// This is the core of our authenticated API client.
const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  // 1. Get the current session from Supabase.
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("User is not authenticated. Please log in.");
  }

  // 2. Prepare the headers.
  const headers = new Headers(options.headers || {});
  // 3. Attach the JWT as a Bearer token.
  headers.set('Authorization', `Bearer ${session.access_token}`);

  // 4. For FormData, we let the browser set the Content-Type. For JSON, we set it.
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }  

  // 5. Make the fetch call with the authenticated headers.
  const response = await fetch(url, {
    ...options,
    headers,
  });

  return response;
};


export const uploadResume = async (file: File, company: string, autoscore: boolean): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("company", company);
  formData.append("autoscore", String(autoscore));

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("User is not authenticated.");
  }
  
  // Append the token to the form data under a specific key, like 'token'.
  formData.append("token", session.access_token);

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
  const response = await authFetch(`${API_BASE_URL}/resumes/`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error("Failed to fetch resumes");
  }

  // The backend returns the list directly, so we can just return the JSON
  return response.json();
};


export const getResumeContent = async (resumeId: number): Promise<string> => {
  const response = await authFetch(`${API_BASE_URL}/resumes/${resumeId}/content`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error("Failed to fetch resume content");
  }

  // The backend returns the raw text, so we use .text()
  return response.text();
};


export const getAnalysisScore = async (resumeText: string, jobDescriptionText: string): Promise<ScoreResponse> => {
  const response = await authFetch(`${API_BASE_URL}/analyze/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeText, jobDescriptionText }),
  });
  if (!response.ok) throw new Error("Failed to fetch analysis score.");
  return response.json();
};


export const getAnalysisSuggestions = async (resumeText: string, jobDescriptionText: string): Promise<SuggestionsResponse> => {
  const response = await authFetch(`${API_BASE_URL}/analyze/suggestions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeText, jobDescriptionText }),
  });
  if (!response.ok) throw new Error("Failed to fetch analysis suggestions.");
  return response.json();
};


// export const tailorResume = async (resumeText: string, jobDescriptionText: string): Promise<Blob> => {
//   const response = await fetch(`${API_BASE_URL}/tailor/`, { // Note the trailing slash
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//     },
//     body: JSON.stringify({ resumeText, jobDescriptionText }),
//   });

//   if (!response.ok) {
//     // Try to get a more specific error message from the backend
//     const errorData = await response.json().catch(() => ({ detail: "Failed to generate PDF." }));
//     throw new Error(errorData.detail || "Failed to generate tailored resume.");
//   }

//   // The response is the raw PDF file, so we get it as a blob
//   return response.blob();
// };


// Fetches the AI-generated content for the editor
export const generateTailoredContent = async (resumeText: string, jobDescriptionText: string): Promise<TailoredResumeSchema> => {
  const response = await authFetch(`${API_BASE_URL}/tailor/generate-content`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeText, jobDescriptionText }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to generate tailored content from AI.");
  }
  return response.json();
};

// Sends the final edited data to be compiled into a PDF
export const compilePdf = async (resumeData: TailoredContent): Promise<Blob> => {
  const response = await authFetch(`${API_BASE_URL}/tailor/compile-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(resumeData),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to compile PDF from the provided data.");
  }
  return response.blob();
};


export const deleteResume = async (resumeId: number): Promise<void> => {
  const response = await authFetch(`${API_BASE_URL}/resumes/${resumeId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    // 204 No Content is a success, but response.ok might be false.
    // We check for specific success/failure statuses.
    if (response.status === 404) {
        throw new Error("Resume not found on the server.");
    }
    if (response.status !== 204) {
        throw new Error("Failed to delete resume.");
    }
  }
};