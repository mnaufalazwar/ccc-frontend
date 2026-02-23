import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateTimeLong } from '../../utils/dateFormat';
import type { Session, Registration, Feedback, User as UserType } from '../../types';

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, refreshUser } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [myFeedback, setMyFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  // Attendance & registration
  const [myRegistration, setMyRegistration] = useState<Registration | null>(null);
  const [attendanceCode, setAttendanceCode] = useState('');
  const [attendanceMsg, setAttendanceMsg] = useState('');
  const [attendanceError, setAttendanceError] = useState('');
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceVerified, setAttendanceVerified] = useState(false);

  // Feedback form
  const [roomMembers, setRoomMembers] = useState<UserType[]>([]);
  const [feedbackByUser, setFeedbackByUser] = useState<Record<string, { rating: string; comment: string }>>({});
  const [sessionRating, setSessionRating] = useState('');
  const [sessionComment, setSessionComment] = useState('');
  const [sendAnonymous, setSendAnonymous] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [receivedFeedback, setReceivedFeedback] = useState<Feedback[]>([]);
  const [cutoffHours, setCutoffHours] = useState<number>(24);

  useEffect(() => {
    if (!id) return;
    loadData();
    api.getSessionConfig().then((c) => setCutoffHours(c.unregisterCutoffHours)).catch(() => {});
  }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const s = await api.getSession(id!);
      setSession(s);

      try {
        const regs = await api.getRegistrations(id!);
        setRegistrations(regs);
        setIsRegistered(regs.some((r) => r.user.id === user?.id));
      } catch {
        // User may not have admin access to registrations
        // Try to determine registration status via my-sessions
        try {
          const mySessions = await api.getMySessions();
          setIsRegistered(mySessions.some((ms) => ms.id === id));
        } catch {
          // ignore
        }
      }

      try {
        const myReg = await api.getMyRegistration(id!);
        setMyRegistration(myReg);
        setIsRegistered(true);
        if (myReg.attended === true) {
          setAttendanceVerified(true);
        }
        if (myReg.attended === false) {
          refreshUser();
        }
      } catch {
        // 404 = not registered
      }

      try {
        const fb = await api.getMyFeedback(id!);
        setMyFeedback(fb);
      } catch {
        // ignore
      }

      try {
        const members = await api.getMyRoomMembers(id!);
        setRoomMembers(members);
        const initial: Record<string, { rating: string; comment: string }> = {};
        members.forEach((m) => {
          initial[m.id] = { rating: '', comment: '' };
        });
        setFeedbackByUser(initial);
      } catch {
        // ignore
      }

      try {
        const received = await api.getReceivedFeedback(id!);
        setReceivedFeedback(received);
      } catch {
        // ignore
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleRegister = async (asModerator = false) => {
    setActionLoading(true);
    setError('');
    try {
      await api.registerForSession(id!, asModerator);
      setIsRegistered(true);
      setSession((prev) =>
        prev
          ? { ...prev, currentRegistrations: prev.currentRegistrations + 1 }
          : prev
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnregister = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to unregister? If the session fills up, you may not be able to register again.'
    );
    if (!confirmed) return;
    setActionLoading(true);
    setError('');
    try {
      await api.unregisterFromSession(id!);
      setIsRegistered(false);
      setMyRegistration(null);
      setSession((prev) =>
        prev
          ? { ...prev, currentRegistrations: prev.currentRegistrations - 1 }
          : prev
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const updateFeedbackField = (userId: string, field: 'rating' | 'comment', value: string) => {
    setFeedbackByUser((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: value },
    }));
  };

  const existingSessionFeedback = myFeedback.find((fb) => fb.toUser === null);

  const handleFeedbackSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFeedbackError('');
    setFeedbackSuccess('');
    setFeedbackSubmitting(true);

    const alreadyReviewedIds = new Set(
      myFeedback.filter((fb) => fb.toUser !== null).map((fb) => fb.toUser!.id)
    );
    const toSubmit = roomMembers.filter(
      (m) => !alreadyReviewedIds.has(m.id) && feedbackByUser[m.id]?.rating
    );

    const hasSessionFeedback = !existingSessionFeedback && sessionRating;
    if (toSubmit.length === 0 && !hasSessionFeedback) {
      setFeedbackError('Please provide a rating for at least one item.');
      setFeedbackSubmitting(false);
      return;
    }

    try {
      let count = 0;

      if (hasSessionFeedback) {
        await api.submitFeedback(id!, {
          rating: Number(sessionRating),
          text: sessionComment || '',
          anonymous: sendAnonymous,
        });
        count++;
      }

      for (const member of toSubmit) {
        const entry = feedbackByUser[member.id];
        await api.submitFeedback(id!, {
          toUserId: member.id,
          rating: entry.rating ? Number(entry.rating) : undefined,
          text: entry.comment || '',
          anonymous: sendAnonymous,
        });
        count++;
      }

      setFeedbackSuccess(`Feedback submitted successfully!`);
      const [fb, received] = await Promise.all([
        api.getMyFeedback(id!),
        api.getReceivedFeedback(id!),
      ]);
      setMyFeedback(fb);
      setReceivedFeedback(received);
      setSessionRating('');
      setSessionComment('');
      setSendAnonymous(false);
      setFeedbackByUser((prev) => {
        const next = { ...prev };
        toSubmit.forEach((m) => {
          next[m.id] = { rating: '', comment: '' };
        });
        return next;
      });
    } catch (err: any) {
      setFeedbackError(err.message);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  if (loading) return <div className="page-loading">Loading session...</div>;
  if (error && !session) return <div className="error-message">{error}</div>;
  if (!session) return <div className="error-message">Session not found</div>;

  const spotsLeft = session.maxParticipants - session.currentRegistrations;
  const isFull = spotsLeft <= 0;
  const canRegister = session.status === 'OPEN' && !isRegistered && !isFull;
  const msUntilSession = new Date(session.startDateTime).getTime() - Date.now();
  const withinCutoff = cutoffHours > 0 && msUntilSession < cutoffHours * 60 * 60 * 1000;
  const canUnregister = session.status === 'OPEN' && isRegistered;
  const sessionEnded = session.status === 'COMPLETED' || session.status === 'CLOSED';
  const showFeedback = sessionEnded && (!isRegistered || attendanceVerified);
  const showAttendance = session.status === 'COMPLETED' && isRegistered && !attendanceVerified;

  const handleVerifyAttendance = async (e: FormEvent) => {
    e.preventDefault();
    setAttendanceError('');
    setAttendanceMsg('');
    setAttendanceLoading(true);
    try {
      const res = await api.verifyAttendance(id!, attendanceCode);
      if (res.verified) {
        setAttendanceVerified(true);
        setAttendanceMsg('Attendance verified! Thank you for joining the session.');
      } else {
        setAttendanceError('Incorrect code. Please check the code announced by the admin and try again.');
      }
    } catch (err: any) {
      setAttendanceError(err.message);
    } finally {
      setAttendanceLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>{session.title}</h1>
        <span className={`badge badge-${session.status.toLowerCase()}`}>
          {session.status}
        </span>
      </div>

      {error && <div className="error-message">{error}</div>}

      {session.description && (
        <p style={{ color: '#4b5563', marginBottom: '0.75rem', lineHeight: 1.6 }}>
          {session.description}
        </p>
      )}

      <div className="card mb-2">
        <dl className="session-info">
          <dt>Date & Time</dt>
          <dd>
            {formatDateTimeLong(session.startDateTime)}
          </dd>
          <dt>Duration</dt>
          <dd>{session.durationMinutes} minutes</dd>
          <dt>Spots</dt>
          <dd>
            {session.currentRegistrations} / {session.maxParticipants}
            {isFull ? (
              <span style={{ color: 'var(--danger)', marginLeft: 8 }}>
                Full
              </span>
            ) : (
              <span style={{ color: 'var(--success)', marginLeft: 8 }}>
                {spotsLeft} left
              </span>
            )}
          </dd>
          <dt>Created By</dt>
          <dd>{session.createdBy.fullName}</dd>
        </dl>

        {session.zoomLink ? (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 'var(--radius)',
              marginBottom: '0.75rem',
            }}
          >
            <strong style={{ fontSize: '0.95rem' }}>Zoom Meeting</strong>
            <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.9rem' }}>
              <div>
                <span className="text-muted">Link: </span>
                <a href={session.zoomLink} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all' }}>
                  {session.zoomLink}
                </a>
              </div>
              {session.zoomMeetingId && (
                <div>
                  <span className="text-muted">Meeting ID: </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{session.zoomMeetingId}</span>
                </div>
              )}
              {session.zoomPassword && (
                <div>
                  <span className="text-muted">Password: </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{session.zoomPassword}</span>
                </div>
              )}
            </div>
          </div>
        ) : isRegistered && session.status !== 'COMPLETED' ? (
          <div
            style={{
              padding: '0.75rem 1rem',
              background: '#f9fafb',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              marginBottom: '0.75rem',
              fontSize: '0.9rem',
              color: '#6b7280',
            }}
          >
            <strong>Zoom Meeting</strong>
            <p style={{ margin: '0.35rem 0 0' }}>
              The Zoom meeting details will appear here once the admin shares them. Check back before the session starts!
            </p>
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {canRegister && (
            <>
              <button
                className="btn btn-primary"
                onClick={() => handleRegister(false)}
                disabled={actionLoading}
              >
                {actionLoading ? 'Registering...' : 'Register'}
              </button>
              {user && (user.role === 'MODERATOR' || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
                <button
                  className="btn btn-secondary"
                  onClick={() => handleRegister(true)}
                  disabled={actionLoading}
                  style={{
                    background: '#7c3aed',
                    color: '#fff',
                    borderColor: '#7c3aed',
                  }}
                >
                  {actionLoading ? 'Registering...' : 'Register as Moderator'}
                </button>
              )}
            </>
          )}
          {canUnregister && (
            withinCutoff ? (
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                Unregistration is closed (less than {cutoffHours} hours before session).
              </span>
            ) : (
              <button
                className="btn btn-danger"
                onClick={handleUnregister}
                disabled={actionLoading}
              >
                {actionLoading ? 'Unregistering...' : 'Unregister'}
              </button>
            )
          )}
          {isRegistered && (
            <span
              className="badge badge-open"
              style={{ alignSelf: 'center', fontSize: '0.85rem' }}
            >
              {myRegistration?.registeredAsModerator
                ? 'Registered as Moderator'
                : 'You are registered'}
            </span>
          )}
        </div>

        {isRegistered && !showFeedback && !showAttendance && (
          <div
            style={{
              marginTop: '0.75rem',
              padding: '0.75rem 1rem',
              backgroundColor: '#fff8e1',
              border: '1px solid #ffe082',
              borderRadius: 'var(--radius)',
              fontSize: '0.9rem',
              lineHeight: 1.5,
              color: '#6d4c00',
            }}
          >
            <strong>What to do:</strong> During the session, the host will share an attendance code. After the session ends, go to <strong>My Schedule</strong> in the top menu, find this session, and enter the code to verify your attendance.
            <br /><br />
            <strong>Why:</strong> Spots are limited and fill up fast. Unverified attendance counts as a no-show, and repeated no-shows may lead to a temporary suspension — so we can keep things fair for everyone waiting for a spot.
          </div>
        )}
      </div>

      {/* Attendance Verification */}
      {attendanceVerified && (
        <div className="success-message">
          Attendance verified! Thank you for joining the session.
        </div>
      )}
      {showAttendance && (
        <div className="card mb-2">
          <h3 style={{ fontSize: '1.05rem', marginBottom: '0.5rem' }}>
            Verify Your Attendance
          </h3>
          <p className="text-muted text-sm" style={{ marginBottom: '0.75rem' }}>
            Enter the attendance code announced by the admin at the end of the Zoom session.
          </p>
          {attendanceError && <div className="error-message">{attendanceError}</div>}
          {attendanceMsg && <div className="success-message">{attendanceMsg}</div>}
          <form onSubmit={handleVerifyAttendance} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={attendanceCode}
              onChange={(e) => setAttendanceCode(e.target.value)}
              placeholder="e.g. 42"
              required
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontSize: '1rem',
                letterSpacing: '0.15em',
                width: '80px',
                textAlign: 'center',
              }}
              maxLength={2}
            />
            <button className="btn btn-primary" type="submit" disabled={attendanceLoading}>
              {attendanceLoading ? 'Verifying...' : 'Verify'}
            </button>
          </form>
        </div>
      )}

      {/* No-show notification */}
      {myRegistration?.attended === false && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: 'var(--radius)',
            fontSize: '0.9rem',
            lineHeight: 1.5,
            color: '#991b1b',
            marginBottom: '0.75rem',
          }}
        >
          <strong>You were marked as a no-show for this session.</strong> Your attendance was not verified before the admin finalized attendance.
          {user?.noShowCount != null && user.noShowCount > 0 && (
            <span> You currently have <strong>{user.noShowCount} no-show{user.noShowCount !== 1 ? 's' : ''}</strong> on your record.</span>
          )}
        </div>
      )}

      {/* Registrations list (if admin loaded them) */}
      {registrations.length > 0 && (
        <div className="mt-3">
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.75rem' }}>
            Participants ({registrations.length})
          </h2>
          {registrations.map((r) => (
            <div key={r.id} className="card" style={{ padding: '0.75rem' }}>
              <strong>{r.user.fullName}</strong>
              <span className="text-muted text-sm" style={{ marginLeft: 8 }}>
                {r.user.englishLevelType
                  ? `${r.user.englishLevelType} ${r.user.englishLevelValue}`
                  : 'Level not set'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Feedback section */}
      {sessionEnded && (
        <div className="mt-3">
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.75rem' }}>
            Session Feedback
          </h2>

          {!showFeedback ? (
            <div
              className="card"
              style={{
                padding: '1rem',
                backgroundColor: '#f0f4ff',
                border: '1px solid #c7d2fe',
                color: '#3730a3',
              }}
            >
              Please verify your attendance above to unlock the feedback form. Your feedback helps us improve future sessions and match participants better.
            </div>
          ) : (
          <>
          {feedbackError && (
            <div className="error-message">{feedbackError}</div>
          )}
          {feedbackSuccess && (
            <div className="success-message">{feedbackSuccess}</div>
          )}

          <form onSubmit={handleFeedbackSubmit}>
            <p className="text-muted text-sm" style={{ marginBottom: '0.75rem' }}>
              <strong>1</strong> = Poor &middot; <strong>5</strong> = Excellent
            </p>

            {/* Overall session feedback */}
            <div
              className="card mb-2"
              style={{
                padding: '1rem',
                opacity: existingSessionFeedback ? 0.7 : 1,
                borderLeft: '3px solid var(--primary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '1rem' }}>Overall Session</strong>
                {existingSessionFeedback && (
                  <span className="badge badge-open" style={{ fontSize: '0.75rem' }}>
                    Reviewed ({existingSessionFeedback.rating}/5)
                  </span>
                )}
              </div>
              <p className="text-muted text-sm" style={{ marginBottom: '0.5rem' }}>
                How was the session overall? Topic, organization, experience, etc.
              </p>

              {existingSessionFeedback ? (
                <div>
                  {existingSessionFeedback.text && (
                    <p className="text-sm text-muted">{existingSessionFeedback.text}</p>
                  )}
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.5rem' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setSessionRating(String(star))}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 'var(--radius)',
                          border: sessionRating === String(star)
                            ? '2px solid var(--primary)'
                            : '1px solid var(--border)',
                          backgroundColor: sessionRating === String(star) ? 'var(--primary)' : 'white',
                          color: sessionRating === String(star) ? 'white' : 'var(--text)',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {star}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={sessionComment}
                    onChange={(e) => setSessionComment(e.target.value)}
                    placeholder="Any thoughts on the session? (optional)"
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      fontSize: '0.9rem',
                      resize: 'vertical',
                    }}
                  />
                </>
              )}
            </div>

            {/* Per-participant feedback */}
            {roomMembers.length > 0 && (
              <>
                <h3 style={{ fontSize: '1rem', margin: '1rem 0 0.5rem' }}>
                  Participants in Your Room
                </h3>

                {roomMembers.map((member) => {
                  const alreadyReviewed = myFeedback.find(
                    (fb) => fb.toUser !== null && fb.toUser.id === member.id
                  );
                  const entry = feedbackByUser[member.id] || { rating: '', comment: '' };

                  return (
                    <div
                      key={member.id}
                      className="card mb-2"
                      style={{
                        padding: '1rem',
                        opacity: alreadyReviewed ? 0.7 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <strong style={{ fontSize: '1rem' }}>{member.fullName}</strong>
                        {alreadyReviewed && (
                          <span
                            className="badge badge-open"
                            style={{ fontSize: '0.75rem' }}
                          >
                            Reviewed ({alreadyReviewed.rating}/5)
                          </span>
                        )}
                      </div>

                      {alreadyReviewed ? (
                        <div>
                          {alreadyReviewed.text && (
                            <p className="text-sm text-muted">{alreadyReviewed.text}</p>
                          )}
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.5rem' }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => updateFeedbackField(member.id, 'rating', String(star))}
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 'var(--radius)',
                                  border: entry.rating === String(star)
                                    ? '2px solid var(--primary)'
                                    : '1px solid var(--border)',
                                  backgroundColor: entry.rating === String(star) ? 'var(--primary)' : 'white',
                                  color: entry.rating === String(star) ? 'white' : 'var(--text)',
                                  fontWeight: 600,
                                  fontSize: '0.9rem',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s',
                                }}
                              >
                                {star}
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={entry.comment}
                            onChange={(e) => updateFeedbackField(member.id, 'comment', e.target.value)}
                            placeholder="Any comments? (optional)"
                            rows={2}
                            style={{
                              width: '100%',
                              padding: '0.5rem 0.75rem',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius)',
                              fontSize: '0.9rem',
                              resize: 'vertical',
                            }}
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {(!existingSessionFeedback ||
              roomMembers.some(
                (m) => !myFeedback.find((fb) => fb.toUser !== null && fb.toUser.id === m.id)
              )) && (
              <div style={{ marginTop: '0.75rem' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    marginBottom: '0.5rem',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={sendAnonymous}
                    onChange={(e) => setSendAnonymous(e.target.checked)}
                    style={{ width: 16, height: 16 }}
                  />
                  Submit anonymously
                  <span className="text-muted text-sm">&mdash; your name won't be shown to other participants</span>
                </label>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={feedbackSubmitting}
                >
                  {feedbackSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            )}
          </form>

          {/* Feedback received from others */}
          {receivedFeedback.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
                Feedback You Received
              </h3>
              {receivedFeedback.map((fb) => (
                <div key={fb.id} className="card mb-2" style={{ padding: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <strong style={{ fontSize: '0.9rem' }}>
                      {fb.anonymous || !fb.fromUser ? 'Anonymous' : fb.fromUser.fullName}
                    </strong>
                    {fb.rating && (
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        {fb.rating}/5
                      </span>
                    )}
                  </div>
                  {fb.text && <p className="text-sm" style={{ margin: '0.25rem 0 0' }}>{fb.text}</p>}
                </div>
              ))}
            </div>
          )}
          </>
          )}
        </div>
      )}
    </div>
  );
}
