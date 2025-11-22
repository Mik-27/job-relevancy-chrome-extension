import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import './App.css';
import { supabase } from './lib/supabaseClient';
import { Auth } from './components/auth/Auth';
import { MainApp } from './MainApp'; // We will create this new component

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for an existing session when the app loads
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for changes in auth state (e.g., user logs in or out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Cleanup the subscription when the component unmounts
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="loading-message">Loading...</div>;
  }

  return (
    <div className="app-container">
      {/* If there is no active session, show the Auth component */}
      {!session ? (
        <Auth />
      ) : (
        // If a session exists, show the main application
        // We pass the session key to force a re-render on login
        <MainApp key={session.user.id} session={session} />
      )}
    </div>
  );
}

export default App;