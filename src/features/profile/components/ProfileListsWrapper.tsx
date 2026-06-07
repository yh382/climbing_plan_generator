// src/features/profile/components/ProfileListsWrapper.tsx
// Window BX — Profile Fixed Chrome. Protocol-conversion layer that gives the
// outdoor ListsSection a ProfileChromePageHandle-compatible scroller without
// touching the outdoor module itself.
//
// Why a wrapper (not just ListsSection's `inScrollView` prop): `inScrollView`
// only tells ListsSection to render plain Views instead of its own FlatList
// (Phase 0 verified — in that mode it has NO internal scroll handler, list,
// or RefreshControl). It does NOT expose the four reanimated handles
// (scrollRef / scrollHandler / contentInsetTop / contentInsetBottom) that
// ProfileChromeRoot drives the hero collapse from. This wrapper owns the
// Animated.ScrollView and mounts ListsSection inside it with inScrollView.

import React from "react";
import { StyleSheet } from "react-native";
import Animated from "react-native-reanimated";

import { useThemeColors } from "@/lib/useThemeColors";
import ListsSection from "@/features/outdoor/components/ListsSection";
import type { ProfileChromePageHandle } from "./ProfileChromeRoot.types";

type Props = {
  pageHandle: ProfileChromePageHandle;
  /** Forwarded to ListsSection: present = view that user's public lists. */
  userId?: string;
  /** Forwarded to ListsSection: show the Create-list row (self only). */
  showCreate?: boolean;
  contentPaddingHorizontal?: number;
};

export default function ProfileListsWrapper({
  pageHandle,
  userId,
  showCreate,
  contentPaddingHorizontal = 16,
}: Props) {
  const colors = useThemeColors();

  return (
    <Animated.ScrollView
      ref={pageHandle.scrollRef}
      onScroll={pageHandle.scrollHandler}
      scrollEventThrottle={1}
      showsVerticalScrollIndicator={false}
      style={[styles.scroller, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: pageHandle.contentInsetTop,
        paddingBottom: pageHandle.contentInsetBottom,
      }}
    >
      <ListsSection
        userId={userId}
        showCreate={showCreate}
        contentPaddingHorizontal={contentPaddingHorizontal}
        inScrollView
      />
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  scroller: { flex: 1 },
});
