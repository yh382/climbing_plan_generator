# CA-FU Map Redesign — Handoff (autonomous run, 2026-06-10)

Plan: `../docs/EXEC_W_CA_FU_MAP_REDESIGN.md` (v5, with the user-approved v6
Phase-A fix). This doc = what an overnight autonomous run completed, and a
precise execution guide for the remaining **device-verified** surgery.

> **Why this stops where it does:** Phases C.2–E are a single interdependent
> rewrite of `MapScreenMapbox.tsx` (2303 lines) + `RoutesListSheet.tsx` (551
> lines) + the legacy `focusedWall`/`browsingCrag` state machine. They don't
> decompose into independently tsc-green pieces beyond `useAllCrags`, and the
> plan itself gates each phase on real-device verification before the next.
> Blindly rewriting the core map screen with no device to test on is the exact
> "dogfood 反复中招" failure mode the plan warns against — and a subtly-broken
> mega-diff isn't device-verifiable anyway. So the run delivered the
> self-contained, exact-spec piece (`useAllCrags`) + this guide.

---

## ✅ Shipped to `main` (verified: tests / tsc / reviewers, + prod for BE)

| Phase | Repo | Commit | What |
|---|---|---|---|
| A | climbing_plan_backend | `84d1eb9` | display_kind + computed_kind classification, applied on prod (35117 crag / 7875 area / 48 state / 1 country). **v6 fix**: writes `computed_kind` always + `display_kind` only where `display_kind_locked=false`; gates query computed_kind. |
| B/BE | climbing_plan_backend | `7fb07eb` | `GET /outdoor/areas/crags` (public, Cache-Control + SlowAPI 60/min) + `SavedSpotOut.display_kind+status` + `display_kind` partial index (prod at head). 410 tests. |
| B/BE openapi | climmate-meta | `3f96c51` | regen docs/openapi.json |
| B/FE | climbing_plan_generator | `9bb9271` | delete 8 dead api methods + migrate getCrags/searchOutdoor callers + fix beta URL + `listAllCrags()` + regen api types. tsc 0, both reviewers 0 alive. |

**slowapi is now a BE dependency** (`requirements.txt`, `lib/limiter.py`,
`main.py`). Apply per-IP limits via `@limiter.limit("60/minute")` + a
`request: Request` param.

## 🌿 On this branch `ca-fu-map-redesign` (UNVERIFIED on device)

| Commit | What |
|---|---|
| `phase-c.1` | `src/features/outdoor/useAllCrags.ts` — AsyncStorage SWR + data_version hot-swap. tsc 0. Not wired yet. |

---

## ⚠️ Deferred from B/FE → must be done as part of C/D here

Two api methods were **kept** (still runtime-404) because their callers are
entangled with the C/D rewrite of the exact files involved:

- **`outdoorApi.search`** — callers: `useAreaData.ts:53` (→ MapScreenMapbox
  `handleAreaSearch` 1107 + `RoutesSegment.tsx:53`), `crag-map.tsx:422`.
  These are *route-listing/route-search-in-area*; CA has no "search routes by
  name in area" endpoint. Migrate to area-scoped browse (searchAreas for name
  search; `listAreaRoutes` for the `.search("", areaId)` route-listing in
  RoutesSegment). Delete `search` after.
- **`outdoorApi.getCragDetail`** — caller: `MapScreenMapbox.tsx:548`
  (multi-line chain `outdoorApi\n.getCragDetail(cragId)` — **grep on
  `outdoorApi.getCragDetail` misses it; tsc is the authority**). Part of the
  legacy `focusedWall`/`browsingCrag` state machine D.2/D.3 deletes. Delete
  `getCragDetail` + its caller together.

Also `submitRoute` stays until **E.3**. After C/D/E, the Phase B Gate grep
`outdoorApi\.\(search\|getCragDetail\|submitRoute\|...\)` should be 0.

---

## Remaining work (precise guide)

