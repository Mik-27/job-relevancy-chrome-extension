import { createClient } from '@supabase/supabase-js';

// Get these values from your Supabase Project Settings > API
const supabaseUrl = 'https://puttmbdpbymswpgkqbpn.supabase.co'; // e.g., 'https://xyz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1dHRtYmRwYnltc3dwZ2txYnBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2OTY2NTUsImV4cCI6MjA3NzI3MjY1NX0.G3CjdVMy-dzdUYKoezIwzuAW_0uyso8dyIYDH4SLvXg'; // This is the public key

// IMPORTANT: You must add these to your .env file and use Vite's env handling
// For now, we'll hardcode them for simplicity, but change this later.
// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be provided.");
}

// --- Custom Storage Adapter with Safety Checks ---
const chromeStorageAdapter = {
  getItem: (key: string): Promise<string | null> => {
    return new Promise((resolve) => {
      // Check if chrome.storage exists
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([key], (result) => {
          resolve(result[key] || null);
        });
      } else {
        // Fallback to localStorage if not in extension context
        resolve(localStorage.getItem(key));
      }
    });
  },
  setItem: (key: string, value: string): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [key]: value }, () => {
          resolve();
        });
      } else {
        localStorage.setItem(key, value);
        resolve();
      }
    });
  },
  removeItem: (key: string): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove([key], () => {
          resolve();
        });
      } else {
        localStorage.removeItem(key);
        resolve();
      }
    });
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: chromeStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});