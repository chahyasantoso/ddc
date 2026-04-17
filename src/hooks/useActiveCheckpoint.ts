import { useRef } from 'react';
import { useMotionValueEvent, type MotionValue } from 'framer-motion';
import { getActiveCheckpointIndex, getCheckpointStartVH, SCROLL_CONFIG } from '../lib/scrollUtils';
import type { Checkpoint } from '../lib/types.client';

/**
 * Tracks which checkpoint is currently "active" as the user scrolls and
 * dispatches a 'ddc:checkpoint-active' custom event whenever it changes.
 *
 * The active checkpoint is defined as the one whose marker ring should
 * be highlighted on the map. During travel slices (motorcycle moving),
 * the previous checkpoint remains active until arrival is complete.
 */
export function useActiveCheckpoint(
  smoothVH: MotionValue<number>,
  checkpoints: Checkpoint[],
) {
  const prevActiveKRef = useRef(-1);

  useMotionValueEvent(smoothVH, 'change', (vh) => {
    if (checkpoints.length === 0) return;

    const k = getActiveCheckpointIndex(checkpoints, vh);
    const startVH = getCheckpointStartVH(checkpoints, k);
    const { SLICE_VH } = SCROLL_CONFIG;

    // During the entry/travel slice, the motorcycle hasn't arrived yet —
    // keep the previous checkpoint highlighted until it parks.
    let activeK = k;
    if (k > 0 && vh < startVH + SLICE_VH - 0.5) {
      activeK = k - 1;
    }

    if (activeK !== prevActiveKRef.current) {
      prevActiveKRef.current = activeK;
      window.dispatchEvent(
        new CustomEvent('ddc:checkpoint-active', {
          detail: { id: checkpoints[activeK].id },
        }),
      );
    }
  });
}
