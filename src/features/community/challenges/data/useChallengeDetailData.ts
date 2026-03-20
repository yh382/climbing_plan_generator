import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocalSearchParams } from "expo-router";
import { challengeApi } from "../api";
import type { ChallengeOut, ChallengeLeaderboardEntry } from "../types";

export type PeopleFilter = "all" | "following";
export type GenderFilter = "all" | "male" | "female";

export function useChallengeDetailData() {
  const params = useLocalSearchParams<{ challengeId?: string }>();
  const challengeId = params.challengeId;

  const [challenge, setChallenge] = useState<ChallengeOut | null>(null);
  const [leaderboard, setLeaderboard] = useState<ChallengeLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);

  const [peopleFilter, setPeopleFilter] = useState<PeopleFilter>("all");
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");

  // Fetch challenge detail + leaderboard
  useEffect(() => {
    if (!challengeId) return;
    setLoading(true);

    Promise.all([
      challengeApi.getDetail(challengeId),
      challengeApi.getLeaderboard(challengeId),
    ]).then(([c, lb]) => {
      setChallenge(c);
      setJoined(c.isJoined);
      setLeaderboard(lb);
    }).finally(() => setLoading(false));
  }, [challengeId]);

  // Join / Leave
  const onToggleJoin = useCallback(async () => {
    if (!challengeId) return;
    if (joined) {
      await challengeApi.leave(challengeId);
      setJoined(false);
    } else {
      await challengeApi.join(challengeId);
      setJoined(true);
    }
  }, [challengeId, joined]);

  // Filtered leaderboard (client-side placeholder for future gender/people filter)
  const filteredLeaderboard = useMemo(() => {
    return leaderboard;
  }, [leaderboard]);

  return {
    challenge,
    leaderboard: filteredLeaderboard,
    loading,
    joined,
    onToggleJoin,
    peopleFilter,
    genderFilter,
    setPeopleFilter,
    setGenderFilter,
  };
}
