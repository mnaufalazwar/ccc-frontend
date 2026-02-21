import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="form-container">
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✉️</div>
          <h2 style={{ marginBottom: '0.5rem' }}>Check Your Email</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            If an account with <strong>{email}</strong> exists, we've sent a password reset link.
            Please check your inbox (and spam folder).
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            The link expires in 1 hour.
          </p>
          <div style={{ marginTop: '1.5rem' }}>
            <Link to="/login" className="btn btn-primary btn-sm">Back to Sign In</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="form-container">
      <h2>Forgot Password</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
        Enter the email address you used to register. We'll send you a link to reset your password.
      </p>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
        <p className="text-center mt-2 text-sm">
          <Link to="/login">Back to Sign In</Link>
        </p>
      </form>
    </div>
  );
}
