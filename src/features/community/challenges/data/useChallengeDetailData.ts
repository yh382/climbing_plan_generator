import { useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";

import {
  MOCK_CHALLENGES_DETAIL,
  MOCK_LEADERBOARD,
  MOCK_GALLERY,
  type ChallengeDetail,
  type RankingUser,
  type GalleryItem,
} from "./mockChallengeDetail";

export type PeopleFilter = "all" | "following";
export type GenderFilter = "all" | "male" | "female";

export function useChallengeDetailData(): {
  challenge: ChallengeDetail;
  leaderboard: RankingUser[];
  gallery: GalleryItem[];

  peopleFilter: PeopleFilter;
  genderFilter: GenderFilter;
  setPeopleFilter: (v: PeopleFilter) => void;
  setGenderFilter: (v: GenderFilter) => void;
} {
  const params = useLocalSearchParams<{ challengeId?: string }>();

  const challenge = useMemo(() => {
    const byId = params.challengeId
      ? MOCK_CHALLENGES_DETAIL.find((c) => c.id === params.challengeId)
      : undefined;
    return byId ?? MOCK_CHALLENGES_DETAIL[0];
  }, [params.challengeId]);

  const [peopleFilter, setPeopleFilter] = useState<PeopleFilter>("all");
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");

  const leaderboard = useMemo(() => {
    let list = MOCK_LEADERBOARD;

    if (peopleFilter === "following") list = list.filter((u) => u.isFollowing);
    if (genderFilter !== "all") list = list.filter((u) => u.gender === genderFilter);

    return [...list].sort((a, b) => b.points - a.points);
  }, [peopleFilter, genderFilter]);

  return {
    challenge,
    leaderboard,
    gallery: MOCK_GALLERY,

    peopleFilter,
    genderFilter,
    setPeopleFilter,
    setGenderFilter,
  };
}
