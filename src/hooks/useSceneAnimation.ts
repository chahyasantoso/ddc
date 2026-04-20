import { useTransform, type MotionValue } from 'framer-motion';
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

export function useSceneAnimation({ checkpoints, scrollables, smoothVH }: UseSceneAnimationProps) {
  const { SLICE_VH } = SCROLL_CONFIG;

  // Generate one SceneRange per backdrop image — each gets its own dedicated scroll slice
  const sceneRanges: SceneRange[] = [];

  checkpoints.forEach((cp, i) => {
    const images = cp.scene_images?.length
      ? cp.scene_images
      : cp.scene_image ? [cp.scene_image] : [];

    if (images.length === 0) return;

    const startVH = getCheckpointStartVH(scrollables, i);

    images.forEach((imageUrl, imgIdx) => {
      // Each backdrop occupies its own slice window, stacked sequentially after the map pan slice
      const entryStartVH = startVH + SLICE_VH + imgIdx * SLICE_VH;
      const entryEndVH   = entryStartVH + SLICE_VH;

      // This backdrop is "active" until the next one starts (or until album exit)
      const totalSlices = sliceCount(scrollables[i], i);
      const endVH = startVH + totalSlices * SLICE_VH;
      const exitStartVH = imgIdx < images.length - 1
        ? entryEndVH // next backdrop starts immediately → this one exits
        : endVH;     // last backdrop holds until the album is done
      const exitEndVH = exitStartVH + SLICE_VH;

      sceneRanges.push({ cp, i, imageUrl, imageIndex: imgIdx, startVH, entryStartVH, entryEndVH, exitStartVH, exitEndVH });
    });
  });

  // Compute a combined "map displacement" value:
  // 0 = map fully visible, 1 = map fully off-screen
  const mapDisplacement = useTransform(smoothVH, (vh) => {
    for (const range of sceneRanges) {
      const { entryStartVH, entryEndVH, exitStartVH, exitEndVH } = range;
      // Entry: 0 → 1
      if (vh >= entryStartVH && vh < entryEndVH) {
        return (vh - entryStartVH) / SLICE_VH;
      }
      // Active: fully displaced
      if (vh >= entryEndVH && vh < exitStartVH) {
        return 1;
      }
      // Exit: 1 → 0
      if (vh >= exitStartVH && vh < exitEndVH) {
        return 1 - (vh - exitStartVH) / SLICE_VH;
      }
    }
    return 0;
  });

  // Map translateY: 0vh → 100vh
  const mapTranslateY = useTransform(mapDisplacement, [0, 1], ['0vh', '100vh']);

  return { mapTranslateY, sceneRanges };
}
