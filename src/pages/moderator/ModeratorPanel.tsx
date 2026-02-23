import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import { formatDateTime, formatDate } from '../../utils/dateFormat';
import type {
  Session,
  BreakoutRoom,
  EnglishLevelHistory,
  EnglishLevelType,
} from '../../types';

const LEVEL_TYPES: { value: EnglishLevelType; label: string }[] = [
  { value: 'IELTS', label: 'IELTS' },
  { value: 'TOEFL_IBT', label: 'TOEFL iBT' },
  { value: 'TOEFL_ITP', label: 'TOEFL ITP' },
  { value: 'DUOLINGO', label: 'Duolingo' },
  { value: 'CEFR', label: 'CEFR' },
  { value: 'OTHER', label: 'Other' },
];

const BUCKET_LABELS: Record<string, string> = {
  A1: 'Beginner',
  A2: 'Elementary',
  B1: 'Intermediate',
  B2: 'Upper Intermediate',
  C1: 'Advanced',
  C2: 'Proficient',
};

export default function ModeratorPanel() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  useEffect(() => {
    api
      .getModeratorSessions()
      .then(setSessions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading">Loading sessions...</div>;
  if (error) return <div className="error-message">{error}</div>;

  if (selectedSession) {
    return (
      <SessionRooms
        sessionId={selectedSession}
        onBack={() => setSelectedSession(null)}
      />
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Moderator Panel</h1>
      </div>
      <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>
        My Assigned Sessions
      </h2>
      {sessions.length === 0 ? (
        <p className="text-muted text-center">
          No sessions assigned to you yet.
        </p>
      ) : (
        sessions.map((s) => (
          <div
            key={s.id}
            className="card card-clickable"
            onClick={() => setSelectedSession(s.id)}
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
              {formatDateTime(s.startDateTime)} ·{' '}
              {s.durationMinutes} min
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function SessionRooms({
  sessionId,
  onBack,
}: {
  sessionId: string;
  onBack: () => void;
}) {
  const [rooms, setRooms] = useState<BreakoutRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState<string | null>(null);

  useEffect(() => {
    api
      .getModeratorRooms(sessionId)
      .then(setRooms)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return <div className="page-loading">Loading rooms...</div>;

  return (
    <div>
      <button className="btn btn-secondary btn-sm mb-2" onClick={onBack}>
        &larr; Back to sessions
      </button>

      {error && <div className="error-message">{error}</div>}

      <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
        Breakout Rooms
      </h2>

      {rooms.length === 0 ? (
        <p className="text-muted">No rooms generated for this session yet.</p>
      ) : (
        rooms.map((room) => (
          <div key={room.id} className="room-card">
            <h4>
              Room {room.roomIndex + 1}
              <span className="badge badge-open" style={{ marginLeft: 8 }}>
                {room.levelBucket}
              </span>
              <span className="text-sm" style={{ marginLeft: 6, fontWeight: 500 }}>
                {BUCKET_LABELS[room.levelBucket] || room.levelBucket}
              </span>
            </h4>
            {room.moderators && room.moderators.length > 0 ? (
              <p className="text-sm text-muted mb-1">
                Moderator{room.moderators.length > 1 ? 's' : ''}: {room.moderators.map(m => m.fullName).join(', ')}
              </p>
            ) : (
              <p className="text-sm mb-1" style={{ color: '#b45309' }}>
                Unmoderated
              </p>
            )}
            <ul className="member-list">
              {room.members.map((m) => (
                <li
                  key={m.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.4rem 0',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <span>
                    {m.fullName}
                    <span className="text-muted text-sm" style={{ marginLeft: 6 }}>
                      {m.englishLevelType
                        ? `${m.englishLevelType} ${m.englishLevelValue}`
                        : 'No level'}
                    </span>
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() =>
                        setEditingUser(editingUser === m.id ? null : m.id)
                      }
                    >
                      {editingUser === m.id ? 'Cancel' : 'Edit Level'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {room.members.map(
              (m) =>
                editingUser === m.id && (
                  <EditLevelForm
                    key={`edit-${m.id}`}
                    userId={m.id}
                    userName={m.fullName}
                    onDone={() => {
                      setEditingUser(null);
                      api.getModeratorRooms(sessionId).then(setRooms);
                    }}
                  />
                )
            )}
          </div>
        ))
      )}
    </div>
  );
}

function EditLevelForm({
  userId,
  userName,
  onDone,
}: {
  userId: string;
  userName: string;
  onDone: () => void;
}) {
  const [levelType, setLevelType] = useState('');
  const [levelValue, setLevelValue] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<EnglishLevelHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.updateEnglishLevel(userId, {
        englishLevelType: levelType,
        englishLevelValue: levelValue,
        ...(reason ? { reason } : {}),
      });
      onDone();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    try {
      const h = await api.getLevelHistory(userId);
      setHistory(h);
      setShowHistory(true);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="card mt-1" style={{ background: '#f8fafc' }}>
      <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>
        Update Level: {userName}
      </h4>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Level Type</label>
            <select
              value={levelType}
              onChange={(e) => setLevelType(e.target.value)}
              required
            >
              <option value="">-- Select --</option>
              {LEVEL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Value</label>
            <input
              type="text"
              value={levelValue}
              onChange={(e) => setLevelValue(e.target.value)}
              required
              placeholder="e.g. B2, 7.0"
            />
          </div>
        </div>
        <div className="form-group">
          <label>Reason (optional)</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for change"
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Update Level'}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadHistory}
          >
            {showHistory ? 'Hide History' : 'View History'}
          </button>
        </div>
      </form>

      {showHistory && (
        <div className="mt-2">
          <h4 className="text-sm" style={{ marginBottom: '0.5rem' }}>
            Level History
          </h4>
          {history.length === 0 ? (
            <p className="text-muted text-sm">No history found.</p>
          ) : (
            history.map((h) => (
              <div
                key={h.id}
                className="text-sm"
                style={{
                  padding: '0.4rem 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <span>
                  {h.previousLevelType} {h.previousLevelValue} &rarr;{' '}
                  {h.newLevelType} {h.newLevelValue}
                </span>
                <span className="text-muted" style={{ marginLeft: 8 }}>
                  by {h.changedBy.fullName}
                </span>
                {h.reason && (
                  <span className="text-muted" style={{ marginLeft: 8 }}>
                    — {h.reason}
                  </span>
                )}
                <span className="text-muted" style={{ marginLeft: 8 }}>
                  {formatDate(h.createdAt)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
