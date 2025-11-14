import { createClient } from '@supabase/supabase-js';

// Get these values from your Supabase Project Settings > API
const supabaseUrl = 'https://puttmbdpbymswpgkqbpn.supabase.co'; // e.g., 'https://xyz.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1dHRtYmRwYnltc3dwZ2txYnBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2OTY2NTUsImV4cCI6MjA3NzI3MjY1NX0.G3CjdVMy-dzdUYKoezIwzuAW_0uyso8dyIYDH4SLvXg'; // This is the public key

// IMPORTANT: You must add these to your .env file and use Vite's env handling
// For now, we'll hardcode them for simplicity, but change this later.
// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);