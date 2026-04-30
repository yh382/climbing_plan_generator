// src/features/mapscreen/offlineManager.ts
// Thin wrapper around @rnmapbox/maps OfflineManager tailored to ClimMate's
// (area, style) pack model. StyleId mirrors MapScreenMapbox's user-facing
// enum — 'outdoors' | 'satellite'. Dark mode is a visual variant of
// outdoors; we don't pre-download dark-v11 tiles (offline outdoors pack
// stays usable in dark mode for the same tile source — verify on device).

import MapboxGL from '@rnmapbox/maps';

export type StyleId = 'outdoors' | 'satellite';

// Raw URLs — @rnmapbox/maps 10.1.45's StyleURL enum points at v10/v11
// (e.g. outdoors-v11), out of sync with MapScreenMapbox which uses v12.
// Keep literals here so offline tiles match what the screen renders.
export const STYLE_URL_MAP: Record<StyleId, string> = {
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
};

const MIN_ZOOM = 13;
const MAX_ZOOM = 17;
const BBOX_PADDING_DEG = 0.02;
// Empirical: bytes per deg² @ zoom 13-17. Actual varies by style; this is
// only used for pre-download size warnings, not decision-critical.
const BYTES_PER_SQ_DEG = 50 * 1024 * 1024;
// Double underscore separator — UUID ids contain `-` and hex only, so `__`
// never collides with an area id; also future-proof if ids later contain `_`.
const PACK_NAME_SEP = '__';

export interface OfflinePackInfo {
  name: string;
  areaId: string;
  styleId: StyleId;
  sizeBytes: number;
  progress: number; // 0-100
  state: number; // 0=inactive/incomplete, 1=active, 2=complete
}

export interface Bbox {
  ne: [number, number]; // [lng, lat]
  sw: [number, number]; // [lng, lat]
}

export function packName(areaId: string, styleId: StyleId): string {
  return `${areaId}${PACK_NAME_SEP}${styleId}`;
}

export function parsePackName(
  name: string,
): { areaId: string; styleId: StyleId } | null {
  const idx = name.lastIndexOf(PACK_NAME_SEP);
  if (idx < 0) return null;
  const areaId = name.slice(0, idx);
  const rawStyleId = name.slice(idx + PACK_NAME_SEP.length);
  if (rawStyleId !== 'outdoors' && rawStyleId !== 'satellite') return null;
  return { areaId, styleId: rawStyleId };
}

/** Derive a bounding box from crag pins with a small padding so the
 *  download tiles extend slightly past the outermost crag. Returns null
 *  when no crag has coords. */
export function deriveBboxFromCrags(
  crags: Array<{ lat?: number | null; lng?: number | null }>,
): Bbox | null {
  const pts = crags.filter(
    (c): c is { lat: number; lng: number } =>
      typeof c.lat === 'number' && typeof c.lng === 'number',
  );
  if (pts.length === 0) return null;
  const lats = pts.map((c) => c.lat);
  const lngs = pts.map((c) => c.lng);
  return {
    sw: [Math.min(...lngs) - BBOX_PADDING_DEG, Math.min(...lats) - BBOX_PADDING_DEG],
    ne: [Math.max(...lngs) + BBOX_PADDING_DEG, Math.max(...lats) + BBOX_PADDING_DEG],
  };
}

/** Rough MB estimate for UI warning. Real pack can diverge 2-3x depending
 *  on style density — used only to gate "are you sure?" dialogs. */
export function estimatePackSizeMB(bbox: Bbox): number {
  const areaDeg = Math.abs(
    (bbox.ne[0] - bbox.sw[0]) * (bbox.ne[1] - bbox.sw[1]),
  );
  return Math.round((areaDeg * BYTES_PER_SQ_DEG) / (1024 * 1024));
}

interface CreatePackArgs {
  areaId: string;
  styleId: StyleId;
  bbox: Bbox;
  onProgress?: (pct: number) => void;
}

/** Kicks off a Mapbox offline pack download. Resolves when percentage
 *  reaches 100; rejects on error callback. */
export function createPack(args: CreatePackArgs): Promise<void> {
  const name = packName(args.areaId, args.styleId);
  const styleURL = STYLE_URL_MAP[args.styleId];

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const progressListener = (_pack: unknown, status: { percentage: number }) => {
      if (settled) return;
      args.onProgress?.(status.percentage);
      if (status.percentage >= 100) {
        settled = true;
        resolve();
      }
    };
    const errorListener = (_pack: unknown, err: { message?: string }) => {
      if (settled) return;
      settled = true;
      reject(new Error(err?.message ?? 'Offline pack download failed'));
    };
    MapboxGL.offlineManager
      .createPack(
        {
          name,
          styleURL,
          bounds: [args.bbox.ne, args.bbox.sw],
          minZoom: MIN_ZOOM,
          maxZoom: MAX_ZOOM,
        },
        progressListener,
        errorListener,
      )
      .catch((e) => {
        if (settled) return;
        settled = true;
        reject(e instanceof Error ? e : new Error(String(e)));
      });
  });
}

export async function listPacks(): Promise<OfflinePackInfo[]> {
  const packs = await MapboxGL.offlineManager.getPacks();
  const results = await Promise.all(
    packs.map(async (p) => {
      const name: string = (p as any).name ?? '';
      const parsed = parsePackName(name);
      let sizeBytes = 0;
      let progress = 0;
      let state = 0;
      try {
        const status = await (p as any).status();
        sizeBytes = status?.completedResourceSize ?? 0;
        progress = status?.percentage ?? 0;
        state = status?.state ?? 0;
      } catch {
        // Missing native status (e.g. during rapid teardown) — skip.
      }
      return {
        name,
        areaId: parsed?.areaId ?? '',
        styleId: (parsed?.styleId ?? 'outdoors') as StyleId,
        sizeBytes,
        progress,
        state,
      };
    }),
  );
  // Filter out packs whose name didn't parse — legacy or foreign packs.
  return results.filter((r) => r.areaId !== '');
}

export async function deletePack(name: string): Promise<void> {
  await MapboxGL.offlineManager.deletePack(name);
}

export async function totalStorageBytes(): Promise<number> {
  const packs = await listPacks();
  return packs.reduce((sum, p) => sum + p.sizeBytes, 0);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}
