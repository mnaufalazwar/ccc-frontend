export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'PARTICIPANT';
export type EnglishLevelType = 'IELTS' | 'TOEFL_IBT' | 'TOEFL_ITP' | 'DUOLINGO' | 'CEFR' | 'OTHER';
export type SessionStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'COMPLETED';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  englishLevelType: EnglishLevelType | null;
  englishLevelValue: string | null;
  levelBucket: string | null;
  proficiencyLevel: string | null;
  proficiencyLevelOverride: string | null;
  noShowCount: number | null;
  blacklistedUntil: string | null;
  createdAt: string;
}

export interface Session {
  id: string;
  title: string;
  description: string | null;
  startDateTime: string;
  durationMinutes: number;
  maxParticipants: number;
  status: SessionStatus;
  currentRegistrations: number;
  createdBy: User;
  attendanceCode: string | null;
  zoomLink: string | null;
  zoomMeetingId: string | null;
  zoomPassword: string | null;
  createdAt: string;
}

export interface Registration {
  id: string;
  user: User;
  attended: boolean | null;
  registeredAsModerator: boolean;
  createdAt: string;
}

export interface BreakoutRoom {
  id: string;
  levelBucket: string;
  roomIndex: number;
  moderators: User[];
  members: User[];
}

export interface Feedback {
  id: string;
  fromUser: User | null;
  toUser: User | null;
  rating: number | null;
  text: string;
  anonymous: boolean;
  createdAt: string;
}

export interface EnglishLevelHistory {
  id: string;
  previousLevelType: EnglishLevelType;
  previousLevelValue: string;
  newLevelType: EnglishLevelType;
  newLevelValue: string;
  changedBy: User;
  reason: string | null;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}
