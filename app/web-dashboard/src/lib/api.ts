import { OutreachRecord, PaginatedResponse, UploadResumeResponse, UserProfile, ResumeItem } from '@/types';
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

export const deleteResume = async (resumeId: number): Promise<void> => {
  const response = await authFetch(`${API_BASE_URL}/resumes/${resumeId}`, {
    method: 'DELETE',
  });
  if (response.status !== 204 && !response.ok) {
    throw new Error("Failed to delete resume.");
  }
};

export const uploadResume = async (file: File, company: string, autoscore: boolean): Promise<UploadResumeResponse> => {
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