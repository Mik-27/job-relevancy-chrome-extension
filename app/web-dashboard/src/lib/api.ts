import { UserProfile } from '@/types';
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