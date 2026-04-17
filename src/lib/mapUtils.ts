/**
 * Pure math utilities for the Interactive Map component.
 *
 * These functions calculate motorcycle position, bearing, and GeoJSON data
 * from scroll progress. They have NO React dependencies and can be tested
 * independently.
 */
import { getTotalVH, getActiveCheckpointIndex, getCheckpointStartVH, SCROLL_CONFIG } from './scrollUtils';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CheckpointCoord {
  id: number;
  location_name: string;
  lat: number;
  lng: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

/**
 * Build a lightweight virtual checkpoint list for scroll math.
 * Only the photo count per checkpoint matters for timing calculations.
 */
export function buildVirtualCheckpoints(cps: CheckpointCoord[], photoCounts?: number[]) {
  return cps.map((_, i) => ({
    photos: new Array(photoCounts?.[i] ?? 0),
  }));
}

/**
 * Get the map camera's lat/lng for a given scroll progress (0–1).
 * The camera travels between checkpoints during entry slices and parks
 * at the destination for the duration of its photo slices.
 */
export function getCameraFromProgress(
  cps: CheckpointCoord[],
  photoCounts: number[] | undefined,
  progress: number,
): { lat: number; lng: number } {
  if (cps.length === 0) return { lat: -7.5, lng: 112.5 };
  if (cps.length === 1) return { lat: cps[0].lat, lng: cps[0].lng };

  const virtualCPs = buildVirtualCheckpoints(cps, photoCounts);
  const totalVH = getTotalVH(virtualCPs);
  const vh = progress * totalVH;

  const k = getActiveCheckpointIndex(virtualCPs, vh);
  const startVH = getCheckpointStartVH(virtualCPs, k);
  const { SLICE_VH } = SCROLL_CONFIG;

  // 0.5vh margin handles floating-point inaccuracy at exact slice borders
  if (vh < startVH + SLICE_VH - 0.5) {
    if (k === 0) return { lat: cps[0].lat, lng: cps[0].lng };
    const t = (vh - startVH) / SLICE_VH;
    return {
      lat: lerp(cps[k - 1].lat, cps[k].lat, t),
      lng: lerp(cps[k - 1].lng, cps[k].lng, t),
    };
  }

  return { lat: cps[k].lat, lng: cps[k].lng };
}

/**
 * Get the motorcycle's compass bearing for a given scroll progress.
 * During travel, the bike faces its destination. When parked, it faces
 * toward the next checkpoint.
 */
export function getMotoBearing(
  cps: CheckpointCoord[],
  photoCounts: number[] | undefined,
  progress: number,
): number {
  if (cps.length < 2) return 0;

  const virtualCPs = buildVirtualCheckpoints(cps, photoCounts);
  const totalVH = getTotalVH(virtualCPs);
  const vh = progress * totalVH;

  const k = getActiveCheckpointIndex(virtualCPs, vh);
  const startVH = getCheckpointStartVH(virtualCPs, k);
  const { SLICE_VH } = SCROLL_CONFIG;

  if (vh < startVH + SLICE_VH - 0.5 && k > 0) {
    return getBearing(cps[k - 1], cps[k]);
  }
  if (k < cps.length - 1) {
    return getBearing(cps[k], cps[k + 1]);
  }
  return getBearing(cps[k - 1], cps[k]);
}

export function getBearing(a: CheckpointCoord, b: CheckpointCoord): number {
  const angle = Math.atan2(b.lng - a.lng, b.lat - a.lat) * (180 / Math.PI);
  return (angle + 360) % 360;
}

// ── GeoJSON builders ──────────────────────────────────────────────────────────

export function buildRouteGeoJSON(cps: CheckpointCoord[]) {
  if (cps.length < 2) return null;
  return {
    type: 'Feature' as const,
    geometry: {
      type: 'LineString' as const,
      coordinates: cps.map(cp => [cp.lng, cp.lat]),
    },
    properties: {},
  };
}

export function buildMarkersGeoJSON(cps: CheckpointCoord[]) {
  return {
    type: 'FeatureCollection' as const,
    features: cps.map((cp, i) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [cp.lng, cp.lat] },
      properties: { id: cp.id, name: cp.location_name, index: i },
    })),
  };
}

// ── Map style ─────────────────────────────────────────────────────────────────

export const MAP_STYLE = {
  version: 8 as const,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: { java: { type: 'geojson' as const, data: '/java.geojson' } },
  layers: [
    { id: 'background', type: 'background' as const, paint: { 'background-color': '#0f0e0d' } },
    { id: 'java-fill', type: 'fill' as const, source: 'java', paint: { 'fill-color': '#1e1a18', 'fill-opacity': 0.97 } },
    { id: 'java-outline', type: 'line' as const, source: 'java', paint: { 'line-color': '#3d3530', 'line-width': 0.8, 'line-opacity': 0.7 } },
  ],
};
