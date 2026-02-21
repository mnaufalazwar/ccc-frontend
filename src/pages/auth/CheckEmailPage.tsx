import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../../api/client';

export default function CheckEmailPage() {
  const location = useLocation();
  const email = (location.state as { email?: string })?.email || '';
  const [resending, setResending] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setMsg('');
    setError('');
    try {
      const res = await api.resendVerification(email);
      setMsg(res.message);
    } catch (err: any) {
      setError(err.message || 'Failed to resend');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="form-container" style={{ textAlign: 'center' }}>
      <div className="card" style={{ padding: '2rem 1.5rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#x2709;</div>
        <h2 style={{ marginBottom: '0.75rem' }}>Check Your Email</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
          We've sent a verification link to{' '}
          {email ? <strong>{email}</strong> : 'your email address'}.
          <br />
          Click the link in the email to verify your account, then come back to log in.
        </p>

        {msg && <div className="success-message">{msg}</div>}
        {error && <div className="error-message">{error}</div>}

        {email && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleResend}
            disabled={resending}
            style={{ marginBottom: '1rem' }}
          >
            {resending ? 'Sending...' : "Didn't get it? Resend email"}
          </button>
        )}

        <p className="text-sm text-muted">
          Already verified? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
