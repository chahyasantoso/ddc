import type { Checkpoint } from './types.client';

// ── Core reveal calculation ───────────────────────────────────────────────────
//
//  Returns a value 0–1 representing how "visible" checkpoint ci's content
//  should be at the given scroll progress p (0–1).
//
//  Slide IN  window : motor LEAVES checkpoint (ci-1) → ARRIVES at checkpoint ci
//  Slide OUT window : motor LEAVES checkpoint ci     → ARRIVES at checkpoint (ci+1)
//
//  reveal = 0  → element is fully off-screen
//  reveal = 1  → element is fully on-screen (motor is exactly at this checkpoint)
//
export function computeReveal(p: number, ci: number, N: number): number {
  if (N === 1) return 1;

  const cpProg   = ci / (N - 1);
  const prevProg = (ci - 1) / (N - 1); // irrelevant when isFirst
  const nextProg = (ci + 1) / (N - 1); // irrelevant when isLast

  const isFirst = ci === 0;
  const isLast  = ci === N - 1;

  // Before this checkpoint's entry window
  if (!isFirst && p <= prevProg) return 0;

  // Entering: motor travelling from prev checkpoint toward this one
  if (!isFirst && p < cpProg) {
    return (p - prevProg) / (cpProg - prevProg); // 0 → 1
  }

  // At or past arrival at this checkpoint
  if (isLast) return 1; // last checkpoint stays visible forever

  // Exiting: motor travelling from this checkpoint toward the next
  if (p >= nextProg) return 0; // fully gone when motor arrives at next
  return 1 - (p - cpProg) / (nextProg - cpProg); // 1 → 0
}

// ── Active checkpoint resolution ─────────────────────────────────────────────
//
//  Returns the checkpoint whose photos are most visible at the given progress.
//  Falls back to the geometrically closer endpoint when between checkpoints.
//
export function resolveActive(
  p: number,
  checkpoints: Checkpoint[]
): Checkpoint | null {
  const N = checkpoints.length;
  if (N === 0) return null;
  if (N === 1) return checkpoints[0];

  // Find first checkpoint with any visibility (highest reveal wins)
  let bestReveal = -1;
  let bestCp: Checkpoint | null = null;
  for (let i = 0; i < N; i++) {
    const r = computeReveal(p, i, N);
    if (r > bestReveal) { bestReveal = r; bestCp = checkpoints[i]; }
  }
  return bestCp;
}
