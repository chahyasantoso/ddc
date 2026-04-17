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
 */
import { useEffect, useRef } from 'react';
import { useMotionValue, useSpring, type MotionValue } from 'framer-motion';

// ── Tuning constants ──────────────────────────────────────────────────────────

export const SCROLL_CONFIG = {
  /** Height of one scroll "slice" in viewport-height units. */
  SLICE_VH: 100,
};

// ── Checkpoint type (minimal shape needed by math helpers) ───────────────────

export interface CheckpointLike {
  photos: unknown[];
}

// ── Slice-count helpers ───────────────────────────────────────────────────────

/** Number of scroll slices consumed by checkpoint k. */
export function sliceCount(cp: CheckpointLike) {
  return Math.max(1, cp.photos.length);
}

/** Cumulative scroll offset (in vh) where checkpoint k begins. */
export function getCheckpointStartVH(checkpoints: CheckpointLike[], idx: number): number {
  let vh = 0;
  for (let i = 0; i < idx; i++) {
    vh += sliceCount(checkpoints[i]) * SCROLL_CONFIG.SLICE_VH;
  }
  return vh;
}

/**
 * Total scrollable height (in vh) for the entire journey.
 * Add extra 100vh padding so the last checkpoint can fully settle.
 */
export function getTotalVH(checkpoints: CheckpointLike[]): number {
  const sum = checkpoints.reduce((acc, cp) => acc + sliceCount(cp) * SCROLL_CONFIG.SLICE_VH, 0);
  return Math.max(0, sum);
}

/**
 * The scroll VH at which checkpoint k's marker / entry is perfectly centered.
 * Defined as the midpoint of the first (entry) slice.
 */
export function getCheckpointCenter(checkpoints: CheckpointLike[], idx: number): number {
  return getCheckpointStartVH(checkpoints, idx) + SCROLL_CONFIG.SLICE_VH * 0.5;
}

/**
 * The scroll VH at the center of the reveal slice for photo `photoIdx`
 * inside checkpoint `cpIdx`.
 * photoIdx is 0-based (photo 0 = first photo slice, immediately after entry).
 */
export function getPhotoRevealVH(
  checkpoints: CheckpointLike[],
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
  checkpoints: CheckpointLike[],
  smoothVH: number,
): number {
  let idx = 0;
  for (let i = 0; i < checkpoints.length; i++) {
    const end = getCheckpointStartVH(checkpoints, i) + sliceCount(checkpoints[i]) * SCROLL_CONFIG.SLICE_VH;
    if (smoothVH < end) {
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
 * a pre-jump instant scroll to skip invisible sections (non-sequential).
 */
export function triggerScrollyJump(
  checkpoints: CheckpointLike[],
  targetIndex: number,
  isSequential: boolean,
) {
  const el = document.getElementById(`checkpoint-snap-${targetIndex}`);
  if (!el) return;

  if (isSequential) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    // Signal spring to bypass animation instantly
    window.dispatchEvent(new CustomEvent('ddc:jump-state', { detail: { jumping: true } }));

    const targetAbsoluteY = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: targetAbsoluteY, behavior: 'instant' });

    // Use double-RAF: first frame lets the instant scroll event fire and update
    // scrollYProgress, second frame releases the spring so it resumes normally.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent('ddc:jump-state', { detail: { jumping: false } }));
      });
    });
  }
}

// ── Spring with jump bypass ───────────────────────────────────────────────────

/**
 * Drop-in replacement for useSpring() that can be temporarily bypassed.
 * When a 'ddc:jump-state' event fires, the spring is skipped so that
 * instant-scroll jumps don't visibly animate through intermediate states.
 */
export function useJumpableSpring(sourceValue: MotionValue<number>, config: any) {
  const targetValue = useMotionValue(sourceValue.get());
  const smoothValue = useSpring(targetValue, config);
  // Start as true so browser scroll restoration skips the initial spring
  const isJumping = useRef(true);

  useEffect(() => {
    const settleTimeout = setTimeout(() => {
      isJumping.current = false;
    }, 200);

    const handleJump = (e: any) => {
      isJumping.current = e.detail.jumping;
    };
    window.addEventListener('ddc:jump-state', handleJump);
    return () => {
      clearTimeout(settleTimeout);
      window.removeEventListener('ddc:jump-state', handleJump);
    };
  }, []);

  useEffect(() => {
    const initial = sourceValue.get();
    targetValue.set(initial);
    if ((smoothValue as any).jump) (smoothValue as any).jump(initial);

    const unsub = sourceValue.on('change', (latest) => {
      targetValue.set(latest);
      if (isJumping.current) {
        // jump() is preferred (bypasses internal velocity), set() is a fallback
        if ((smoothValue as any).jump) {
          (smoothValue as any).jump(latest);
        } else {
          (smoothValue as any).set(latest);
        }
      }
    });
    return unsub;
  }, [sourceValue, targetValue, smoothValue]);

  return smoothValue;
}
