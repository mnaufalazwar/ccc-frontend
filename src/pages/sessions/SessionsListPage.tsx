import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import type { Session } from '../../types';

export default function SessionsListPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api
      .getOpenSessions()
      .then(setSessions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading">Loading sessions...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Open Sessions</h1>
      </div>
      {sessions.length === 0 ? (
        <p className="text-muted text-center">
          No open sessions available right now.
        </p>
      ) : (
        sessions.map((s) => {
          const spotsLeft = s.maxParticipants - s.currentRegistrations;
          const isFull = spotsLeft <= 0;
          const isLow = !isFull && spotsLeft <= 5;
          return (
            <div
              key={s.id}
              className="card card-clickable"
              onClick={() => navigate(`/sessions/${s.id}`)}
              style={{ borderLeft: `4px solid ${isFull ? '#d1d5db' : isLow ? '#f59e0b' : '#3b82f6'}` }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ marginBottom: s.description ? '0.2rem' : '0.5rem' }}>{s.title}</h3>
                  {s.description && (
                    <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 0.5rem', lineHeight: 1.5 }}>
                      {s.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem', color: '#6b7280' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      {new Date(s.startDateTime).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      {s.durationMinutes} min
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      padding: '0.25rem 0.6rem',
                      borderRadius: '999px',
                      background: isFull ? '#f3f4f6' : isLow ? '#fef3c7' : '#eff6ff',
                      color: isFull ? '#6b7280' : isLow ? '#92400e' : '#1e40af',
                    }}
                  >
                    {isFull ? 'Full' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    {s.currentRegistrations}/{s.maxParticipants} joined
                  </span>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
