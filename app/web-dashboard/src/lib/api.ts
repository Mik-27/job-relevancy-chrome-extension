import { OutreachRecord, PaginatedResponse, UploadResumeResponse, UserProfile, ResumeItem, Application, InterviewRound, ShadowReport, InterviewSession, OutreachContact } from '@/types';
import { supabase } from './supabaseClient';
import { start } from 'repl';

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

// --- Upload User CV Function ---
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

// --- Upload User Personal Info Function ---
export const uploadUserPersonalInfo = async (file: File): Promise<UserProfile> => {
  const formData = new FormData();
  formData.append("file", file);

  // Note: authFetch automatically handles the Authorization header.
  // It detects FormData and correctly lets the browser set the Content-Type boundary.
  const response = await authFetch(`${API_BASE_URL}/users/me/personal-info`, {
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

// Function to mark as sent
export const markOutreachAsSent = async (recordId: string): Promise<OutreachRecord> => {
  const response = await authFetch(`${API_BASE_URL}/outreach/${recordId}/sent`, {
    method: 'PATCH',
  });
  if (!response.ok) throw new Error("Failed to update status");
  return response.json();
};

// Trigger n8n workflow
export const triggerColdOutreach = async (payload: { contacts?: OutreachContact[], file?: File }): Promise<void> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("User is not authenticated.");

  const formData = new FormData();

  if (payload.contacts && payload.contacts.length > 0) {
    formData.append('contacts_json', JSON.stringify(payload.contacts));
  }

  if (payload.file) {
    formData.append('file', payload.file);
  }

  formData.append('token', session.access_token);

  const response = await fetch(`${API_BASE_URL}/outreach/trigger`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(errorData.detail || "Failed to start outreach workflow.");
  }
};

// --- Resume Management Functions ---
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

export const getLiveInterviewWebSocketUrl = async (sessionId: string): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("User is not authenticated");
  
  // Correctly convert HTTP(S) to WS(S)
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  const wsBase = apiBase.replace(/^https?:\/\//, (match) => 
    match === 'https://' ? 'wss://' : 'ws://'
  );
  
  // WebSocket endpoint is under /api prefix
  return `${wsBase}/ws/live-interview?session_id=${sessionId}&token=${session.access_token}`;
};

// Create Session
export const createInterviewSession = async (appId?: string, roundId?: string): Promise<{ id: string }> => {
  const response = await authFetch(`${API_BASE_URL}/live-interview-sessions/`, {
    method: 'POST',
    body: JSON.stringify({ application_id: appId, round_id: roundId }),
  });
  if (!response.ok) throw new Error("Failed to create session");
  return response.json();
};

export const updateInterviewSessionTime = async (sessionId: string, startTime: string): Promise<{ session_id: string }> => {
    const response = await authFetch(`${API_BASE_URL}/live-interview-sessions/${sessionId}/start`, {
        method: 'PATCH',
        body: JSON.stringify({ start_time: startTime }),
    });
    console.log("Update Session Time Response:", response);
    if (!response.ok) throw new Error("Failed to update session");
    return response.json();
}

// Get Sessions List
export const getInterviewSessions = async () => {
    const response = await authFetch(`${API_BASE_URL}/live-interview-sessions/`);
    if (!response.ok) throw new Error("Failed to fetch sessions");
    return response.json();
};

// End session and get report
export const endInterviewSession = async (sessionId: string, end_time?: string): Promise<ShadowReport> => {
  const response = await authFetch(`${API_BASE_URL}/live-interview-sessions/${sessionId}/end`, {
    method: 'POST',
    body: end_time ? JSON.stringify({ end_time }) : undefined,
  });
  if (!response.ok) throw new Error("Failed to generate report");
  return response.json();
};

// Get session details
export const getInterviewSession = async (sessionId: string): Promise<InterviewSession> => {
  const response = await authFetch(`${API_BASE_URL}/live-interview-sessions/${sessionId}`);
  if (!response.ok) throw new Error("Failed to fetch session details");
  return response.json();
};