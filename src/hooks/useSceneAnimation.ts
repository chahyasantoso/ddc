import { type MotionValue } from 'framer-motion';
import { getCheckpointStartVH, sliceCount, type ScrollableCheckpoint, SCROLL_CONFIG } from '../lib/scrollUtils';
import { planCheckpointTimeline } from '../lib/timeline';
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
  const sceneRanges: SceneRange[] = [];
  const mapDisplacementRanges: { start: number; end: number }[] = [];

  checkpoints.forEach((cp, i) => {
    const startVH = getCheckpointStartVH(scrollables, i);
    const directives = planCheckpointTimeline(cp, startVH, i, scrollables);
    
    const backdrops = directives.filter(d => d.type === 'backdrop');
    if (backdrops.length === 0) return;

    // Map must be displaced entirely while ANY backdrop is active
    // endVH for the checkpoint is (startVH + budget_for_all_slices)
    const { SLICE_VH, REST_VH } = SCROLL_CONFIG;
    const endVH = startVH + sliceCount(scrollables[i], i) * (SLICE_VH + REST_VH);

    mapDisplacementRanges.push({
      start: backdrops[0].startVH,
      end: endVH,
    });

    backdrops.forEach((d) => {
      // Find the original photo object to get the URL
      // (Directives are mapped 1:1 to cp.photos)
      const photoIdx = directives.indexOf(d);
      const photo = cp.photos[photoIdx];

      sceneRanges.push({
        cp,
        i,
        imageUrl: photo.photo_url,
        imageIndex: photoIdx,
        startVH,
        entryStartVH: d.startVH,
        entryEndVH: d.endVH,
        exitStartVH: d.exitStartVH ?? endVH,
        exitEndVH: d.exitEndVH ?? (endVH + SLICE_VH),
      });
    });
  });

  return { mapDisplacementRanges, sceneRanges };
}
