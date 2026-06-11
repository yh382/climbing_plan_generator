// src/features/outdoor/discipline.ts
// CB — inclusive discipline predicates for the Routes→Sport/Trad sub-filter
// and the TR card badge. Use the multi-flag `disciplines` (OpenBeta type
// object, backfilled) when present so a sport+trad line counts as BOTH;
// fall back to the single `style` for not-yet-backfilled rows.

import type { OutdoorRoute, RouteDisciplines } from './types';

function realDisciplines(r: OutdoorRoute): RouteDisciplines | null {
  const d = r.disciplines;
  // Reject the {_status: ...} sentinel (backfill couldn't resolve) — no flags.
  if (d && d._status == null && (d.sport != null || d.trad != null || d.bouldering != null || d.tr != null)) {
    return d;
  }
  return null;
}

export function isSportRoute(r: OutdoorRoute): boolean {
  const d = realDisciplines(r);
  return d ? d.sport === true : r.style === 'sport';
}

export function isTradRoute(r: OutdoorRoute): boolean {
  const d = realDisciplines(r);
  return d ? d.trad === true : r.style === 'trad';
}

export function isTopRopeRoute(r: OutdoorRoute): boolean {
  const d = realDisciplines(r);
  return d ? d.tr === true : r.style === 'toprope';
}
