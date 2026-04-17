import { useTransform, type MotionValue } from 'framer-motion';
import type { Checkpoint } from '../lib/types.client';
import { SCROLL_CONFIG, getCheckpointStartVH, sliceCount } from '../lib/scrollUtils';

export interface CheckpointAlbumProps {
  cp: Checkpoint;
  checkpoints: Checkpoint[];
  i: number;
  total: number;
  smoothVH: MotionValue<number>;
  entryProgress: MotionValue<number>;
}

export function useCheckpointAlbumAnimation({
  cp,
  checkpoints,
  i,
  total,
  smoothVH,
  entryProgress,
}: CheckpointAlbumProps) {
  const { SLICE_VH } = SCROLL_CONFIG;

  const startVH = getCheckpointStartVH(checkpoints, i);
  const budgetVH = sliceCount(cp, i) * SLICE_VH;
  const endVH = startVH + budgetVH;

  // Group Y translation: when vh exceeds endVH, the entire group scrolls up (0 to -100vh) over the next slice.
  // Last checkpoint never scrolls out.
  const isLast = i === total - 1;
  const exitEndVH = endVH + SLICE_VH;
  
  const groupY = useTransform(smoothVH, 
    [endVH, exitEndVH], 
    ['0vh', isLast ? '0vh' : '-100vh']
  );

  // InfoCard reveal: fades in from 0 to 1 during [startVH, startVH + 100]
  // Stays fully revealed until the whole layer moves out (driven via groupY).
  const reveal = useTransform(smoothVH, [startVH, startVH + SLICE_VH], [0, 1]);

  // Combine with entry sequence for the very first checkpoint
  // Instead of multiplying, the first checkpoint's reveal relies entirely on the map's entry (ep)
  const gatedReveal = useTransform([reveal, entryProgress], ([raw, ep]) => {
    if (i === 0) return ep as number;
    return raw as number;
  });

  const infoY = useTransform(gatedReveal, (r) => (1 - r) * 20);

  return { groupY, gatedReveal, infoY };
}
