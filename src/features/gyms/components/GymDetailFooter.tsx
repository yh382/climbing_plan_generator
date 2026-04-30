// src/features/gyms/components/GymDetailFooter.tsx
// Glass-union footer for the gym POI sheet. Mirrors the Apple Maps
// `+, ⭐, ⋯` cluster — three SF Symbol buttons fused into one liquid
// glass capsule via `glassEffectUnion`. Mounted via TrueSheet.footer
// so iOS pins it outside the scrollable area in every detent.
//
// Owns its own favorite state (independent from GymDetailCard, which
// no longer renders a Favorite button — Favorite was moved here).

import { useCallback } from 'react';
import { Share } from 'react-native';

import type { GymPlace } from '../../../../lib/poi/types';
import {
  PlaceSheetFooter,
  type PlaceSheetFooterAction,
} from '../../../components/shared/placeSheet';
import { useGymFavoriteToggle } from '../hooks';

interface Props {
  gym: GymPlace;
  /** Internal gym_id resolved by GymDetailCard via ensureGym. Until
   *  this lands, Favorite stays disabled. Share doesn't depend on it. */
  gymId: string | null;
}

export function GymDetailFooter({ gym, gymId }: Props) {
  const {
    isFavorited,
    toggle: toggleFavorite,
    loaded: favLoaded,
  } = useGymFavoriteToggle();

  const favActive = gymId ? isFavorited(gymId) : false;

  const handleFavorite = useCallback(() => {
    if (!gymId) return;
    toggleFavorite(gymId);
  }, [gymId, toggleFavorite]);

  const handleShare = useCallback(async () => {
    const { lat, lng } = gym.location;
    const url = `https://maps.apple.com/?q=${encodeURIComponent(
      gym.name,
    )}&ll=${lat},${lng}`;
    try {
      await Share.share({
        title: gym.name,
        message: `${gym.name}\n${url}`,
        url,
      });
    } catch {}
  }, [gym]);

  // Two-button footer (no Info — gym sheet has no Description-style
  // detail sections to scroll to). Glass union still applies, the
  // capsule just renders shorter.
  const actions: PlaceSheetFooterAction[] = [
    {
      key: 'share',
      icon: 'square.and.arrow.up',
      onPress: handleShare,
    },
    {
      key: 'favorite',
      icon: favActive ? 'heart.fill' : 'heart',
      onPress: handleFavorite,
      disabled: !gymId || !favLoaded,
    },
  ];

  return <PlaceSheetFooter actions={actions} unionId="gym-detail-footer" />;
}
