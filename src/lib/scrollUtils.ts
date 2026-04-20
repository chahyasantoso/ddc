/**
 * Shared scroll constants and math to ensure perfect synchronization
 * between the MapLibre coordinates and the React Scrollytelling UI.
 *
 * Scroll Budget Model
 * ───────────────────
 * Each checkpoint occupies a variable number of "slices":
 *   • 1 entry slice  → map pans + marker appears
 *   • N photo slices → one slice per photo; each photo slides in on its slice
 *
 * Total VH for checkpoint k = (1 + photos.length) × SLICE_VH
 *
 * Example — 3 checkpoints with [2, 3, 1] photos:
 *   cp0: 3 slices → 0–300 vh
 *   cp1: 4 slices → 300–700 vh
 *   cp2: 2 slices → 700–900 vh
 *   Total = 900 vh
 *
 * NOTE: This file contains ONLY pure functions and constants.
 * React hooks (useJumpableSpring) live in src/hooks/.
 */

// ── Tuning constants ──────────────────────────────────────────────────────────

export const SCROLL_CONFIG = {
  /** Height of one scroll "slice" in viewport-height units. */
  SLICE_VH: 100,
};

// ── Checkpoint type (minimal shape needed by math helpers) ───────────────────

export interface ScrollableCheckpoint {
  photoCount: number;
  hasScene: boolean;
}

export function toScrollables(checkpoints: any[]): ScrollableCheckpoint[] {
  return checkpoints.map(cp => ({
    photoCount: cp.photoCount ?? (Array.isArray(cp.photos) ? cp.photos.length : 0),
    hasScene: cp.hasScene ?? !!cp.scene_image,
  }));
}

// ── Slice-count helpers ───────────────────────────────────────────────────────

export function sliceCount(cp: ScrollableCheckpoint, idx?: number) {
  const c = cp.photoCount;
  let base = idx === 0 ? Math.max(1, c - 1) : Math.max(1, c);
  // Scene checkpoints add 1 extra slice specifically for the background transition gap
  // map pan + photo 0 happen concurrently before the gap.
  if (cp.hasScene) base += 1;
  return base;
}

/** Cumulative scroll offset (in vh) where checkpoint k begins. */
export function getCheckpointStartVH(checkpoints: ScrollableCheckpoint[], idx: number): number {
  let vh = 0;
  for (let i = 0; i < idx; i++) {
    vh += sliceCount(checkpoints[i], i) * SCROLL_CONFIG.SLICE_VH;
  }
  return vh;
}

/**
 * Total scrollable height (in vh) for the entire journey.
 * Add extra 100vh padding so the last checkpoint can fully settle.
 */
export function getTotalVH(checkpoints: ScrollableCheckpoint[]): number {
  if (checkpoints.length === 0) return 100;
  let vh = 0;
  for (let i = 0; i < checkpoints.length; i++) {
    vh += sliceCount(checkpoints[i], i) * SCROLL_CONFIG.SLICE_VH;
  }
  return vh + 100;
}

/**
 * The scroll VH at which checkpoint k's marker / entry is perfectly centered.
 * Defined as the midpoint of the first (entry) slice.
 */
export function getCheckpointCenter(checkpoints: ScrollableCheckpoint[], idx: number): number {
  const start = getCheckpointStartVH(checkpoints, idx);
  const size = sliceCount(checkpoints[idx], idx) * SCROLL_CONFIG.SLICE_VH;
  // Let the user rest somewhere in the middle of the checkpoint's budget
  return start + size * 0.4;
}

/**
 * The scroll VH at the center of the reveal slice for photo `photoIdx`
 * inside checkpoint `cpIdx`.
 * photoIdx is 0-based (photo 0 = first photo slice, immediately after entry).
 */
export function getPhotoRevealVH(
  checkpoints: ScrollableCheckpoint[],
  cpIdx: number,
  photoIdx: number,
): number {
  const start = getCheckpointStartVH(checkpoints, cpIdx);
  // Entry slice occupies [start, start + SLICE_VH].
  // Photo k occupies [(k+1)*SLICE_VH, (k+2)*SLICE_VH] relative to start.
  return start + (photoIdx + 1) * SCROLL_CONFIG.SLICE_VH + SCROLL_CONFIG.SLICE_VH * 0.5;
}

/**
 * Given a raw scroll-VH value, return the index of the checkpoint that
 * is currently "active" (i.e. the marker should be visible on the map).
 * A checkpoint stays active for its entire scroll budget.
 */
export function getActiveCheckpointIndex(
  checkpoints: ScrollableCheckpoint[],
  currentVH: number,
): number {
  let idx = 0;
  for (let i = 0; i < checkpoints.length; i++) {
    const end = getCheckpointStartVH(checkpoints, i) + sliceCount(checkpoints[i], i) * SCROLL_CONFIG.SLICE_VH;
    if (currentVH < end) {
      idx = i;
      break;
    }
    idx = i; // clamp to last
  }
  return idx;
}

// ── Jump navigation ───────────────────────────────────────────────────────────

/**
 * Scrolls to a target checkpoint, either smoothly (sequential) or via
 * an instant teleport avoiding tracking intermediate points (non-sequential).
 */
export function triggerScrollyJump(
  targetIdx: number,
  isSequential = false,
) {
  const el = document.getElementById(`checkpoint-snap-${targetIdx}`);
  if (!el) return;

  const lenis = (window as any).__lenis;
  if (lenis) {
    // immediate: true = instant jump (no lerp), false = smooth scroll
    lenis.scrollTo(el, { immediate: !isSequential });
  } else {
    // Fallback if Lenis not loaded
    el.scrollIntoView({ behavior: isSequential ? 'smooth' : 'instant', block: 'start' });
  }
}
