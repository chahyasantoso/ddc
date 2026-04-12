/**
 * Shared scroll constants and math to ensure perfect synchronization 
 * between the Map Libre coordinates and the React Scrollytelling UI.
 */

export const SCROLL_CONFIG = {
  // Distance (in vh) between the exact center of each checkpoint
  VH_PER_CHECKPOINT: 200,

  // Radius (in vh) around the center where the timeline is considered 'Parked'
  // Both the photo and the map marker will not move dynamically while within this range.
  PARKED_TOLERANCE: 20,

  // Distance (in vh) it takes for a photo deck to completely slide-in / slide-out
  FADE_DURATION: 60,
};

/**
 * Total native scrollable height needed for the entire journey.
 * Map's progress multiplier and DOM container height scale off this exact value.
 */
export function getTotalVH(numCheckpoints: number) {
  return Math.max(0, (numCheckpoints - 1) * SCROLL_CONFIG.VH_PER_CHECKPOINT);
}

/**
 * Calculates the exact scroll VH where a checkpoint is perfectly centered.
 */
export function getCheckpointCenter(index: number) {
  return index * SCROLL_CONFIG.VH_PER_CHECKPOINT;
}
