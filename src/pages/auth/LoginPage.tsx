import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/client';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [resending, setResending] = useState(false);

  if (user) {
    navigate('/sessions', { replace: true });
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setShowResend(false);
    setResendMsg('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/sessions');
    } catch (err: any) {
      const msg = err.message || 'Login failed';
      setError(msg);
      if (msg.toLowerCase().includes('verify your email')) {
        setShowResend(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendMsg('');
    try {
      const res = await api.resendVerification(email);
      setResendMsg(res.message);
    } catch (err: any) {
      setResendMsg(err.message || 'Failed to resend');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Sign In</h2>
      {error && <div className="error-message">{error}</div>}
      {showResend && (
        <div style={{ marginBottom: '1rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleResend}
            disabled={resending || !email}
          >
            {resending ? 'Sending...' : 'Resend verification email'}
          </button>
          {resendMsg && (
            <p className="text-sm" style={{ marginTop: '0.5rem', color: 'var(--success)' }}>
              {resendMsg}
            </p>
          )}
        </div>
      )}
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
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Your password"
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
        <p className="text-center mt-2 text-sm">
          <Link to="/forgot-password">Forgot your password?</Link>
        </p>
        <p className="text-center mt-2 text-sm">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </form>
    </div>
  );
}