### C.2 — rewrite `CragOverviewCluster.tsx` (CragOverview → CragPin)
File: `src/features/outdoor/components/CragOverviewCluster.tsx` (currently 465
lines, well-built Mapbox config — preserve it, adapt the data shape).
- Props → `{ crags: CragPin[]; styleReady; onCragPress: (crag: CragPin) => void; onClusterPress: (coords:[number,number]) => void }`.
- `toGeoJSON(crags: CragPin[])`: emit `area_id=c.id`, `crag_name=c.name`,
  `route_count`, and map `c.discipline_counts.{boulder,rope,other}` onto the
  existing `boulder_count`/`rope_count`/`unknown_count` feature props so **all
  the existing Mapbox step/case expressions keep working unchanged** (they
  read those names). `count_label` = formatCount(route_count).
- `cragLookup: Map<string, CragPin>` keyed by id; `handlePress` resolves via
  `props.area_id` and calls `onCragPress(crag)`.
- **Stable-cluster decision:** DROP the `minRoutes`/`getMinRoutesForZoom`
  importance filter — it mutates the source per zoom-threshold, which can jump
  the cluster geometry. Plan wants a stable static 35k source; let Mapbox
  supercluster aggregate naturally. (This removes the `getMinRoutesForZoom`
  export → update its MapScreenMapbox caller in C.4.)
- Keep formatCount, CLUSTER_*/SINGLE_* step expressions, name SymbolLayer.
- **Device gate:** pan = cluster doesn't jitter; tap cluster = zoom only.

### C.3 — new `OutdoorBrowseSheet.tsx`
New: `src/features/outdoor/components/OutdoorBrowseSheet.tsx`. Replaces
RoutesListSheet's `mode='area'` + `browsingCrag` + `focusedWall` sub-states.
- Reuse (read-only): `outdoor-area-sheet/AreaChildrenList.tsx`,
  `outdoor-area-sheet/shared.ts`. **Fork** `AreaRoutesPreview.tsx` →
  `AreaRoutesBrowser.tsx` (FlashList + local search TextInput + discipline
  `NativeSegmentedControl` 4-opt [all/boulder/rope/other] + 3-key sort
  `stars DESC NULLS LAST, send_count DESC, grade_score ASC`).
- Hooks: `useAreaDetail` (hooks.ts:91) + `useAreaChildren` (hooks.ts:99)
  exist. **`useAreaRoutes` does NOT exist** — add it (wraps
  `outdoorApi.listAreaRoutes(areaId, { includeDescendants:false })`;
  `includeDescendants` MUST be explicit false — footgun guard).
- Layout matrix on `(has_routes, has_subareas)`: subareas+routes → Header +
  AreaChildrenList + AreaRoutesBrowser; subareas only → + AreaChildrenList;
  routes only (crag) → + AreaRoutesBrowser; empty → empty state.
