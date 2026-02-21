import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="form-container">
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <h2 style={{ color: 'var(--danger)' }}>Invalid Link</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            This password reset link is invalid or missing a token.
          </p>
          <div style={{ marginTop: '1.5rem' }}>
            <Link to="/forgot-password" className="btn btn-primary btn-sm">Request a New Link</Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="form-container">
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
          <h2 style={{ marginBottom: '0.5rem' }}>Password Reset</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Your password has been reset successfully. You can now sign in with your new password.
          </p>
          <div style={{ marginTop: '1.5rem' }}>
            <Link to="/login" className="btn btn-primary btn-sm">Sign In</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="form-container">
      <h2>Reset Your Password</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
        Choose a new password for your account.
      </p>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label htmlFor="newPassword">New Password</label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            placeholder="At least 6 characters"
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            placeholder="Re-enter new password"
          />
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
        <p className="text-center mt-2 text-sm">
          <Link to="/login">Back to Sign In</Link>
        </p>
      </form>
    </div>
  );
}
