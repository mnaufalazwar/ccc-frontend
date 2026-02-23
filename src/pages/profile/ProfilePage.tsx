import { useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/client';
import { formatDate } from '../../utils/dateFormat';
import type { EnglishLevelType } from '../../types';

const TEST_TYPE_LABELS: Record<string, string> = {
  IELTS: 'IELTS',
  TOEFL_IBT: 'TOEFL iBT',
  TOEFL_ITP: 'TOEFL ITP',
  DUOLINGO: 'Duolingo',
  CEFR: 'CEFR',
  OTHER: 'Other',
};

const LEVEL_TYPES: { value: EnglishLevelType; label: string }[] = [
  { value: 'IELTS', label: 'IELTS' },
  { value: 'TOEFL_IBT', label: 'TOEFL iBT' },
  { value: 'TOEFL_ITP', label: 'TOEFL ITP' },
  { value: 'DUOLINGO', label: 'Duolingo' },
  { value: 'CEFR', label: 'CEFR' },
  { value: 'OTHER', label: 'Other' },
];

const LEVEL_VALUE_PLACEHOLDER: Record<string, string> = {
  IELTS: 'e.g. 6.5 (range 0–9)',
  TOEFL_IBT: 'e.g. 90 (range 0–120)',
  TOEFL_ITP: 'e.g. 500 (range 310–677)',
  DUOLINGO: 'e.g. 115 (range 10–160)',
  CEFR: 'e.g. B2 (A1, A2, B1, B2, C1, C2)',
  OTHER: 'e.g. Intermediate',
};

const LEVEL_VALUE_LABEL: Record<string, string> = {
  IELTS: 'IELTS Band Score',
  TOEFL_IBT: 'TOEFL iBT Score',
  TOEFL_ITP: 'TOEFL ITP Score',
  DUOLINGO: 'Duolingo Score',
  CEFR: 'CEFR Level',
  OTHER: 'Score / Level',
};

export default function ProfilePage() {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [levelType, setLevelType] = useState(user?.englishLevelType || '');
  const [levelValue, setLevelValue] = useState(user?.englishLevelValue || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  if (!user) return null;

  const showAdminFields = isAdmin || isSuperAdmin;

  const startEditing = () => {
    setFullName(user.fullName);
    setLevelType(user.englishLevelType || '');
    setLevelValue(user.englishLevelValue || '');
    setError('');
    setSuccess('');
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setError('');
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }

    setPwSaving(true);
    try {
      const res = await api.changePassword(currentPassword, newPassword);
      setPwSuccess(res.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (err: any) {
      setPwError(err.message || 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await api.updateMyEnglishLevel({
        englishLevelType: levelType,
        ...(levelValue ? { englishLevelValue: levelValue } : {}),
      });
      setSuccess('Profile updated successfully');
      setEditing(false);
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>My Profile</h1>
        {!editing && (
          <button className="btn btn-secondary btn-sm" onClick={startEditing}>
            Edit Profile
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {editing ? (
        <div className="card">
          <form onSubmit={handleSave}>
            <dl className="profile-grid">
              <dt style={{ color: 'var(--text-muted)' }}>Full Name</dt>
              <dd style={{ color: 'var(--text-muted)' }}>{user.fullName}</dd>

              <dt style={{ color: 'var(--text-muted)' }}>Email</dt>
              <dd style={{ color: 'var(--text-muted)' }}>{user.email}</dd>

              <dt style={{ color: 'var(--text-muted)' }}>Role</dt>
              <dd style={{ color: 'var(--text-muted)' }}>
                <span className="badge badge-role">{user.role}</span>
              </dd>
            </dl>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0.75rem 0' }} />

            <dl className="profile-grid">
              <dt>English Proficiency Test</dt>
              <dd>
                <select
                  value={levelType}
                  onChange={(e) => {
                    setLevelType(e.target.value);
                    setLevelValue('');
                  }}
                  style={{ width: '100%' }}
                >
                  <option value="">-- Select test type --</option>
                  {LEVEL_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </dd>

              {levelType && (
                <>
                  <dt>{LEVEL_VALUE_LABEL[levelType] || 'Score'}</dt>
                  <dd>
                    <input
                      type="text"
                      value={levelValue}
                      onChange={(e) => setLevelValue(e.target.value)}
                      placeholder={LEVEL_VALUE_PLACEHOLDER[levelType] || 'Your score'}
                      style={{ width: '100%' }}
                    />
                  </dd>
                </>
              )}
            </dl>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={cancelEditing}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="card">
          <dl className="profile-grid">
            <dt>Full Name</dt>
            <dd>{user.fullName}</dd>

            <dt>Email</dt>
            <dd>{user.email}</dd>

            <dt>Role</dt>
            <dd>
              <span className="badge badge-role">{user.role}</span>
            </dd>

            <dt>English Level Type</dt>
            <dd>{user.englishLevelType ? (TEST_TYPE_LABELS[user.englishLevelType] || user.englishLevelType) : '—'}</dd>

            <dt>English Level Value</dt>
            <dd>{user.englishLevelValue || '—'}</dd>

            {showAdminFields && (
              <>
                <dt>Level Bucket</dt>
                <dd>{user.levelBucket || '—'}</dd>

                <dt>Proficiency Level</dt>
                <dd>
                  {user.proficiencyLevel || '—'}
                  {user.proficiencyLevelOverride && (
                    <span className="badge badge-closed" style={{ marginLeft: 8, fontSize: '0.7rem' }}>
                      Override: {user.proficiencyLevelOverride}
                    </span>
                  )}
                </dd>
              </>
            )}

            {user.noShowCount != null && user.noShowCount > 0 && (
              <>
                <dt>No-Shows</dt>
                <dd>
                  <span
                    style={{
                      fontWeight: 600,
                      color: user.noShowCount >= 3 ? 'var(--danger)' : '#b45309',
                    }}
                  >
                    {user.noShowCount}
                  </span>
                  {user.blacklistedUntil && new Date(user.blacklistedUntil) > new Date() && (
                    <span className="badge badge-closed" style={{ marginLeft: 8, fontSize: '0.7rem' }}>
                      Suspended until {formatDate(user.blacklistedUntil)}
                    </span>
                  )}
                </dd>
              </>
            )}

            <dt>Member Since</dt>
            <dd>{formatDate(user.createdAt)}</dd>
          </dl>
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>Security</h2>
        {pwSuccess && <div className="success-message">{pwSuccess}</div>}
        {pwError && <div className="error-message">{pwError}</div>}

        {!showPasswordForm ? (
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { setShowPasswordForm(true); setPwError(''); setPwSuccess(''); }}
          >
            Change Password
          </button>
        ) : (
          <div className="card">
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label htmlFor="currentPassword">Current Password</label>
                <input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="Enter current password"
                />
              </div>
              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Re-enter new password"
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button type="submit" className="btn btn-primary btn-sm" disabled={pwSaving}>
                  {pwSaving ? 'Saving...' : 'Update Password'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPwError('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
