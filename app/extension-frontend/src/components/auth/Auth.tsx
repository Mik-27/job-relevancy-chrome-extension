import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './Auth.css';

export const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false); // Toggle between Sign In and Sign Up
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleAuthAction = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { error } = isSignUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;
      
      const msg = isSignUp ? 'Account created successfully!' : 'Login successful!';
      setIsSignUp(false);
      setMessage(msg);

    } catch (err: unknown) {
      // Narrow unknown to a shape that may contain error_description/message
      const e = err as { error_description?: string; message?: string };
      setError(e.error_description || e.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>{isSignUp ? 'Create an Account' : 'Sign In'}</h2>
      <p>{isSignUp ? 'Get started with your free account.' : 'Sign in to tailor your resumes.'}</p>
      
      <form onSubmit={handleAuthAction} className="auth-form">
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder='your@email.com'
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder='••••••••'
          />
        </div>
        <button type="submit" disabled={loading} className="auth-button">
          {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
        </button>
      </form>

      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}

      <p className="toggle-auth">
        {isSignUp ? 'Already have an account?' : "Don't have an account?"}
        <button onClick={() => setIsSignUp(!isSignUp)}>
          {isSignUp ? 'Sign In' : 'Sign Up'}
        </button>
      </p>
    </div>
  );
};