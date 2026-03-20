import { useEffect, useState, useCallback } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { communityApi } from "../../../community/api";
import type { UserPostOut } from "../../../community/types";
import type { FeedPost as FeedPostType } from "../../../../types/community";
import ProfilePostGrid from "../ProfilePostGrid";

function toFeedPost(p: UserPostOut): FeedPostType {
  return {
    id: p.id,
    user: {
      id: p.userId,
      username: p.authorName ?? "",
      avatar: p.authorAvatar ?? "",
    },
    timestamp: p.createdAt,
    content: p.contentText ?? "",
    images: p.media?.filter((m) => m.type === "image").map((m) => m.url) ?? [],
    attachment: p.attachmentType
      ? {
          type: p.attachmentType as any,
          id: p.attachmentId ?? "",
          title: p.attachmentMeta?.title ?? "",
          subtitle: p.attachmentMeta?.subtitle ?? "",
        }
      : undefined,
    likes: p.likeCount,
    comments: p.commentCount,
    isLiked: p.isLiked,
    isSaved: p.isSaved,
  };
}

interface PostsSectionProps {
  userId?: string;
  styles?: any; // kept for backward compat but unused now
}

export default function PostsSection({ userId }: PostsSectionProps) {
  const router = useRouter();
  const [posts, setPosts] = useState<FeedPostType[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const raw = userId
        ? await communityApi.getUserPosts(userId)
        : await communityApi.getMyPosts();
      setPosts((raw ?? []).map(toFeedPost));
    } catch (e) {
      console.warn("PostsSection load error:", e);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const onPressPost = useCallback(
    (post: FeedPostType) => {
      router.push(`/community/post/${post.id}` as any);
    },
    [router]
  );

  return (
    <View>
      <ProfilePostGrid posts={posts} onPressPost={onPressPost} loading={loading} />
    </View>
  );
}
