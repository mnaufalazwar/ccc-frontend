import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { EnglishLevelType } from '../../types';

const LEVEL_TYPES: { value: EnglishLevelType; label: string }[] = [
  { value: 'IELTS', label: 'IELTS' },
  { value: 'TOEFL_IBT', label: 'TOEFL iBT' },
  { value: 'TOEFL_ITP', label: 'TOEFL ITP' },
  { value: 'DUOLINGO', label: 'Duolingo' },
  { value: 'CEFR', label: 'CEFR' },
  { value: 'OTHER', label: 'Other' },
];

export default function RegisterPage() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [englishLevelType, setEnglishLevelType] = useState('');
  const [englishLevelValue, setEnglishLevelValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    navigate('/sessions', { replace: true });
    return null;
  }

  const passwordsMatch = confirmPassword === '' || password === confirmPassword;

  const levelValueLabel: Record<string, string> = {
    IELTS: 'IELTS Band Score',
    TOEFL_IBT: 'TOEFL iBT Score',
    TOEFL_ITP: 'TOEFL ITP Score',
    DUOLINGO: 'Duolingo Score',
    CEFR: 'CEFR Level',
    OTHER: 'Score / Level',
  };

  const levelValuePlaceholder: Record<string, string> = {
    IELTS: 'e.g. 6.5 (range 0–9)',
    TOEFL_IBT: 'e.g. 90 (range 0–120)',
    TOEFL_ITP: 'e.g. 500 (range 310–677)',
    DUOLINGO: 'e.g. 115 (range 10–160)',
    CEFR: 'e.g. B2 (A1, A2, B1, B2, C1, C2)',
    OTHER: 'e.g. Intermediate',
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register({
        fullName,
        email,
        password,
        ...(englishLevelType ? { englishLevelType } : {}),
        ...(englishLevelValue ? { englishLevelValue } : {}),
      });
      navigate('/check-email', { state: { email } });
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Create Account</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="John Doe"
          />
        </div>
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
            minLength={6}
            placeholder="Min. 6 characters"
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
            placeholder="Re-enter your password"
            style={
              !passwordsMatch
                ? { borderColor: 'var(--danger)', boxShadow: '0 0 0 3px rgba(220,38,38,0.1)' }
                : undefined
            }
          />
          {!passwordsMatch && (
            <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
              Passwords do not match
            </p>
          )}
        </div>
        <div className="form-group">
          <label htmlFor="levelType">English Proficiency Test (optional)</label>
          <select
            id="levelType"
            value={englishLevelType}
            onChange={(e) => {
              setEnglishLevelType(e.target.value);
              setEnglishLevelValue('');
            }}
          >
            <option value="">-- Select test type --</option>
            {LEVEL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        {englishLevelType && (
          <div className="form-group">
            <label htmlFor="levelValue">
              {levelValueLabel[englishLevelType] || 'Score / Level'}
            </label>
            <input
              id="levelValue"
              type="text"
              value={englishLevelValue}
              onChange={(e) => setEnglishLevelValue(e.target.value)}
              placeholder={
                levelValuePlaceholder[englishLevelType] || 'Your score'
              }
            />
          </div>
        )}
        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={loading || !passwordsMatch || confirmPassword === ''}
        >
          {loading ? 'Creating account...' : 'Register'}
        </button>
        <p className="text-center mt-2 text-sm">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
