import { SCROLL_CONFIG, sliceCount, type ScrollableCheckpoint } from './scrollUtils';
import type { Checkpoint, AnimationDirective } from './types.client';

/**
 * The "Stage Manager" for scrollytelling.
 * 
 * Processes a checkpoint's raw data and generates explicit scroll-VH directives 
 * for every backdrop and polaroid. This decouples the components from the 
 * underlying array structure and solves the "push-back" timing issues.
 */
export function planCheckpointTimeline(
  cp: Checkpoint,
  startVH: number,
  index: number, // Checkpoint index
  scrollables: ScrollableCheckpoint[]
): AnimationDirective[] {
  const { SLICE_VH, REST_VH } = SCROLL_CONFIG;
  const budget = SLICE_VH + REST_VH;
  const totalItems = cp.photos.length;
  const totalSlices = sliceCount(scrollables[index], index);
  const endVH = startVH + totalSlices * budget;

  const directives: AnimationDirective[] = [];

  // Pre-calculate indices for polaroids (photos that stack)
  const polaroidIndices = cp.photos
    .map((p, idx) => ({ p, idx }))
    .filter(item => item.p.is_backdrop !== 1)
    .map(item => item.idx);

  cp.photos.forEach((photo, absoluteIdx) => {
    // Relative offset from the checkpoint's start
    const offsetIdx = absoluteIdx - (index === 0 ? 1 : 0);
    const arriveStart = startVH + offsetIdx * budget;
    const arriveEnd = arriveStart + SLICE_VH;

    const directive: AnimationDirective = {
      id: `photo-${photo.id}`,
      type: photo.is_backdrop === 1 ? 'backdrop' : 'photo',
      startVH: arriveStart,
      endVH: arriveEnd,
    };

    if (directive.type === 'photo') {
      // Find the next polaroid to determine when this one gets pushed back/covered
      const nextPolaroidIdx = polaroidIndices.find(idx => idx > absoluteIdx);
      if (nextPolaroidIdx !== undefined) {
        directive.coverVH = startVH + (nextPolaroidIdx - (index === 0 ? 1 : 0)) * budget;
      }
    } else {
      // Find the next backdrop to determine when this one exits
      const nextBackdrop = cp.photos.find((p, k) => k > absoluteIdx && p.is_backdrop === 1);
      directive.exitStartVH = nextBackdrop 
        ? startVH + (cp.photos.indexOf(nextBackdrop) - (index === 0 ? 1 : 0)) * budget
        : endVH;
      directive.exitEndVH = directive.exitStartVH + SLICE_VH;
    }

    directives.push(directive);
  });

  return directives;
}
