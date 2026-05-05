export interface Session {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // ISO datetime
  endTime: string | null;
  durationMinutes: number | null;
  // B2: minutes spent in status="active" (excludes paused). Authoritative
  // training time; durationMinutes stays as wall-clock for back-compat.
  activeDurationMinutes: number | null;
  pausedAt: string | null;
  lastActivityAt: string | null;
  locationType: 'gym' | 'outdoor';
  gymId: string | null;
  gymName: string | null;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  notes: string | null;
  summary: SessionSummary | null;
  planId: string | null;
  planSessionId: string | null;
  createdAt: string;
}

export interface SessionSummary {
  totalSends: number;
  totalAttempts: number;
  bestGrade: string;
  logCount: number;
}
