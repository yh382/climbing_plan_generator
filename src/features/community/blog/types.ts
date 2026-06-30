// Climber-facing blog (P2-G). Backend /blog is public-read.
export interface BlogPublisher {
  name?: string | null;
  avatar_url?: string | null;
}

export interface BlogListItem {
  id: string;
  title: string;
  cover_url?: string | null;
  published_at?: string | null;
  publisher?: BlogPublisher | null;
  like_count: number;
}

export interface BlogDetail extends BlogListItem {
  content_markdown?: string | null;
  save_count: number;
  is_liked: boolean;
  is_saved: boolean;
}
