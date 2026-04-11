import type { Checkpoint } from './types.client';

// ── Core reveal calculation ───────────────────────────────────────────────────
//
// Returns a value 0–1 representing how "visible" checkpoint ci's content
// should be at the given scroll progress p (0–1).
//
// The crossover design uses MIDPOINTS between checkpoint positions:
//
//   prev─────[midpoint]────curr────[midpoint]────next
//                ↑ entry starts           ↑ exit ends
//
// This guarantees there is NEVER an overlap between two adjacent checkpoints.
// The outgoing checkpoint finishes at the midpoint, then incoming starts.
//
//   reveal = 0 → element is fully off-screen
//   reveal = 1 → element is fully on-screen (motor is exactly at this checkpoint)
//
export function computeReveal(p: number, ci: number, N: number): number {
  if (N === 1) return 1;

  const prev = ci > 0     ? (ci - 1) / (N - 1) : null;
  const curr =               ci       / (N - 1);
  const next = ci < N - 1 ? (ci + 1) / (N - 1) : null;

  // Crossover points — halfway between adjacent checkpoints
  // A checkpoint's content starts appearing at entryStart and is fully gone at exitEnd.
  const entryStart = prev !== null ? (prev + curr) / 2 : null; // null = always visible from start
  const exitEnd    = next !== null ? (curr + next) / 2 : null; // null = stays visible forever

  // Past exit window → fully hidden
  if (exitEnd !== null && p >= exitEnd) return 0;

  // Before entry window → not yet arrived
  if (entryStart !== null && p < entryStart) return 0;

  // Entering: entryStart → curr (reveal 0 → 1)
  if (entryStart !== null && p < curr) {
    return (p - entryStart) / (curr - entryStart);
  }

  // Exiting: curr → exitEnd (reveal 1 → 0)
  if (exitEnd !== null && p > curr) {
    return 1 - (p - curr) / (exitEnd - curr);
  }

  return 1; // exactly at checkpoint, or no exit (last) / no entry (first)
}

// ── Active checkpoint resolution ─────────────────────────────────────────────
//
// Returns the checkpoint whose photos are most visible at the given progress.
//
// During the brief transition gap (both neighbors at reveal=0), falls back to
// the last checkpoint whose position we have passed — so the info card stays
// visible rather than disappearing during the handoff.
//
export function resolveActive(
  p: number,
  checkpoints: Checkpoint[]
): Checkpoint | null {
  const N = checkpoints.length;
  if (N === 0) return null;
  if (N === 1) return checkpoints[0];

  // Find checkpoint with highest reveal value
  let best   = -Infinity;
  let bestCp : Checkpoint | null = null;
  for (let i = 0; i < N; i++) {
    const r = computeReveal(p, i, N);
    if (r > best) { best = r; bestCp = checkpoints[i]; }
  }

  // During transition gap (all reveals = 0): show the last checkpoint passed
  if (best === 0) {
    for (let i = N - 1; i >= 0; i--) {
      if (i / (N - 1) <= p) return checkpoints[i];
    }
    return checkpoints[0];
  }

  return bestCp;
}
