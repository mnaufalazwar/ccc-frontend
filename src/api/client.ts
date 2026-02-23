import type {
  AuthResponse,
  User,
  Session,
  Registration,
  BreakoutRoom,
  Feedback,
  EnglishLevelHistory,
} from '../types';

const BASE_URL = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

function getRefreshToken(): string | null {
  return localStorage.getItem('refreshToken');
}

let isRefreshing = false;
let refreshPromise: Promise<AuthResponse> | null = null;

async function doRefresh(): Promise<AuthResponse> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token');

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    throw new Error('Refresh failed');
  }

  const data: AuthResponse = await res.json();
  localStorage.setItem('token', data.token);
  localStorage.setItem('refreshToken', data.refreshToken);
  return data;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && getRefreshToken()) {
    // Access token expired — try refreshing
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = doRefresh().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }

    try {
      await refreshPromise;
    } catch {
      window.dispatchEvent(new CustomEvent('auth:expired'));
      throw new Error('Session expired. Please log in again.');
    }

    // Retry original request with new token
    const newToken = getToken();
    if (newToken) headers['Authorization'] = `Bearer ${newToken}`;
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  }

  if (!res.ok) {
    if (res.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Auth
  register: (data: {
    fullName: string;
    email: string;
    password: string;
    englishLevelType?: string;
    englishLevelValue?: string;
  }) =>
    request<{ message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  refreshToken: (refreshToken: string) =>
    request<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  logout: (refreshToken: string) =>
    request<void>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  verifyEmail: (token: string) =>
    request<{ message: string }>(`/auth/verify-email?token=${encodeURIComponent(token)}`),

  resendVerification: (email: string) =>
    request<{ message: string }>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, newPassword: string) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/me/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  getMe: () => request<User>('/me'),

  updateMyEnglishLevel: (data: { englishLevelType: string; englishLevelValue?: string }) =>
    request<User>('/me/english-level', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getMySessions: () => request<Session[]>('/me/sessions'),

  // Sessions
  getSessionConfig: () => request<{ unregisterCutoffHours: number }>('/sessions/config'),

  getUpcomingSessions: () => request<Session[]>('/public/sessions/upcoming'),

  getOpenSessions: () => request<Session[]>('/sessions?status=OPEN'),

  getSession: (id: string) => request<Session>(`/sessions/${id}`),

  registerForSession: (id: string, asModerator = false) =>
    request<Registration>(`/sessions/${id}/register?asModerator=${asModerator}`, { method: 'POST' }),

  unregisterFromSession: (id: string) =>
    request<void>(`/sessions/${id}/register`, { method: 'DELETE' }),

  submitFeedback: (
    sessionId: string,
    data: { toUserId?: string; rating?: number; text: string; anonymous?: boolean }
  ) =>
    request<Feedback>(`/sessions/${sessionId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMyFeedback: (sessionId: string) =>
    request<Feedback[]>(`/sessions/${sessionId}/feedback/me`),

  getReceivedFeedback: (sessionId: string) =>
    request<Feedback[]>(`/sessions/${sessionId}/feedback/received`),

  getMyRegistration: (sessionId: string) =>
    request<Registration>(`/sessions/${sessionId}/my-registration`),

  getMyRoomMembers: (sessionId: string) =>
    request<User[]>(`/sessions/${sessionId}/my-room-members`),

  // Admin
  createSession: (data: {
    title: string;
    description?: string;
    startDateTime: string;
    durationMinutes: number;
    maxParticipants: number;
  }) =>
    request<Session>('/admin/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateSession: (
    id: string,
    data: Partial<{
      title: string;
      description: string;
      startDateTime: string;
      durationMinutes: number;
      maxParticipants: number;
      status: string;
      zoomLink: string;
      zoomMeetingId: string;
      zoomPassword: string;
    }>
  ) =>
    request<Session>(`/admin/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getAdminSessions: () => request<Session[]>('/admin/sessions'),

  getAdminSession: (sessionId: string) =>
    request<Session>(`/admin/sessions/${sessionId}`),

  getSessionFeedback: (sessionId: string) =>
    request<Feedback[]>(`/admin/sessions/${sessionId}/feedback`),

  getRegistrations: (sessionId: string) =>
    request<Registration[]>(`/admin/sessions/${sessionId}/registrations`),

  generateRooms: (sessionId: string, roomSize: number = 4) =>
    request<BreakoutRoom[]>(
      `/admin/sessions/${sessionId}/generate-rooms?roomSize=${roomSize}`,
      { method: 'POST' }
    ),

  getRooms: (sessionId: string) =>
    request<BreakoutRoom[]>(`/admin/sessions/${sessionId}/rooms`),

  addRoomMember: (roomId: string, userId: string) =>
    request<BreakoutRoom>(`/admin/rooms/${roomId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  removeRoomMember: (roomId: string, userId: string) =>
    request<BreakoutRoom>(`/admin/rooms/${roomId}/members/${userId}`, {
      method: 'DELETE',
    }),

  moveRoomMember: (roomId: string, userId: string, targetRoomId: string) =>
    request<BreakoutRoom[]>(`/admin/rooms/${roomId}/members/${userId}/move`, {
      method: 'POST',
      body: JSON.stringify({ targetRoomId }),
    }),

  searchUsers: (email: string) =>
    request<User[]>(`/admin/users/search?email=${encodeURIComponent(email)}`),

  updateProficiencyOverride: (userId: string, proficiencyLevel: string | null) =>
    request<User>(`/admin/users/${userId}/proficiency-level`, {
      method: 'PATCH',
      body: JSON.stringify({ proficiencyLevel }),
    }),

  exportRoomsCsv: async (sessionId: string): Promise<void> => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE_URL}/admin/sessions/${sessionId}/rooms/export`, { headers });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Export failed' }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'breakout-rooms.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  verifyAttendance: (sessionId: string, attendanceCode: string) =>
    request<{ verified: boolean }>(`/sessions/${sessionId}/verify-attendance`, {
      method: 'POST',
      body: JSON.stringify({ attendanceCode }),
    }),

  finalizeAttendance: (sessionId: string) =>
    request<void>(`/admin/sessions/${sessionId}/finalize-attendance`, {
      method: 'POST',
    }),

  getEmailPreview: (sessionId: string) =>
    request<{ subject: string; body: string; recipientCount: number }>(
      `/admin/sessions/${sessionId}/email-preview`
    ),

  sendSessionEmail: (sessionId: string, data: { subject: string; body: string }) =>
    request<{ sent: number }>(`/admin/sessions/${sessionId}/send-email`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getConfig: () => request<Record<string, string>>('/admin/config'),

  updateConfig: (updates: Record<string, string>) =>
    request<void>('/admin/config', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  getNoShowUsers: () => request<User[]>('/admin/users/no-shows'),

  getBlacklistedUsers: () => request<User[]>('/admin/users/blacklisted'),

  whitelistUser: (userId: string) =>
    request<User>(`/admin/users/${userId}/whitelist`, { method: 'POST' }),

  // Moderator
  updateEnglishLevel: (
    userId: string,
    data: { englishLevelType: string; englishLevelValue: string; reason?: string }
  ) =>
    request<User>(`/moderator/users/${userId}/english-level`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getLevelHistory: (userId: string) =>
    request<EnglishLevelHistory[]>(
      `/moderator/users/${userId}/english-level-history`
    ),

  getModeratorSessions: () => request<Session[]>('/moderator/my-sessions'),

  getModeratorRooms: (sessionId: string) =>
    request<BreakoutRoom[]>(`/moderator/sessions/${sessionId}/rooms`),

  // SuperAdmin
  changeUserRole: (userId: string, role: string) =>
    request<User>(`/superadmin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
};
