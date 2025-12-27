import { OutreachRecord, PaginatedResponse, UploadResumeResponse, UserProfile, ResumeItem, Application, InterviewRound } from '@/types';
import { supabase } from './supabaseClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// Helper for authenticated requests
const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  // If no session, we might want to redirect to login, but for now throw error
  if (!session) {
    throw new Error("User is not authenticated.");
  }

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${session.access_token}`);
  
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, { ...options, headers });
};

// --- Profile Functions (Ported from Extension) ---

export const getUserProfile = async () => {
  const response = await authFetch(`${API_BASE_URL}/users/me`);
  if (!response.ok) throw new Error("Failed to fetch profile");
  return response.json();
};

export const updateUserProfile = async (data: UserProfile) => {
  const response = await authFetch(`${API_BASE_URL}/users/me`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update profile");
  return response.json();
};

// --- NEW: Upload User CV Function ---
export const uploadUserCV = async (file: File): Promise<UserProfile> => {
  const formData = new FormData();
  formData.append("file", file);

  // Note: authFetch automatically handles the Authorization header.
  // It detects FormData and correctly lets the browser set the Content-Type boundary.
  const response = await authFetch(`${API_BASE_URL}/users/me/cv`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(err.detail || "Failed to upload CV");
  }
  
  return response.json();
};

// UPDATED: Function accepts params
export const getOutreachHistory = async (
  page: number = 1, 
  limit: number = 15, 
  search: string = ''
): Promise<PaginatedResponse<OutreachRecord>> => {
  
  // Build query params
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  
  if (search) {
    params.append('search', search);
  }

  const response = await authFetch(`${API_BASE_URL}/outreach/history?${params.toString()}`);
  
  if (!response.ok) throw new Error("Failed to fetch outreach history");
  return response.json();
};

// NEW: Function to mark as sent
export const markOutreachAsSent = async (recordId: string): Promise<OutreachRecord> => {
  const response = await authFetch(`${API_BASE_URL}/outreach/${recordId}/sent`, {
    method: 'PATCH',
  });
  if (!response.ok) throw new Error("Failed to update status");
  return response.json();
};

// --- NEW: Resume Management Functions ---

export const listResumes = async (): Promise<ResumeItem[]> => {
  const response = await authFetch(`${API_BASE_URL}/resumes/`);
  if (!response.ok) throw new Error("Failed to fetch resumes");
  return response.json();
};

export const uploadResume = async (
  file: File, 
  company: string, 
  autoscore: boolean,
  tagsRole: string[],
  tagsCategory: string[]
): Promise<UploadResumeResponse> => {

  const formData = new FormData();
  formData.append("file", file);
  formData.append("company", company);
  formData.append("autoscore", String(autoscore));
  formData.append("tags_role_json", JSON.stringify(tagsRole));
  formData.append("tags_category_json", JSON.stringify(tagsCategory));

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("User is not authenticated.");
  }
  
  // Append the token to the form data under a specific key, like 'token'.
  formData.append("token", session.access_token);

  // authFetch handles the Authorization header automatically
  const response = await authFetch(`${API_BASE_URL}/resumes/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "File upload failed");
  }
  return response.json();
};

// NEW: Update resume details
export const updateResumeAutoscore = async (resumeId: number, autoscore: boolean): Promise<ResumeItem> => {
  const response = await authFetch(`${API_BASE_URL}/resumes/${resumeId}/autoscore`, {
    method: 'PATCH',
    body: JSON.stringify({ autoscore }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to update status.");
  }
  
  return response.json();
};

export const deleteResume = async (resumeId: number): Promise<void> => {
  const response = await authFetch(`${API_BASE_URL}/resumes/${resumeId}`, {
    method: 'DELETE',
  });
  if (response.status !== 204 && !response.ok) {
    throw new Error("Failed to delete resume.");
  }
};


// --- Application Tracker Functions ---

export const getApplications = async (): Promise<Application[]> => {
  const response = await authFetch(`${API_BASE_URL}/applications/`);
  if (!response.ok) throw new Error("Failed to fetch applications");
  return response.json();
};

export const getApplication = async (id: string): Promise<Application> => {
  const response = await authFetch(`${API_BASE_URL}/applications/${id}`);
  if (!response.ok) throw new Error("Failed to fetch application");
  return response.json();
};

export const createApplication = async (data: Partial<Application>): Promise<Application> => {
  const response = await authFetch(`${API_BASE_URL}/applications/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  console.log("Create Application Response:", response);
  if (!response.ok) throw new Error("Failed to create application");
  return response.json();
};

export const updateApplicationStatus = async (id: string, status: string): Promise<Application> => {
  const response = await authFetch(`${API_BASE_URL}/applications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error("Failed to update status");
  return response.json();
};

export const toggleApplicationBoardStatus = async (id: string, on_board: boolean): Promise<Application> => {
  const response = await authFetch(`${API_BASE_URL}/applications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ on_board }),
  });
  if (!response.ok) throw new Error("Failed to update board status");
  return response.json();
};

export const deleteApplication = async (id: string): Promise<void> => {
    const response = await authFetch(`${API_BASE_URL}/applications/${id}`, { method: 'DELETE' });
    if (response.status !== 204) throw new Error("Failed to delete");
};


export const updateApplication = async (id: string, data: Partial<Application>): Promise<Application> => {
    const response = await authFetch(`${API_BASE_URL}/applications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error("Failed to update");
    return response.json();
}


// --- Interview Rounds ---

export const getInterviewRounds = async (appId: string): Promise<InterviewRound[]> => {
  const response = await authFetch(`${API_BASE_URL}/interview-rounds/${appId}`);
  if (!response.ok) throw new Error("Failed to fetch rounds");
  return response.json();
};

export const createInterviewRound = async (data: Partial<InterviewRound>): Promise<InterviewRound> => {
  const response = await authFetch(`${API_BASE_URL}/interview-rounds/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create round");
  return response.json();
};

export const updateInterviewRound = async (roundId: string, data: Partial<InterviewRound>): Promise<InterviewRound> => {
  const response = await authFetch(`${API_BASE_URL}/interview-rounds/${roundId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update round");
  return response.json();
};

export const deleteInterviewRound = async (roundId: string): Promise<void> => {
  const response = await authFetch(`${API_BASE_URL}/interview-rounds/${roundId}`, {
    method: 'DELETE',
  });
  if (response.status !== 204 && !response.ok) throw new Error("Failed to delete round");
};

export const generateRoundPrep = async (roundId: string): Promise<InterviewRound> => {
  const response = await authFetch(`${API_BASE_URL}/interview-rounds/${roundId}/generate`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error("AI Generation failed");
  return response.json();
};

// Live Interview Functions

export const getLiveInterviewWebSocketUrl = async (appId: string): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("User is not authenticated");
  
  // Construct WS URL (ws:// or wss://)
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // Adjust base URL to point to backend host (remove /api if it's there, or parse it)
  // Assuming NEXT_PUBLIC_API_BASE_URL is like "http://localhost:8000/api"
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('http', 'ws');
  
  // URL: ws://localhost:8000/api/ws/live-interview?app_id=...&token=...
  return `${apiBase}/ws/live-interview?app_id=${appId}&token=${session.access_token}`;
};