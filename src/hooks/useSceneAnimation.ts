import { type MotionValue } from 'framer-motion';
import { SCROLL_CONFIG, getCheckpointStartVH, sliceCount, type ScrollableCheckpoint } from '../lib/scrollUtils';
import type { Checkpoint } from '../lib/types.client';

interface UseSceneAnimationProps {
  checkpoints: Checkpoint[];
  scrollables: ScrollableCheckpoint[];
  smoothVH: MotionValue<number>;
}

export interface SceneRange {
  cp: Checkpoint;
  i: number;
  imageUrl: string;
  imageIndex: number;
  startVH: number;
  entryStartVH: number;
  entryEndVH: number;
  exitStartVH: number;
  exitEndVH: number;
}

export function useSceneAnimation({ checkpoints, scrollables }: UseSceneAnimationProps) {
  const { SLICE_VH } = SCROLL_CONFIG;

  const sceneRanges: SceneRange[] = [];
  const mapDisplacementRanges: { start: number; end: number }[] = [];

  checkpoints.forEach((cp, i) => {
    const startVH = getCheckpointStartVH(scrollables, i);
    const totalSlices = sliceCount(scrollables[i], i);
    const endVH = startVH + totalSlices * SLICE_VH;

    const backdrops = (cp.photos || [])
      .map((photo, index) => ({ photo, index }))
      .filter((item) => item.photo.is_backdrop === 1);

    if (backdrops.length === 0) return;

    // Map must be displaced entirely while ANY backdrop is active
    const firstBackdropEntryStartVH = startVH + (backdrops[0].index - (i === 0 ? 1 : 0)) * SLICE_VH;
    mapDisplacementRanges.push({
      start: firstBackdropEntryStartVH,
      end: endVH,
    });

    backdrops.forEach((b, idx) => {
      const entryStartVH = startVH + (b.index - (i === 0 ? 1 : 0)) * SLICE_VH;
      const entryEndVH = entryStartVH + SLICE_VH;

      const nextBackdrop = backdrops[idx + 1];
      const exitStartVH = nextBackdrop
        ? startVH + (nextBackdrop.index - (i === 0 ? 1 : 0)) * SLICE_VH
        : endVH;
      const exitEndVH = exitStartVH + SLICE_VH;

      sceneRanges.push({
        cp,
        i,
        imageUrl: b.photo.photo_url,
        imageIndex: b.index,
        startVH,
        entryStartVH,
        entryEndVH,
        exitStartVH,
        exitEndVH,
      });
    });
  });

  return { mapDisplacementRanges, sceneRanges };
}
