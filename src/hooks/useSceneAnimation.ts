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
  startVH: number;
  entryStartVH: number;
  entryEndVH: number;
  exitStartVH: number;
  exitEndVH: number;
}

export function useSceneAnimation({ checkpoints, scrollables, smoothVH }: UseSceneAnimationProps) {
  const { SLICE_VH } = SCROLL_CONFIG;

  // Find all scene checkpoints and their VH ranges
  const sceneRanges: SceneRange[] = checkpoints
    .map((cp, i) => {
      if (!cp.scene_image) return null;
      const startVH = getCheckpointStartVH(scrollables, i);
      const totalSlices = sliceCount(scrollables[i], i);
      const endVH = startVH + totalSlices * SLICE_VH;
      
      // Map panning happens at [startVH, startVH + SLICE_VH]
      // Scene entry transition happens immediately after map arrives:
      const entryStartVH = startVH + SLICE_VH;
      const entryEndVH = startVH + SLICE_VH * 2;
      
      // Scene exit transition happens exactly when the photo album exits
      const exitStartVH = endVH;
      const exitEndVH = endVH + SLICE_VH;
      
      return { cp, i, startVH, entryStartVH, entryEndVH, exitStartVH, exitEndVH };
    })
    .filter((r): r is SceneRange => r !== null);

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
