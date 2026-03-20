export interface Session {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // ISO datetime
  endTime: string | null;
  durationMinutes: number | null;
  locationType: 'gym' | 'outdoor';
  gymId: string | null;
  gymName: string | null;
  status: 'active' | 'completed' | 'abandoned';
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
