import { useTransform, type MotionValue } from 'framer-motion';
import { SCROLL_CONFIG, getCheckpointStartVH, sliceCount, type ScrollableCheckpoint } from '../lib/scrollUtils';
import type { Checkpoint } from '../lib/types.client';

export interface PhotoAlbumProps {
  cp: Checkpoint;
  checkpoints: Checkpoint[];
  scrollables: ScrollableCheckpoint[];
  i: number;
  total: number;
  smoothVH: MotionValue<number>;
  entryProgress: MotionValue<number>;
}

export function usePhotoAlbumAnimation({
  scrollables,
  i,
  total,
  smoothVH,
  entryProgress,
}: PhotoAlbumProps) {
  const { SLICE_VH } = SCROLL_CONFIG;

  const startVH = getCheckpointStartVH(scrollables, i);
  const budgetVH = sliceCount(scrollables[i], i) * SLICE_VH;
  const endVH = startVH + budgetVH;

  // InfoCard and Photo 0 always start arriving immediately alongside the map pan
  const photoStartVH = startVH;

  // Group Y translation: when vh exceeds endVH, the entire group scrolls up (0 to -100vh) over the next slice.
  // Last checkpoint never scrolls out.
  const isLast = i === total - 1;
  const exitEndVH = endVH + SLICE_VH;

  const groupY = useTransform(smoothVH,
    [endVH, exitEndVH],
    ['0vh', isLast ? '0vh' : '-50vh']
  );

  // Group Opacity: fades out entirely as it moves up during the exit slice.
  // By fading it over 0.5 of the slice, it hits opacity 0 exactly when it reaches the 50% height of the screen.
  const groupOpacity = useTransform(smoothVH,
    [endVH, endVH + (SLICE_VH * 0.5)],
    [1, isLast ? 1 : 0]
  );

  // InfoCard reveal: fades in from 0 to 1 during [photoStartVH, photoStartVH + 100]
  // Stays fully revealed until the whole layer moves out (driven via groupY).
  const reveal = useTransform(smoothVH, [photoStartVH, photoStartVH + SLICE_VH], [0, 1]);

  // Combine with entry sequence for the very first checkpoint
  // Instead of multiplying, the first checkpoint's reveal relies entirely on the map's entry (ep)
  const gatedReveal = useTransform([reveal, entryProgress], ([raw, ep]) => {
    if (i === 0) return ep as number;
    return raw as number;
  });

  const infoY = useTransform(gatedReveal, (r) => (1 - r) * 20);

  return { groupY, groupOpacity, gatedReveal, infoY };
}
