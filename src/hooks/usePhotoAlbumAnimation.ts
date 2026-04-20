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

  // ── Album Entry ─────────────────────────────────────────────────────────────
  // The album drifts UP into its sticky position as the map pans to the marker.
  // For CP0, we use the special entryProgress; for others, we use the arrival slice.
  const arrivalSliceVH = i === 0 ? 0 : startVH;
  const entryStartVH = arrivalSliceVH - SLICE_VH;
  const entryEndVH = arrivalSliceVH;

  const entryY = useTransform(smoothVH, 
    [entryStartVH, entryEndVH], 
    [i === 0 ? '0vh' : '40vh', '0vh']
  );

  // ── Album Exit ──────────────────────────────────────────────────────────────
  // When vh exceeds endVH (after all photos), the entire group scrolls up.
  // Last checkpoint never scrolls out.
  const isLast = i === total - 1;
  const exitEndVH = endVH + SLICE_VH;

  const exitY = useTransform(smoothVH,
    [endVH, exitEndVH],
    ['0vh', isLast ? '0vh' : '-80vh']
  );

  // Combine Entry and Exit into a single Y transform
  const albumY = useTransform([entryY, exitY], ([eY, xY]) => {
    // If we are before entry, use entryY; if after end, use exitY
    const v = smoothVH.get();
    if (v < entryEndVH) return eY;
    if (v > endVH) return xY;
    return '0vh';
  });

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

  return { groupY: albumY, groupOpacity, gatedReveal, infoY };
}