- Native UI: TrueSheet host (sibling of RoutesListSheet's sheet ref),
  `useThemeColors()` + `createStyles(colors)`, all strings via `tr()`,
  `HeaderButton icon="line.3.horizontal"` → `onPressHamburger`. FlashList
  `estimatedItemSize 64`, `drawDistance 800`.
- Keep `AreaHero/AreaStats/AreaActions/AreaMetadata` for OutdoorAreaInfoSheet
  (the stacked hamburger-Info sheet) — NOT used here.
- **Device gate:** tap Stone Fort (357 routes) → smooth FlashList; default
  sort shows 5-star first; search + discipline chips filter.

### Cross-phase contract (do before C.4 / D.5)
`OutdoorAreaInfoSheet.tsx` → make `present(seed, mode: PresentMode)` where
`PresentMode = { kind:'stacked' } | { kind:'primary'; areaId:string }`. No
default — every caller declares intent. Add `dispatchSavedSpotTap(spot, tr)`
(by `(target_type, display_kind, status)`): route→push detail;
non-approved area→toast + stacked; crag→primary; other area→stacked.
**Depends on FE `SavedSpot` type gaining `display_kind?` + `status?`**
(types.ts:406 still has legacy `{region,area,crag,route}` target_types + no
display_kind/status — update to `{route,outdoor_area}` + the 2 fields; ripple
through `savedSpotsApi`/`useSavedSpots`/`GymsSavedSpotsRow` = D.5).

### C.4 — `MapScreenMapbox.tsx` wiring (the big one, 2303 lines)
- Explore mode: `useCragsOverview` → `useAllCrags`; feed `crags` into the
  rewritten `CragOverviewCluster`. (Keep old `useCragsOverview`/`listCragsOverview`
  physically until D.4 so `git revert phase-c/core` is self-contained — plan
  v4 patch #7.)
- `onCragPinTap(crag: CragPin)` → `setMode({kind:'area', areaId:crag.id, ...})`
  + `setBrowsingAreaId(crag.id)` + camera zoom 15. NO stacked info popup.
- `onCragClusterPress(coords)` → camera +2 zoom, no sheet.
- Area mode → mount `OutdoorBrowseSheet` instead of RoutesListSheet area state.
- Remove the `getMinRoutesForZoom` usage (C.2 dropped it).

### Phase D (1.3d, 6 sub-commits) — see plan §Phase D
D.1 OutdoorAreaInfoSheet callers → hamburger/`{mode}`; D.2 split RoutesListSheet
→ `SavedRoutesListSheet` (list mode only) + delete area/crag/wall sub-states;
D.3 delete `AreaPinContext` 6 legacy aliases (RoutePinCluster) incl `region_id`;
D.4 delete `listCragsOverview` stub + `useCragsOverview`; D.5 target_type
audit → `dispatchSavedSpotTap` (+ the deferred `search` migration lands here);
D.6 Wall type + `WallGroup.tsx` + `RoutesSegment` audit/delete. **Note
RoutesSegment is LIVE** (used by `RoutesLibrarySheet.tsx:59`) — don't assume
dead; its `.search("",areaId)` → `listAreaRoutes`.

### Phase E (0.8d) — see plan §Phase E
E.1 extract `src/lib/r2Upload.ts` from AddRouteSheet; E.2 delete
`AddRouteSheet.tsx` + pin-pick state in MapScreenMapbox/crag-map + CragMenuSheet
"Add Route"; E.3 delete `outdoorApi.submitRoute` (grep 0 first); E.4 docs sweep
(STATUS/BACKLOG/maps + data-flows/17 §1/§3/§4/§5/§6/§9 — incl the **schema
invariant** para: display_kind structural vs visible); E.5 the 12-item
real-machine checklist (LTE first-load <6s, cache instant, SWR hot-update, pan
60fps, cluster stable, memory <300MB, etc.).

---

## Reviewers per phase (spawn after coding, 0-alive before commit)
C: frontend-reviewer + architecture-reviewer · D: frontend + dead-code +
architecture · E: frontend + dead-code. (Custom agent types aren't exposed as
`subagent_type` here — run them via a general-purpose agent fed the
`.claude/agents/<name>.md` definition, as the autonomous run did.)

## Key facts discovered this run (don't relearn the hard way)
- **Multi-line method chains evade single-line grep** (`getCragDetail` case).
  Use tsc as the caller-authority, not grep alone.
- BE `/outdoor/search`, `/outdoor/regions/{id}/beta`, `/outdoor/{crags|regions|walls}/{id}`, the `/v2` aliases are all DELETED (404) post-6.2.
- Prod `list_all_crags` validated: count 35117, deterministic data_version. Local→Neon timing 5-7s is network-dominated (not Railway origin) — the plan's "first load 4-8s acceptable, optimize in E.5 only if real-LTE p95 bad" stands.
- This file (CA_FU_HANDOFF.md) is a working note — delete it when C-E land.
