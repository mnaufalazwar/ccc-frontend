import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }

    api.verifyEmail(token)
      .then((res) => {
        setStatus('success');
        setMessage(res.message);
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || 'Verification failed.');
      });
  }, [token]);

  return (
    <div className="form-container" style={{ textAlign: 'center' }}>
      <div className="card" style={{ padding: '2rem 1.5rem' }}>
        {status === 'loading' && (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>&#x23F3;</div>
            <h2>Verifying your email...</h2>
            <p className="text-muted">Please wait a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#x2705;</div>
            <h2 style={{ color: 'var(--success)', marginBottom: '0.75rem' }}>Email Verified!</h2>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              {message}
            </p>
            <Link to="/login" className="btn btn-primary">
              Sign In
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#x274C;</div>
            <h2 style={{ color: 'var(--danger)', marginBottom: '0.75rem' }}>Verification Failed</h2>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              {message}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/login" className="btn btn-primary">
                Sign In
              </Link>
              <Link to="/register" className="btn btn-secondary">
                Register Again
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
