import { useState, useCallback } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { communityApi } from "../../../community/api";
import { toFeedPost, mapRawPost } from "../../../community/utils";
import { useUserStore } from "../../../../store/useUserStore";
import type { FeedPost as FeedPostType } from "../../../../types/community";
import ProfilePostGrid from "../ProfilePostGrid";

interface PostsSectionProps {
  userId?: string;
  styles?: any; // kept for backward compat but unused now
}

export default function PostsSection({ userId }: PostsSectionProps) {
  const router = useRouter();
  const currentUserId = useUserStore((s) => s.user?.id);
  const [posts, setPosts] = useState<FeedPostType[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const raw = userId
        ? await communityApi.getUserPosts(userId)
        : await communityApi.getMyPosts();
      setPosts((raw ?? []).map((d: any) => toFeedPost(mapRawPost(d))));
    } catch (e) {
      console.warn("PostsSection load error:", e);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Refetch on screen focus (e.g. returning from post creation)
  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [loadPosts])
  );

  const onPressPost = useCallback(
    (post: FeedPostType) => {
      router.push({
        pathname: "/community/user-posts",
        params: { userId: userId ?? currentUserId, initialPostId: post.id },
      } as any);
    },
    [router, userId, currentUserId]
  );

  return (
    <View>
      <ProfilePostGrid posts={posts} onPressPost={onPressPost} loading={loading} />
    </View>
  );
}
