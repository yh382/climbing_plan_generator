// Event types matching backend schemas
// EventOut fields are snake_case (from Pydantic EventOut)
// PublisherOut fields are camelCase (defined that way in backend)

import type { EventDetailModel } from './data/types';

export interface EventPublisher {
  type: string;
  id: string;
  name: string;
  orgType?: string;
  logoUrl?: string;
  avatarUrl?: string;
  verified: boolean;
}

export interface EventOut {
  id: string;
  publisher_org_id: string;
  publisher: EventPublisher;
  title: string;
  cover_url?: string;
  category: string;        // competition | meetup | training | route_setting | youth | community
  venue_type?: string;     // indoor | outdoor
  discipline?: string;     // boulder | rope | mixed
  description?: string;
  start_at: string;        // ISO datetime
  end_at?: string;
  location_text?: string;
  lat?: number;
  lng?: number;
  registration_url?: string;
  highlights?: string[];
  prize_pool?: Record<string, any>;
  registration_stats?: Record<string, any>;
  registration_stats_updated_at?: string;
  status: string;
  published_at?: string;
  scheduled_publish_at?: string;
  created_at: string;
  updated_at: string;
  view_count: number;
  like_count: number;
  save_count: number;
  engagement_score: number;
  registration_count: number;
  is_registered: boolean;
}

/** Convert EventOut → EventDetailModel for detail screen UI layer */
export function eventOutToDetailModel(e: EventOut): EventDetailModel {
  return {
    id: e.id,
    title: e.title,
    organizerName: e.publisher.name,
    coverImage: e.cover_url ? { uri: e.cover_url } : undefined,
    tags: [e.category, e.venue_type, e.discipline].filter(Boolean) as string[],
    startDateISO: e.start_at,
    endDateISO: e.end_at,
    locationName: e.location_text,
    rewardsLine: e.highlights?.join(' · '),
    description: e.description,
    display: {
      showDate: true,
      showTime: !!e.end_at,
      showLocation: !!e.location_text,
      showRewards: !!e.highlights?.length,
    },
    cards: [],
  };
}
