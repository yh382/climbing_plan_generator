// Challenge types matching backend schemas (camelCase)
import { sanitizeImageUrl } from '../../../lib/imageUtils';

export interface ChallengePublisher {
  type: string;
  id: string;
  name: string;
  orgType?: string;
  logoUrl?: string;
  avatarUrl?: string;
  verified: boolean;
}

export interface ChallengeOut {
  id: string;
  publisherOrgId: string;
  publisher: ChallengePublisher;
  title: string;
  coverUrl?: string;
  description?: string;
  startAt: string;     // ISO datetime
  endAt?: string;
  ruleType: string;
  rulePayload?: Record<string, any>;
  rewardPayload?: Record<string, any>;
  challengeKind?: string;
  discipline?: string;
  venueType?: string;
  highlights?: string[];
  category: string;    // monthly | skill | lifetime | special | custom
  status: string;      // published | draft | archived | scheduled
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  likeCount: number;
  saveCount: number;
  engagementScore: number;
  participantCount: number;
  isJoined: boolean;
}

export interface ChallengeLeaderboardEntry {
  userId: string;
  username?: string;
  avatarUrl?: string;
  rank: number;
  score: number;
  meta?: Record<string, any>;
}

// Compute challenge UI status from dates
export type ChallengeUIStatus = 'active' | 'upcoming' | 'past';

export function getChallengeStatus(c: ChallengeOut): ChallengeUIStatus {
  const now = new Date();
  const start = new Date(c.startAt);
  const end = c.endAt ? new Date(c.endAt) : null;
  if (end && end < now) return 'past';
  if (start > now) return 'upcoming';
  return 'active';
}

/** Map raw backend snake_case → camelCase ChallengeOut */
export function mapRawChallenge(d: any): ChallengeOut {
  // publisher is already camelCase from backend (PublisherOut fields are camelCase)
  return {
    id: d.id,
    publisherOrgId: d.publisher_org_id,
    publisher: d.publisher,
    title: d.title,
    coverUrl: d.cover_url,
    description: d.description,
    startAt: d.start_at,
    endAt: d.end_at,
    ruleType: d.rule_type,
    rulePayload: d.rule_payload,
    rewardPayload: d.reward_payload,
    challengeKind: d.challenge_kind,
    discipline: d.discipline,
    venueType: d.venue_type,
    highlights: d.highlights,
    category: d.category ?? 'custom',
    status: d.status,
    publishedAt: d.published_at,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
    viewCount: d.view_count ?? 0,
    likeCount: d.like_count ?? 0,
    saveCount: d.save_count ?? 0,
    engagementScore: d.engagement_score ?? 0,
    participantCount: d.participant_count ?? 0,
    isJoined: d.is_joined ?? false,
  };
}

/** Map raw backend snake_case → camelCase ChallengeLeaderboardEntry */
export function mapRawLeaderboardEntry(d: any): ChallengeLeaderboardEntry {
  return {
    userId: d.user_id,
    username: d.username,
    avatarUrl: sanitizeImageUrl(d.avatar_url) ?? undefined,
    rank: d.rank,
    score: d.score,
    meta: d.meta,
  };
}
