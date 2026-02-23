import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import type {
  Session,
  Registration,
  BreakoutRoom,
  Feedback,
  SessionStatus,
  User,
  Role,
} from '../../types';

type Tab = 'create' | 'manage' | 'users';

const STATUS_FLOW: SessionStatus[] = ['DRAFT', 'OPEN', 'CLOSED', 'COMPLETED'];

export default function AdminPanel() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const [tab, setTab] = useState<Tab>('manage');

  return (
    <div>
      <div className="page-header">
        <h1>Admin Panel</h1>
      </div>
      <div className="tabs">
        <button
          className={`tab ${tab === 'manage' ? 'active' : ''}`}
          onClick={() => setTab('manage')}
        >
          Manage Sessions
        </button>
        <button
          className={`tab ${tab === 'create' ? 'active' : ''}`}
          onClick={() => setTab('create')}
        >
          Create Session
        </button>
        <button
          className={`tab ${tab === 'users' ? 'active' : ''}`}
          onClick={() => setTab('users')}
        >
          Manage Users
        </button>
      </div>
      {tab === 'create' && <CreateSessionForm onCreated={() => setTab('manage')} />}
      {tab === 'manage' && <ManageSessions />}
      {tab === 'users' && <ManageUsers isSuperAdmin={isSuperAdmin} />}
    </div>
  );
}

function CreateSessionForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDateTime, setStartDateTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [maxParticipants, setMaxParticipants] = useState(20);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.createSession({
        title,
        description: description || undefined,
        startDateTime: new Date(startDateTime).toISOString(),
        durationMinutes,
        maxParticipants,
      });
      onCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 500 }}>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label htmlFor="cs-title">Title</label>
          <input
            id="cs-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Conversation Practice: Travel"
          />
        </div>
        <div className="form-group">
          <label htmlFor="cs-desc">Description <span className="text-muted" style={{ fontWeight: 400 }}>(optional)</span></label>
          <textarea
            id="cs-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What will participants discuss? Add details to get people excited!"
            rows={3}
            maxLength={500}
            style={{ resize: 'vertical' }}
          />
        </div>
        <div className="form-group">
          <label htmlFor="cs-datetime">Start Date & Time</label>
          <input
            id="cs-datetime"
            type="datetime-local"
            value={startDateTime}
            onChange={(e) => setStartDateTime(e.target.value)}
            required
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="cs-duration">Duration (min)</label>
            <input
              id="cs-duration"
              type="number"
              min="15"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="cs-max">Max Participants</label>
            <input
              id="cs-max"
              type="number"
              min="2"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(Number(e.target.value))}
              required
            />
          </div>
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ marginTop: '0.75rem' }}
        >
          {loading ? 'Creating...' : 'Create Session'}
        </button>
      </form>
    </div>
  );
}

function ManageSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    setLoading(true);
    try {
      const data = await api.getAdminSessions();
      setSessions(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="page-loading">Loading sessions...</div>;
  if (error) return <div className="error-message">{error}</div>;

  if (selected) {
    return (
      <SessionManager
        sessionId={selected}
        onBack={() => {
          setSelected(null);
          loadSessions();
        }}
      />
    );
  }

  return (
    <div>
      {sessions.length === 0 ? (
        <p className="text-muted text-center">No sessions found.</p>
      ) : (
        sessions.map((s) => (
          <div
            key={s.id}
            className="card card-clickable"
            onClick={() => setSelected(s.id)}
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
              {new Date(s.startDateTime).toLocaleString()} ·{' '}
              {s.currentRegistrations}/{s.maxParticipants} registered
              {s.attendanceCode && (
                <span style={{ marginLeft: 8 }}>
                  · Code: <strong style={{ letterSpacing: '0.1em' }}>{s.attendanceCode}</strong>
                </span>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function SessionManager({
  sessionId,
  onBack,
}: {
  sessionId: string;
  onBack: () => void;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [rooms, setRooms] = useState<BreakoutRoom[]>([]);
  const [sessionFeedback, setSessionFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  // Room generation
  const [roomSize, setRoomSize] = useState(4);

  // Description
  const [editDescription, setEditDescription] = useState('');
  const [descSaving, setDescSaving] = useState(false);

  // Zoom info
  const [zoomLink, setZoomLink] = useState('');
  const [zoomMeetingId, setZoomMeetingId] = useState('');
  const [zoomPassword, setZoomPassword] = useState('');
  const [zoomSaving, setZoomSaving] = useState(false);

  // Email blast
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailDefaults, setEmailDefaults] = useState({ subject: '', body: '' });
  const [emailRecipientCount, setEmailRecipientCount] = useState(0);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    loadAll();
  }, [sessionId]);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [s, regs, r, fb] = await Promise.all([
        api.getAdminSession(sessionId),
        api.getRegistrations(sessionId).catch(() => [] as Registration[]),
        api.getRooms(sessionId).catch(() => [] as BreakoutRoom[]),
        api.getSessionFeedback(sessionId).catch(() => [] as Feedback[]),
      ]);
      setSession(s);
      setEditDescription(s.description || '');
      setZoomLink(s.zoomLink || '');
      setZoomMeetingId(s.zoomMeetingId || '');
      setZoomPassword(s.zoomPassword || '');
      setRegistrations(regs);
      setRooms(r);
      setSessionFeedback(fb);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const updateStatus = async (status: SessionStatus) => {
    setError('');
    setActionMsg('');
    try {
      const updated = await api.updateSession(sessionId, { status });
      setSession(updated);
      setActionMsg(`Status updated to ${status}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGenerateRooms = async () => {
    setError('');
    setActionMsg('');
    try {
      const generated = await api.generateRooms(sessionId, roomSize);
      setRooms(generated);
      setActionMsg(`Generated ${generated.length} rooms`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveZoomInfo = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setActionMsg('');
    setZoomSaving(true);
    try {
      const updated = await api.updateSession(sessionId, {
        zoomLink: zoomLink || undefined,
        zoomMeetingId: zoomMeetingId || undefined,
        zoomPassword: zoomPassword || undefined,
      });
      setSession(updated);
      setActionMsg('Zoom meeting info saved!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setZoomSaving(false);
    }
  };

  const handleComposeEmail = async () => {
    setEmailOpen(true);
    setEmailLoading(true);
    setEmailSent(false);
    try {
      const preview = await api.getEmailPreview(sessionId);
      setEmailSubject(preview.subject);
      setEmailBody(preview.body);
      setEmailDefaults({ subject: preview.subject, body: preview.body });
      setEmailRecipientCount(preview.recipientCount);
    } catch (err: any) {
      setError(err.message);
      setEmailOpen(false);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!confirm(`Send this email to ${emailRecipientCount} participant${emailRecipientCount !== 1 ? 's' : ''}?`)) {
      return;
    }
    setEmailSending(true);
    setError('');
    try {
      const result = await api.sendSessionEmail(sessionId, {
        subject: emailSubject,
        body: emailBody,
      });
      setActionMsg(`Email sent to ${result.sent} participant${result.sent !== 1 ? 's' : ''}!`);
      setEmailSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEmailSending(false);
    }
  };

  const handleResetEmail = () => {
    setEmailSubject(emailDefaults.subject);
    setEmailBody(emailDefaults.body);
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div>
      <button className="btn btn-secondary btn-sm mb-2" onClick={onBack}>
        &larr; Back to list
      </button>

      {error && <div className="error-message">{error}</div>}
      {actionMsg && <div className="success-message">{actionMsg}</div>}

      {session && (
        <>
          <div className="card mb-2">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h2 style={{ fontSize: '1.25rem' }}>{session.title}</h2>
              <span className={`badge badge-${session.status.toLowerCase()}`}>
                {session.status}
              </span>
            </div>
            {session.description && (
              <p style={{ color: '#4b5563', margin: '0.25rem 0 0', lineHeight: 1.5, fontSize: '0.9rem' }}>
                {session.description}
              </p>
            )}
            <dl className="session-info mt-1">
              <dt>Date</dt>
              <dd>{new Date(session.startDateTime).toLocaleString()}</dd>
              <dt>Duration</dt>
              <dd>{session.durationMinutes} min</dd>
              <dt>Participants</dt>
              <dd>
                {session.currentRegistrations} / {session.maxParticipants}
              </dd>
            </dl>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {STATUS_FLOW.map((st) => (
                <button
                  key={st}
                  className={`btn btn-sm ${st === session.status ? 'btn-primary' : 'btn-secondary'}`}
                  disabled={st === session.status}
                  onClick={() => updateStatus(st)}
                >
                  {st}
                </button>
              ))}
            </div>

            {session.attendanceCode && (
              <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f0f5ff', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <span className="text-muted text-sm">Attendance Code (announce at end of Zoom):</span>
                <strong style={{ marginLeft: 8, fontSize: '1.25rem', letterSpacing: '0.15em' }}>
                  {session.attendanceCode}
                </strong>
              </div>
            )}

            {session.status === 'COMPLETED' && (
              <div style={{ marginTop: '0.5rem' }}>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={async () => {
                    setError('');
                    setActionMsg('');
                    try {
                      await api.finalizeAttendance(sessionId);
                      setActionMsg('Attendance finalized. Users who did not verify have been marked as no-show.');
                      loadAll();
                    } catch (err: any) {
                      setError(err.message);
                    }
                  }}
                >
                  Finalize Attendance (mark unverified as no-show)
                </button>
              </div>
            )}
          </div>

          {/* Session Description */}
          <div className="mt-3">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Description</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setDescSaving(true);
              try {
                const updated = await api.updateSession(sessionId, { description: editDescription });
                setSession(updated);
                setActionMsg('Description saved');
              } catch (err: any) { setError(err.message); }
              finally { setDescSaving(false); }
            }} style={{ maxWidth: 500 }}>
              <div className="form-group">
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Add a description to attract participants..."
                  rows={3}
                  maxLength={500}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm" disabled={descSaving}>
                {descSaving ? 'Saving...' : 'Save Description'}
              </button>
            </form>
          </div>

          {/* Zoom Meeting Info */}
          <div className="mt-3">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Zoom Meeting Info</h3>
            <form onSubmit={handleSaveZoomInfo} style={{ maxWidth: 500 }}>
              <div className="form-group">
                <label className="form-label">Meeting Link</label>
                <input
                  type="url"
                  className="form-control"
                  placeholder="https://zoom.us/j/..."
                  value={zoomLink}
                  onChange={(e) => setZoomLink(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Meeting ID</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="123 456 7890"
                    value={zoomMeetingId}
                    onChange={(e) => setZoomMeetingId(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Password</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="abc123"
                    value={zoomPassword}
                    onChange={(e) => setZoomPassword(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-sm" disabled={zoomSaving}>
                {zoomSaving ? 'Saving...' : 'Save Zoom Info'}
              </button>
              {session.zoomLink && (
                <span className="text-muted text-sm" style={{ marginLeft: 12 }}>
                  Currently set
                </span>
              )}
            </form>
          </div>

          {/* Email Participants */}
          <div className="mt-3">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Email Participants</h3>
            {!emailOpen ? (
              <button
                className="btn btn-primary btn-sm"
                onClick={handleComposeEmail}
                disabled={registrations.length === 0}
              >
                Compose Email
              </button>
            ) : emailLoading ? (
              <p className="text-muted">Loading preview...</p>
            ) : (
              <div style={{ maxWidth: 600 }}>
                <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                  This email will be sent to <strong>{emailRecipientCount}</strong> registered participant{emailRecipientCount !== 1 ? 's' : ''}.
                </p>
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <input
                    type="text"
                    className="form-control"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    disabled={emailSending || emailSent}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Message</label>
                  <textarea
                    className="form-control"
                    rows={12}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    disabled={emailSending || emailSent}
                    style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.75rem' }}>
                  {!emailSent ? (
                    <>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={handleSendEmail}
                        disabled={emailSending || !emailSubject.trim() || !emailBody.trim()}
                      >
                        {emailSending ? 'Sending...' : `Send to ${emailRecipientCount} Participant${emailRecipientCount !== 1 ? 's' : ''}`}
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={handleResetEmail}
                        disabled={emailSending}
                      >
                        Reset to Default
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setEmailOpen(false)}
                        disabled={emailSending}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => { setEmailOpen(false); setEmailSent(false); }}
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            )}
            {registrations.length === 0 && (
              <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                No participants registered yet.
              </p>
            )}
          </div>

          {/* Registrations */}
          <RegistrationsList
            registrations={registrations}
            sessionStatus={session.status}
            setError={setError}
            setActionMsg={setActionMsg}
            onUpdate={loadAll}
          />

          {/* Generate Rooms */}
          <BreakoutRoomsManager
            sessionId={sessionId}
            rooms={rooms}
            setRooms={setRooms}
            registrations={registrations}
            roomSize={roomSize}
            setRoomSize={setRoomSize}
            onGenerateRooms={handleGenerateRooms}
            setError={setError}
            setActionMsg={setActionMsg}
          />

          {/* Session Feedback (overall) */}
          {sessionFeedback.length > 0 && (
            <div className="mt-3">
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>
                Session Feedback ({sessionFeedback.length})
              </h3>
              {(() => {
                const ratings = sessionFeedback.filter((fb) => fb.rating != null).map((fb) => fb.rating!);
                const avg = ratings.length > 0
                  ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
                  : null;
                return avg ? (
                  <p className="text-sm" style={{ marginBottom: '0.5rem' }}>
                    Average rating: <strong>{avg}/5</strong> ({ratings.length} rating{ratings.length !== 1 ? 's' : ''})
                  </p>
                ) : null;
              })()}
              {sessionFeedback.map((fb) => (
                <div key={fb.id} className="card mb-2" style={{ padding: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span className="text-sm" style={{ fontWeight: 500 }}>
                      {fb.anonymous || !fb.fromUser ? (
                        <em style={{ color: 'var(--text-muted)' }}>Anonymous</em>
                      ) : (
                        fb.fromUser.fullName
                      )}
                    </span>
                    {fb.rating != null && (
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        {fb.rating}/5
                      </span>
                    )}
                  </div>
                  {fb.text && <p className="text-sm" style={{ margin: '0.25rem 0 0' }}>{fb.text}</p>}
                  <p className="text-muted text-sm" style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>
                    {new Date(fb.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const REGISTRATIONS_PAGE_SIZE = 10;

function RegistrationsList({
  registrations,
  sessionStatus,
  setError,
  setActionMsg,
  onUpdate,
}: {
  registrations: Registration[];
  sessionStatus: SessionStatus;
  setError: (msg: string) => void;
  setActionMsg: (msg: string) => void;
  onUpdate: () => void;
}) {
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    return [...registrations].sort((a, b) => {
      const aMod = a.registeredAsModerator ? 0 : 1;
      const bMod = b.registeredAsModerator ? 0 : 1;
      return aMod - bMod;
    });
  }, [registrations]);

  const totalPages = Math.ceil(sorted.length / REGISTRATIONS_PAGE_SIZE);
  const pageItems = sorted.slice(
    page * REGISTRATIONS_PAGE_SIZE,
    (page + 1) * REGISTRATIONS_PAGE_SIZE
  );

  useEffect(() => {
    if (page >= totalPages && totalPages > 0) setPage(totalPages - 1);
  }, [totalPages, page]);

  const moderatorCount = sorted.filter((r) => r.registeredAsModerator).length;
  const participantCount = sorted.length - moderatorCount;

  return (
    <div className="mt-3">
      <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>
        Registrations ({registrations.length})
        {moderatorCount > 0 && (
          <span className="text-muted text-sm" style={{ fontWeight: 400, marginLeft: 8 }}>
            {moderatorCount} moderator{moderatorCount !== 1 ? 's' : ''}, {participantCount} participant{participantCount !== 1 ? 's' : ''}
          </span>
        )}
      </h3>
      {sorted.length === 0 ? (
        <p className="text-muted text-sm">No registrations yet.</p>
      ) : (
        <>
          {pageItems.map((r) => (
            <RegistrationRow
              key={r.id}
              reg={r}
              sessionStatus={sessionStatus}
              setError={setError}
              setActionMsg={setActionMsg}
              onUpdate={onUpdate}
            />
          ))}

          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '0.75rem',
              }}
            >
              <button
                className="btn btn-secondary btn-sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span className="text-sm">
                Page {page + 1} of {totalPages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const PROFICIENCY_OPTIONS = [
  { value: 'A1', label: 'Beginner' },
  { value: 'A2', label: 'Elementary' },
  { value: 'B1', label: 'Intermediate' },
  { value: 'B2', label: 'Upper Intermediate' },
  { value: 'C1', label: 'Advanced' },
  { value: 'C2', label: 'Proficient' },
];

const BUCKET_LABELS: Record<string, string> = Object.fromEntries(
  PROFICIENCY_OPTIONS.map((o) => [o.value, o.label])
);

const BUCKET_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function getEffectiveRoomBucket(room: BreakoutRoom): string {
  const memberBuckets = room.members
    .map((m) => m.levelBucket)
    .filter((b): b is string => b != null);
  if (memberBuckets.length === 0) return room.levelBucket;
  let lowest = BUCKET_ORDER.indexOf(memberBuckets[0]);
  if (lowest === -1) lowest = BUCKET_ORDER.length;
  for (const b of memberBuckets) {
    const idx = BUCKET_ORDER.indexOf(b);
    if (idx !== -1 && idx < lowest) lowest = idx;
  }
  return lowest < BUCKET_ORDER.length ? BUCKET_ORDER[lowest] : room.levelBucket;
}

function RegistrationRow({
  reg,
  sessionStatus,
  setError,
  setActionMsg,
  onUpdate,
}: {
  reg: Registration;
  sessionStatus: SessionStatus;
  setError: (msg: string) => void;
  setActionMsg: (msg: string) => void;
  onUpdate: () => void;
}) {
  const [editingOverride, setEditingOverride] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(
    reg.user.proficiencyLevelOverride || ''
  );
  const [saving, setSaving] = useState(false);

  const handleSaveOverride = async () => {
    setError('');
    setActionMsg('');
    setSaving(true);
    try {
      await api.updateProficiencyOverride(
        reg.user.id,
        selectedLevel || null
      );
      setActionMsg(`Proficiency level updated for ${reg.user.fullName}`);
      setEditingOverride(false);
      onUpdate();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ padding: '0.5rem 0.75rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div>
          <strong>{reg.user.fullName}</strong>
          <span className="text-muted text-sm" style={{ marginLeft: 8 }}>
            {reg.user.email}
          </span>
          {reg.registeredAsModerator && (
            <span
              style={{
                marginLeft: 8,
                padding: '0.1rem 0.4rem',
                borderRadius: '4px',
                fontSize: '0.65rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: '#fff',
                background: '#7c3aed',
              }}
            >
              Moderator
            </span>
          )}
          {reg.user.proficiencyLevel && (
            <span className="badge badge-open" style={{ marginLeft: 8 }}>
              {reg.user.proficiencyLevel}
            </span>
          )}
          {reg.user.proficiencyLevelOverride && (
            <span className="badge badge-closed" style={{ marginLeft: 4, fontSize: '0.65rem' }}>
              Override
            </span>
          )}
          <span className="text-muted text-sm" style={{ marginLeft: 8 }}>
            {reg.user.englishLevelType
              ? `${reg.user.englishLevelType} ${reg.user.englishLevelValue || ''}`
              : 'No test result'}
          </span>
          {(sessionStatus === 'CLOSED' || sessionStatus === 'COMPLETED') && (
            <>
              {reg.attended === true && (
                <span className="badge badge-completed" style={{ marginLeft: 8 }}>Attended</span>
              )}
              {reg.attended === false && (
                <span className="badge badge-closed" style={{ marginLeft: 8 }}>No-show</span>
              )}
              {reg.attended === null && (
                <span className="badge badge-draft" style={{ marginLeft: 8 }}>Pending</span>
              )}
            </>
          )}
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setEditingOverride(!editingOverride)}
        >
          {editingOverride ? 'Cancel' : 'Set Level'}
        </button>
      </div>

      {editingOverride && (
        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            style={{ padding: '0.25rem 0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontSize: '0.85rem' }}
          >
            <option value="">Auto (from test score)</option>
            {PROFICIENCY_OPTIONS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSaveOverride}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
    </div>
  );
}

function BreakoutRoomsManager({
  sessionId,
  rooms,
  setRooms,
  registrations,
  roomSize,
  setRoomSize,
  onGenerateRooms,
  setError,
  setActionMsg,
}: {
  sessionId: string;
  rooms: BreakoutRoom[];
  setRooms: (rooms: BreakoutRoom[]) => void;
  registrations: Registration[];
  roomSize: number;
  setRoomSize: (v: number) => void;
  onGenerateRooms: () => void;
  setError: (msg: string) => void;
  setActionMsg: (msg: string) => void;
}) {
  const [movingMember, setMovingMember] = useState<{
    roomId: string;
    user: User;
  } | null>(null);
  const [addingToRoom, setAddingToRoom] = useState<string | null>(null);

  const assignedUserIds = new Set(
    rooms.flatMap((r) => [
      ...r.members.map((m) => m.id),
      ...r.moderators.map((m) => m.id),
    ])
  );
  const unassignedRegistrants = registrations.filter(
    (r) => !assignedUserIds.has(r.user.id)
  );

  async function reloadRooms() {
    try {
      const updated = await api.getRooms(sessionId);
      setRooms(updated);
    } catch (err: any) {
      setError(err.message);
    }
  }

  const handleRemoveMember = async (roomId: string, userId: string) => {
    setError('');
    setActionMsg('');
    try {
      await api.removeRoomMember(roomId, userId);
      await reloadRooms();
      setActionMsg('Member removed from room');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleMoveMember = async (targetRoomId: string) => {
    if (!movingMember) return;
    setError('');
    setActionMsg('');
    try {
      await api.moveRoomMember(
        movingMember.roomId,
        movingMember.user.id,
        targetRoomId
      );
      setMovingMember(null);
      await reloadRooms();
      setActionMsg('Member moved successfully');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddMember = async (roomId: string, userId: string) => {
    setError('');
    setActionMsg('');
    try {
      await api.addRoomMember(roomId, userId);
      setAddingToRoom(null);
      await reloadRooms();
      setActionMsg('Member added to room');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleExportCsv = async () => {
    setError('');
    try {
      await api.exportRoomsCsv(sessionId);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleExportPdf = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(13);
    doc.text('Breakout Room Assignments', pageWidth / 2, 12, { align: 'center' });
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Find your name and join the corresponding breakout room.', pageWidth / 2, 17, { align: 'center' });
    doc.setTextColor(0);

    const sortedRooms = [...rooms].sort((a, b) => a.roomIndex - b.roomIndex);
    const roomData = sortedRooms.map((room) => ({
      label: `Room ${room.roomIndex}`,
      names: [
        ...room.moderators.map((u) => u.fullName),
        ...room.members.map((u) => u.fullName),
      ],
    }));

    const mid = Math.ceil(roomData.length / 2);
    const leftCol = roomData.slice(0, mid);
    const rightCol = roomData.slice(mid);
    const maxRows = Math.max(
      leftCol.reduce((s, r) => s + r.names.length, 0),
      rightCol.reduce((s, r) => s + r.names.length, 0),
    );

    const buildRows = (col: typeof roomData) => {
      const rows: string[][] = [];
      for (const room of col) {
        room.names.forEach((name, i) => {
          rows.push([i === 0 ? room.label : '', name]);
        });
      }
      return rows;
    };

    const leftRows = buildRows(leftCol);
    const rightRows = buildRows(rightCol);
    while (leftRows.length < maxRows) leftRows.push(['', '']);
    while (rightRows.length < maxRows) rightRows.push(['', '']);

    const combined = leftRows.map((lr, i) => [
      lr[0], lr[1], rightRows[i][0], rightRows[i][1],
    ]);

    const colW = (pageWidth - 20) / 4;
    const roomColW = colW * 0.45;
    const nameColW = colW * 1.55;

    autoTable(doc, {
      startY: 21,
      head: [['Room', 'Participant', 'Room', 'Participant']],
      body: combined,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5, lineWidth: 0.2 },
      headStyles: { fillColor: [30, 58, 138], fontSize: 7.5, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: roomColW },
        1: { cellWidth: nameColW },
        2: { fontStyle: 'bold', cellWidth: roomColW },
        3: { cellWidth: nameColW },
      },
      margin: { left: 10, right: 10 },
    });

    doc.save('breakout-rooms.pdf');
  };

  return (
    <div className="mt-3">
      <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>
        Breakout Rooms
      </h3>

      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-end',
          marginBottom: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <div className="form-group" style={{ marginBottom: 0, maxWidth: 120 }}>
          <label>Room Size</label>
          <input
            type="number"
            min="2"
            max="10"
            value={roomSize}
            onChange={(e) => setRoomSize(Number(e.target.value))}
          />
        </div>
        <button className="btn btn-primary btn-sm" onClick={onGenerateRooms}>
          Generate Rooms
        </button>
        {rooms.length > 0 && (
          <>
            <button className="btn btn-secondary btn-sm" onClick={handleExportCsv}>
              Download CSV
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleExportPdf}>
              Download PDF
            </button>
          </>
        )}
      </div>

      {unassignedRegistrants.length > 0 && rooms.length > 0 && (
        <div className="card mb-2" style={{ background: '#fffbeb', borderLeft: '4px solid #f59e0b' }}>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>
            New Registrants ({unassignedRegistrants.length})
          </h4>
          <p className="text-muted text-sm mb-1">
            These registrants joined after rooms were generated. Use &quot;+ Add Member&quot; on a room to assign them.
          </p>
          <ul className="member-list">
            {unassignedRegistrants.map((reg) => (
              <li key={reg.user.id} className="text-sm" style={{ padding: '0.2rem 0' }}>
                {reg.user.fullName}
                <span className="text-muted" style={{ marginLeft: 6 }}>
                  {reg.user.email}
                </span>
                {reg.user.levelBucket && (
                  <span className="badge badge-open" style={{ marginLeft: 6 }}>
                    {reg.user.levelBucket}
                  </span>
                )}
                {reg.registeredAsModerator && (
                  <span
                    style={{
                      marginLeft: 6,
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px',
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: '#fff',
                      background: '#7c3aed',
                    }}
                  >
                    Moderator
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {rooms.length === 0 ? (
        <p className="text-muted text-sm">No rooms generated yet.</p>
      ) : (
        rooms.map((room) => (
          <div key={room.id} className="room-card">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem',
              }}
            >
              <h4 style={{ margin: 0 }}>
                Room {room.roomIndex}
                {(() => {
                  const bucket = getEffectiveRoomBucket(room);
                  return (
                    <>
                      <span
                        className="badge badge-open"
                        style={{ marginLeft: 8 }}
                      >
                        {bucket}
                      </span>
                      <span className="text-sm" style={{ marginLeft: 6, fontWeight: 500 }}>
                        {BUCKET_LABELS[bucket] || bucket}
                      </span>
                    </>
                  );
                })()}
                <span className="text-muted text-sm" style={{ marginLeft: 8 }}>
                  ({room.moderators.length + room.members.length} members)
                </span>
              </h4>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  setAddingToRoom(addingToRoom === room.id ? null : room.id)
                }
              >
                {addingToRoom === room.id ? 'Cancel Add' : '+ Add Member'}
              </button>
            </div>

            {room.moderators.length === 0 && (
              <p className="text-sm" style={{ marginBottom: '0.5rem', color: '#b45309' }}>
                Unmoderated
              </p>
            )}

            {addingToRoom === room.id && (
              <div
                className="card mb-1"
                style={{ background: '#f0fdf4', padding: '0.75rem' }}
              >
                <p
                  className="text-sm"
                  style={{ fontWeight: 600, marginBottom: '0.5rem' }}
                >
                  Add unassigned registrant:
                </p>
                {unassignedRegistrants.length === 0 ? (
                  <p className="text-muted text-sm">
                    All registrants are already assigned to rooms.
                  </p>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                    }}
                  >
                    {unassignedRegistrants.map((reg) => (
                      <div
                        key={reg.user.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.25rem 0',
                        }}
                      >
                        <span className="text-sm">
                          {reg.user.fullName}
                          <span className="text-muted" style={{ marginLeft: 4 }}>
                            {reg.user.levelBucket && `(${reg.user.levelBucket})`}
                          </span>
                        </span>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleAddMember(room.id, reg.user.id)}
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <ul className="member-list">
              {[
                ...room.moderators.map((m) => ({ ...m, _isModerator: true as const })),
                ...room.members.map((m) => ({ ...m, _isModerator: false as const })),
              ].map((m) => (
                <li
                  key={m.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.35rem 0',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  <span>
                    {m.fullName}
                    {m._isModerator && (
                      <span
                        style={{
                          marginLeft: 6,
                          padding: '0.1rem 0.4rem',
                          borderRadius: '4px',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: '#fff',
                          background: '#7c3aed',
                        }}
                      >
                        Moderator
                      </span>
                    )}
                    {m.englishLevelType && (
                      <span className="text-muted" style={{ marginLeft: 4 }}>
                        ({m.englishLevelType} {m.englishLevelValue})
                      </span>
                    )}
                    {m.levelBucket && (
                      <span
                        className="badge badge-open"
                        style={{ marginLeft: 6, fontSize: '0.7rem' }}
                      >
                        {m.levelBucket}
                      </span>
                    )}
                    {m.proficiencyLevel && (
                      <span className="text-muted text-sm" style={{ marginLeft: 6 }}>
                        {m.proficiencyLevel}
                        {m.proficiencyLevelOverride && ' *'}
                      </span>
                    )}
                  </span>
                  {!m._isModerator && (
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={movingMember !== null}
                        onClick={() =>
                          setMovingMember({ roomId: room.id, user: m })
                        }
                      >
                        Move
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRemoveMember(room.id, m.id)}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {movingMember && movingMember.roomId === room.id && (
              <div
                style={{
                  marginTop: '0.75rem',
                  padding: '0.75rem',
                  background: '#eff6ff',
                  border: '1px solid #93c5fd',
                  borderRadius: 'var(--radius)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span className="text-sm">
                    Moving <strong>{movingMember.user.fullName}</strong> — select target room:
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setMovingMember(null)}
                  >
                    Cancel
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {rooms
                    .filter((r) => r.id !== movingMember.roomId)
                    .map((r) => {
                      const bucket = getEffectiveRoomBucket(r);
                      return (
                        <button
                          key={r.id}
                          className="btn btn-primary btn-sm"
                          onClick={() => handleMoveMember(r.id)}
                        >
                          Room {r.roomIndex} ({BUCKET_LABELS[bucket] || bucket})
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        ))
      )}

    </div>
  );
}

const TEST_TYPE_LABELS: Record<string, string> = {
  IELTS: 'IELTS',
  TOEFL_IBT: 'TOEFL iBT',
  TOEFL_ITP: 'TOEFL ITP',
  DUOLINGO: 'Duolingo',
  CEFR: 'CEFR',
  OTHER: 'Other',
};

type UserSubTab = 'search' | 'no-shows' | 'blacklisted' | 'settings';

const SUB_TAB_LABELS: Record<UserSubTab, string> = {
  search: 'Search Users',
  'no-shows': 'No-Shows',
  blacklisted: 'Blacklisted',
  settings: 'Settings',
};

function ManageUsers({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [subTab, setSubTab] = useState<UserSubTab>('search');

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {(['search', 'no-shows', 'blacklisted', 'settings'] as UserSubTab[]).map((t) => (
          <button
            key={t}
            className={`btn btn-sm ${subTab === t ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSubTab(t)}
          >
            {SUB_TAB_LABELS[t]}
          </button>
        ))}
      </div>
      {subTab === 'search' && <UserSearch isSuperAdmin={isSuperAdmin} />}
      {subTab === 'no-shows' && <NoShowUsers isSuperAdmin={isSuperAdmin} />}
      {subTab === 'blacklisted' && <BlacklistedUsers isSuperAdmin={isSuperAdmin} />}
      {subTab === 'settings' && <AppSettings />}
    </div>
  );
}

function UserSearch({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setError('');
    setActionMsg('');
    setLoading(true);
    try {
      const users = await api.searchUsers(query.trim());
      setResults(users);
      setSearched(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOverrideUpdate = async (userId: string, level: string | null, userName: string) => {
    setError('');
    setActionMsg('');
    try {
      const updated = await api.updateProficiencyOverride(userId, level);
      setResults((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      setActionMsg(
        level
          ? `Proficiency level for ${userName} manually set to ${level}`
          : `Manual override cleared for ${userName} — level recalculated from test score`
      );
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div>
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email..."
          style={{
            flex: 1,
            padding: '0.5rem 0.75rem',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            fontSize: '0.875rem',
          }}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}
      {actionMsg && <div className="success-message">{actionMsg}</div>}

      {searched && results.length === 0 && (
        <p className="text-muted text-sm">No users found matching "{query}".</p>
      )}

      {results.map((user) => (
        <UserCard key={user.id} user={user} isSuperAdmin={isSuperAdmin} onOverrideUpdate={handleOverrideUpdate} onUserUpdate={(updated) => setResults((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))} />
      ))}
    </div>
  );
}

function NoShowUsers({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { loadNoShows(); }, []);

  async function loadNoShows() {
    setLoading(true);
    try {
      const data = await api.getNoShowUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div>
      {error && <div className="error-message">{error}</div>}

      {users.length === 0 ? (
        <p className="text-muted text-sm">No users with no-shows.</p>
      ) : (
        <>
          <p className="text-muted text-sm" style={{ marginBottom: '0.75rem' }}>
            {users.length} user{users.length !== 1 ? 's' : ''} with at least one no-show, sorted by count.
          </p>
          {users.map((u) => (
            <div
              key={u.id}
              className="card"
              style={{
                marginBottom: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div>
                <strong>{u.fullName}</strong>
                <span className="text-muted text-sm" style={{ marginLeft: 8 }}>{u.email}</span>
                {u.blacklistedUntil && (
                  <span className="badge badge-closed" style={{ marginLeft: 8 }}>
                    Blacklisted until {new Date(u.blacklistedUntil).toLocaleDateString()}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  color: (u.noShowCount ?? 0) >= 3 ? 'var(--danger)' : 'var(--text)',
                }}
              >
                {u.noShowCount} no-show{u.noShowCount !== 1 ? 's' : ''}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function BlacklistedUsers({ isSuperAdmin: _isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => { loadBlacklisted(); }, []);

  async function loadBlacklisted() {
    setLoading(true);
    try {
      const data = await api.getBlacklistedUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleWhitelist = async (userId: string, name: string) => {
    setError('');
    setActionMsg('');
    try {
      await api.whitelistUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setActionMsg(`${name} has been whitelisted (blacklist removed, no-show count reset)`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div>
      {error && <div className="error-message">{error}</div>}
      {actionMsg && <div className="success-message">{actionMsg}</div>}

      {users.length === 0 ? (
        <p className="text-muted text-sm">No blacklisted users.</p>
      ) : (
        users.map((u) => (
          <div key={u.id} className="card" style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <strong>{u.fullName}</strong>
              <span className="text-muted text-sm" style={{ marginLeft: 8 }}>{u.email}</span>
              <span className="badge badge-closed" style={{ marginLeft: 8 }}>
                Blacklisted until {new Date(u.blacklistedUntil!).toLocaleDateString()}
              </span>
              <span className="text-muted text-sm" style={{ marginLeft: 8 }}>
                No-shows: {u.noShowCount}
              </span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => handleWhitelist(u.id, u.fullName)}>
              Whitelist
            </button>
          </div>
        ))
      )}
    </div>
  );
}

function AppSettings() {
  const [maxNoShows, setMaxNoShows] = useState('3');
  const [blacklistDays, setBlacklistDays] = useState('30');
  const [unregisterCutoff, setUnregisterCutoff] = useState('24');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.getConfig().then((config) => {
      setMaxNoShows(config.max_no_shows || '3');
      setBlacklistDays(config.blacklist_duration_days || '30');
      setUnregisterCutoff(config.unregister_cutoff_hours || '24');
    }).catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await api.updateConfig({
        max_no_shows: maxNoShows,
        blacklist_duration_days: blacklistDays,
        unregister_cutoff_hours: unregisterCutoff,
      });
      setSuccess('Settings saved successfully');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-loading">Loading...</div>;

  return (
    <div className="card" style={{ maxWidth: '480px' }}>
      <h3 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>App Settings</h3>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      <form onSubmit={handleSave}>
        <div className="form-group">
          <label>Max no-shows before blacklist</label>
          <input type="number" min="1" value={maxNoShows} onChange={(e) => setMaxNoShows(e.target.value)} required />
          <span className="text-muted text-sm">Users who miss this many sessions without verifying attendance will be blacklisted.</span>
        </div>
        <div className="form-group">
          <label>Blacklist duration (days)</label>
          <input type="number" min="1" value={blacklistDays} onChange={(e) => setBlacklistDays(e.target.value)} required />
          <span className="text-muted text-sm">How long a blacklisted user is blocked from registering for sessions.</span>
        </div>
        <div className="form-group">
          <label>Unregister cutoff (hours)</label>
          <input type="number" min="0" value={unregisterCutoff} onChange={(e) => setUnregisterCutoff(e.target.value)} required />
          <span className="text-muted text-sm">Users cannot unregister within this many hours before a session starts. Set to 0 to allow anytime.</span>
        </div>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}

const ALL_ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'PARTICIPANT'];

function UserCard({
  user,
  isSuperAdmin,
  onOverrideUpdate,
  onUserUpdate,
}: {
  user: User;
  isSuperAdmin?: boolean;
  onOverrideUpdate: (userId: string, level: string | null, name: string) => void;
  onUserUpdate?: (user: User) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(user.proficiencyLevelOverride || '');
  const [saving, setSaving] = useState(false);

  const [editingRole, setEditingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>(user.role as Role);
  const [savingRole, setSavingRole] = useState(false);
  const [roleMsg, setRoleMsg] = useState('');

  const handleSave = async () => {
    setSaving(true);
    await onOverrideUpdate(user.id, selectedLevel || null, user.fullName);
    setSaving(false);
    setEditing(false);
  };

  const handleRoleSave = async () => {
    if (selectedRole === user.role) {
      setEditingRole(false);
      return;
    }
    const confirmed = window.confirm(
      `Are you sure you want to change ${user.fullName}'s role from ${user.role} to ${selectedRole}? This action will immediately change their permissions.`
    );
    if (!confirmed) return;
    setSavingRole(true);
    setRoleMsg('');
    try {
      const updated = await api.changeUserRole(user.id, selectedRole);
      onUserUpdate?.(updated);
      setRoleMsg(`Role changed to ${selectedRole}`);
      setEditingRole(false);
    } catch (err: any) {
      setRoleMsg(`Error: ${err.message}`);
    } finally {
      setSavingRole(false);
    }
  };

  const isManuallySet = !!user.proficiencyLevelOverride;
  const isBlacklisted = user.blacklistedUntil && new Date(user.blacklistedUntil) > new Date();

  return (
    <div className="card" style={{ marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <strong>{user.fullName}</strong>
          <span className="text-muted text-sm" style={{ marginLeft: 8 }}>{user.email}</span>
          <span className="badge badge-role" style={{ marginLeft: 8 }}>{user.role}</span>
          {isBlacklisted && (
            <span className="badge badge-closed" style={{ marginLeft: 8 }}>
              Blacklisted until {new Date(user.blacklistedUntil!).toLocaleDateString()}
            </span>
          )}
        </div>
        {isBlacklisted && (
          <button
            className="btn btn-primary btn-sm"
            onClick={async () => {
              try {
                const updated = await api.whitelistUser(user.id);
                onUserUpdate?.(updated);
              } catch { /* handled by parent */ }
            }}
          >
            Whitelist
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.25rem 1rem', marginTop: '0.75rem', fontSize: '0.875rem' }}>
        <span className="text-muted">English Test</span>
        <span>
          {user.englishLevelType
            ? `${TEST_TYPE_LABELS[user.englishLevelType] || user.englishLevelType} — ${user.englishLevelValue || 'N/A'}`
            : 'Not provided'}
        </span>

        <span className="text-muted">Level Bucket</span>
        <span>{user.levelBucket || '—'}</span>

        <span className="text-muted">Proficiency Level</span>
        <span>
          {user.proficiencyLevel || '—'}
          {isManuallySet && (
            <span
              className="badge badge-closed"
              style={{ marginLeft: 8, fontSize: '0.65rem' }}
            >
              Manually set by Admin
            </span>
          )}
        </span>

        {user.noShowCount != null && user.noShowCount > 0 && (
          <>
            <span className="text-muted">No-shows</span>
            <span>{user.noShowCount}</span>
          </>
        )}
      </div>

      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {!editing ? (
          <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedLevel(user.proficiencyLevelOverride || ''); setEditing(true); }}>
            Adjust Proficiency Level
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              style={{
                padding: '0.3rem 0.5rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                fontSize: '0.85rem',
              }}
            >
              <option value="">Auto (from test score)</option>
              {PROFICIENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        )}

        {isSuperAdmin && !editingRole && (
          <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedRole(user.role as Role); setEditingRole(true); setRoleMsg(''); }}>
            Change Role
          </button>
        )}
      </div>

      {isSuperAdmin && editingRole && (
        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as Role)}
            style={{
              padding: '0.3rem 0.5rem',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              fontSize: '0.85rem',
            }}
          >
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button className="btn btn-primary btn-sm" onClick={handleRoleSave} disabled={savingRole}>
            {savingRole ? 'Saving...' : 'Save Role'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setEditingRole(false)}>
            Cancel
          </button>
        </div>
      )}

      {roleMsg && (
        <div
          className={roleMsg.startsWith('Error') ? 'error-message' : 'success-message'}
          style={{ marginTop: '0.5rem' }}
        >
          {roleMsg}
        </div>
      )}
    </div>
  );
}
