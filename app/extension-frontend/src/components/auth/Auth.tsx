import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Spinner } from '../ui/Spinner';
import './Auth.css';

interface SupabaseAuthError {
  message: string;
  status?: number;
}

// Email Validation Helper Function ---
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Helper function for auto-formatting the phone number ---
const formatPhoneNumber = (value: string): string => {
  // 1. Remove all non-digit characters
  const cleaned = ('' + value).replace(/\D/g, '');
  
  // 2. Apply the formatting based on the number of digits
  const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
  
  if (match) {
    // 3. Reconstruct the string with dashes
    return [match[1], match[2], match[3]].filter(Boolean).join('-');
  }
  
  return value;
};


export const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // --- NEW: State for all form fields ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleAuthAction = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    // Validation for Sign Up
    if (isSignUp && !validateEmail(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        // --- Sign up with additional metadata ---
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              linkedin_profile: linkedin,
              personal_website: website,
              phone_number: phone,
              location: location,
            }
          }
        });
        if (error) throw error;
        setMessage('Sign up successful! Please check your email for confirmation.');
      } else {
        // Sign in logic remains the same
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // No message needed on successful login, as the app will just switch views.
      }
    } catch (err) {
      const supabaseError = err as SupabaseAuthError;
      
      // Supabase returns a specific message for this common error.
      // We check if the error message includes this specific string.
      if (isSignUp && supabaseError.message.includes("User already registered")) {
        setError("A user with this email already exists. Please sign in instead.");
      } else {
        // For all other errors, show the default message.
        setError(supabaseError.message || "An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    if (isSignUp && newEmail && !validateEmail(newEmail)) {
      setEmailError("Invalid email format.");
    } else {
      setEmailError(''); // Clear error if format is valid or field is empty
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedPhoneNumber = formatPhoneNumber(e.target.value);
    setPhone(formattedPhoneNumber);
  };

  return (
    <div className="auth-container">
      <h2>{isSignUp ? 'Create an Account' : 'Sign In'}</h2>
      <p className="auth-description">{isSignUp ? 'Get started with your free account.' : 'Sign in to access your resumes.'}</p>
      
      <form onSubmit={handleAuthAction} className="auth-form">
        {/* --- Sign In Page --- */}
        {!isSignUp && (
            <>
            <div className="form-group">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" value={email} onChange={handleEmailChange} required placeholder="your@email.com" />
            </div>
            <div className="form-group">
                <label htmlFor="password">Password</label>
                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
          </>
        )}


        {/* --- Sign Up Page --- */}
        {isSignUp && (
          <>
            <div className="form-group-row">
              <div className="form-group">
                <label htmlFor="firstName">First Name *</label>
                <input id="firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">Last Name</label>
                <input id="lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input 
                id="email" 
                type="email" 
                value={email} 
                onChange={handleEmailChange}
                required 
                placeholder="your@email.com" 
              />
              {emailError && <p className="validation-error">{emailError}</p>}
            </div>
            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password *</label>
              <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            <hr className="form-divider" />
            <div className="form-group">
              <label htmlFor="linkedin">LinkedIn Profile URL *</label>
              <input id="linkedin" type="url" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} required placeholder="https://linkedin.com/in/..." />
            </div>
            <div className="form-group">
              <label htmlFor="website">Personal Website (Optional)</label>
              <input id="website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone Number *</label>
              <input 
                id="phone" 
                type="tel" 
                value={phone} 
                onChange={handlePhoneChange}
                required 
                maxLength={12} // 10 digits + 2 dashes
                placeholder="000-000-0000"
              />
            </div>
            <div className="form-group">
              <label htmlFor="location">Location *</label>
              <input id="location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} required placeholder="e.g., San Francisco, CA" />
            </div>
          </>
        )}

        <button type="submit" disabled={loading} className="auth-button">
          {loading ? <Spinner size="small" /> : (isSignUp ? 'Create Account' : 'Sign In')}
        </button>
      </form>

      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}

      <p className="toggle-auth">
        {isSignUp ? 'Already have an account?' : "Don't have an account?"}
        <button onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage(''); }}>
          {isSignUp ? 'Sign In' : 'Sign Up'}
        </button>
      </p>
    </div>
  );
};