import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../types';
import { getUserProfile, updateUserProfile, uploadUserCV } from '../../api/resumeApi';
import { Spinner } from '../ui/Spinner';
import './Profile.css';


export const Profile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Fetch data on mount
  useEffect(() => {
    getUserProfile()
      .then(setProfile)
      .catch((err: Error) => setError(`Failed to load profile. ${err instanceof Error ? err.message : String(err)}`))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (profile) {
      setProfile({ ...profile, [e.target.name]: e.target.value });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = await updateUserProfile(profile);
      setProfile(updated);
      setMessage('Profile updated successfully!');
    } catch (err) {
      setError(`Failed to update profile. ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSaving(true);
      setMessage('');
      try {
        const updated = await uploadUserCV(e.target.files[0]);
        setProfile(updated);
        setMessage('CV uploaded successfully!');
      } catch (err) {
        setError(`Failed to upload CV. ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setSaving(false);
      }
    }
  };

  if (loading) return <div className="profile-container"><Spinner /></div>;
  if (!profile) return <div className="profile-container">Error loading profile.</div>;

  return (
    <div className="profile-container">
      <div className="profile-header">
        {/* <button onClick={onBack} className="back-button">&larr; Back</button> */}
        <h2>My Profile</h2>
      </div>

      <form onSubmit={handleSave} className="profile-form">
        <div className="form-row">
          <div className="form-group">
            <label>First Name</label>
            <input name="first_name" value={profile.first_name} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Last Name</label>
            <input name="last_name" value={profile.last_name} onChange={handleChange} />
          </div>
        </div>

        <div className="form-group">
          <label>Email (Read-only)</label>
          <input value={profile.email} disabled className="disabled-input" />
        </div>

        <div className="form-group">
          <label>Phone Number</label>
          <input name="phone_number" value={profile.phone_number} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>Location</label>
          <input name="location" value={profile.location} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>LinkedIn URL</label>
          <input name="linkedin_profile" value={profile.linkedin_profile} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>Personal Website</label>
          <input name="personal_website" value={profile.personal_website || ''} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>GitHub Profile URL</label>
          <input name="github_profile" value={profile.github_profile || ''} onChange={handleChange} />
        </div>

        <hr className="divider" />

        <div className="form-group">
          <label>Master CV / Career Info</label>
          {profile.cv_url && (
            <div className="current-cv">
              <a href={profile.cv_url} target="_blank" rel="noopener noreferrer">View Current CV</a>
            </div>
          )}
          <input type="file" accept=".pdf,.doc,.docx" onChange={handleCVUpload} />
          <small>Upload PDF or Word (Max 5MB)</small>
        </div>

        <div className="profile-actions">
          <button type="submit" className="save-button" disabled={saving}>
            {saving ? <Spinner size="small" /> : 'Save Changes'}
          </button>
        </div>

        {message && <p className="success-message">{message}</p>}
        {error && <p className="error-message">{error}</p>}
      </form>
    </div>
  );
};