import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { formatDateShort } from '../../utils/dateFormat';
import type { Session } from '../../types';

export default function MySessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api
      .getMySessions()
      .then(setSessions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading">Loading your sessions...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div>
      <div className="page-header">
        <h1>My Sessions</h1>
      </div>
      {sessions.length === 0 ? (
        <p className="text-muted text-center">
          You haven't registered for any sessions yet.
        </p>
      ) : (
        sessions.map((s) => (
          <div
            key={s.id}
            className="card card-clickable"
            onClick={() => navigate(`/sessions/${s.id}`)}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <h3>{s.title}</h3>
              <span className={`badge badge-${s.status.toLowerCase()}`}>
                {s.status}
              </span>
            </div>
            <div className="card-meta">
              <span>
                {formatDateShort(s.startDateTime)}
              </span>
              {' · '}
              <span>{s.durationMinutes} min</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
