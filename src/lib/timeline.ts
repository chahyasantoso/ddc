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
    // For CP0 Photo0, it arrives during map zoom (offset = -1).
    // For all other photos, offset = absoluteIdx.
    const offsetIdx = (index === 0 && absoluteIdx === 0) ? -1 : absoluteIdx;
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
        // coverVH is based on the arrival of the NEXT photo.
        // We use the same offset logic for the next photo's arrival time.
        const nextOffsetIdx = (index === 0 && nextPolaroidIdx === 0) ? -1 : nextPolaroidIdx;
        directive.coverVH = startVH + nextOffsetIdx * budget;
      }
    } else {
      // Find the next backdrop to determine when this one exits
      const nextBackdrop = cp.photos.find((p, k) => k > absoluteIdx && p.is_backdrop === 1);
      const nextOffsetIdx = nextBackdrop 
        ? ((index === 0 && cp.photos.indexOf(nextBackdrop) === 0) ? -1 : cp.photos.indexOf(nextBackdrop))
        : totalSlices; // fallback to end of checkpoint
      
      directive.exitStartVH = startVH + nextOffsetIdx * budget;
      directive.exitEndVH = directive.exitStartVH + SLICE_VH;
    }

    directives.push(directive);
  });

  return directives;
}
