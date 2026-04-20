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

  const sceneRanges: SceneRange[] = [];
  // We'll track the global min map displacement ranges
  // Array of [startVH, endVH] where the map should be fully displaced
  const mapDisplacementRanges: { start: number; end: number }[] = [];

  checkpoints.forEach((cp, i) => {
    const startVH = getCheckpointStartVH(scrollables, i);
    const totalSlices = sliceCount(scrollables[i], i);
    const endVH = startVH + totalSlices * SLICE_VH;

    // Filter out only the backdrops, but keep their absolute index
    const backdrops = (cp.photos || [])
      .map((photo, index) => ({ photo, index }))
      .filter((item) => item.photo.is_backdrop === 1);

    if (backdrops.length === 0) return;

    // The map slides down when the FIRST backdrop enters
    const firstBackdropEntryStartVH = startVH + (backdrops[0].index - (i === 0 ? 1 : 0)) * SLICE_VH;
    // Map stays completely displaced until the checkpoint ends
    mapDisplacementRanges.push({
      start: firstBackdropEntryStartVH,
      end: endVH,
    });

    backdrops.forEach((b, idx) => {
      // Entry matches its absolute timeline index
      const entryStartVH = startVH + (b.index - (i === 0 ? 1 : 0)) * SLICE_VH;
      const entryEndVH = entryStartVH + SLICE_VH;

      // This backdrop remains active as the background until the NEXT backdrop arrives (or checkpoint ends)
      const nextBackdrop = backdrops[idx + 1];
      const exitStartVH = nextBackdrop
        ? startVH + (nextBackdrop.index - (i === 0 ? 1 : 0)) * SLICE_VH
        : endVH;
      const exitEndVH = exitStartVH + SLICE_VH;

      sceneRanges.push({
        cp,
        i,
        imageUrl: b.photo.photo_url,
        imageIndex: b.index, // Absolute index ensures it mounts exactly once and stays keyed
        startVH,
        entryStartVH,
        entryEndVH,
        exitStartVH,
        exitEndVH,
      });
    });
  });

  // Calculate the dynamic map displacement factor (0 = map visible, 1 = map displaced)
  const mapDisplacement = useTransform(smoothVH, (vh) => {
    for (const range of mapDisplacementRanges) {
      // 0 -> 1 during entry of the very first backdrop
      if (vh >= range.start && vh < range.start + SLICE_VH) {
        return (vh - range.start) / SLICE_VH;
      }
      // 1 (fully displaced) while backdrops are active, even if polaroids are flying in front
      if (vh >= range.start + SLICE_VH && vh < range.end) {
        return 1;
      }
      // 1 -> 0 during checkout exit
      if (vh >= range.end && vh < range.end + SLICE_VH) {
        return 1 - (vh - range.end) / SLICE_VH;
      }
    }
    return 0;
  });

  const mapTranslateY = useTransform(mapDisplacement, [0, 1], ['0vh', '100vh']);

  return { mapTranslateY, sceneRanges };
}
