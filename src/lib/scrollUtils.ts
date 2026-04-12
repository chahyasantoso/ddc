/**
 * Shared scroll constants and math to ensure perfect synchronization 
 * between the Map Libre coordinates and the React Scrollytelling UI.
 */
import { useEffect, useRef } from 'react';
import { useMotionValue, animate, type MotionValue } from 'framer-motion';

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

/**
 * Global jump dispatcher to bypass visual transitions temporarily.
 * Used when jumping to non-sequential checkpoints.
 */
export function triggerScrollyJump(targetIndex: number, isSequential: boolean) {
  const el = document.getElementById(`checkpoint-snap-${targetIndex}`);
  if (!el) return;

  if (isSequential) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    // Dispatch event to temporarily disable spring animations
    window.dispatchEvent(new CustomEvent('ddc:jump-state', { detail: { jumping: true } }));
    
    // Calculate the jump point (85vh before or after the target center)
    // 20vh (parked) + 60vh (fade) = 80vh where opacity becomes 0. We add +5 for safe invisible margin.
    const vhPx = window.innerHeight / 100;
    const preJumpOffsetVh = SCROLL_CONFIG.PARKED_TOLERANCE + SCROLL_CONFIG.FADE_DURATION + 5;
    const offsetPx = preJumpOffsetVh * vhPx;
    
    const targetCenterY = el.getBoundingClientRect().top + window.scrollY;
    
    // Determine scroll direction: are we currently above or below the target?
    const isJumpingDown = targetCenterY > window.scrollY;
    
    // If we are jumping down, we want to arrive from ABOVE the target (targetCenterY - offset).
    // If we are jumping up, we want to arrive from BELOW the target (targetCenterY + offset).
    // This brilliantly prevents seeing the Hero section when jumping UP to the very first checkpoint (Surabaya)!
    const targetY = isJumpingDown ? targetCenterY - offsetPx : targetCenterY + offsetPx;

    // Use instant scroll to leap over intermediate content to the pre-animation point
    window.scrollTo({ top: targetY, behavior: 'instant' });
    
    // Give native scroll and Framer motion projection a tiny window to settle
    requestAnimationFrame(() => {
      setTimeout(() => {
        // Re-enable the animations
        window.dispatchEvent(new CustomEvent('ddc:jump-state', { detail: { jumping: false } }));
        
        // Immediately start the final approach using smooth scrolling!
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    });
  }
}

import { useSpring } from 'framer-motion';

/**
 * Drop-in replacement for useSpring() that can be temporarily bypassed.
 * When a custom jump event fires, we instantly set the value instead of animating.
 */
export function useJumpableSpring(sourceValue: MotionValue<number>, config: any) {
  const targetValue = useMotionValue(sourceValue.get());
  const smoothValue = useSpring(targetValue, config);
  // Start as true so that initial browser scroll restoration skips the spring animation
  const isJumping = useRef(true); 

  // Listen for jump events and handle mount settling
  useEffect(() => {
    // Disable jumping shortly after mount once scroll positions have settled
    const settleTimeout = setTimeout(() => {
      isJumping.current = false;
    }, 200);

    const handleJump = (e: any) => {
      isJumping.current = e.detail.jumping;
    };
    window.addEventListener('ddc:jump-state', handleJump);
    return () => {
      clearTimeout(settleTimeout);
      window.removeEventListener('ddc:jump-state', handleJump);
    }
  }, []);

  // Sync logic
  useEffect(() => {
    // Initial sync
    const initial = sourceValue.get();
    targetValue.set(initial);
    if ((smoothValue as any).jump) {
      (smoothValue as any).jump(initial);
    }

    const unsub = sourceValue.on("change", (latest) => {
      targetValue.set(latest); // Always track
      if (isJumping.current) {
        // If we are jumping, forcefully bypass the spring animation!
        if ((smoothValue as any).jump) {
          (smoothValue as any).jump(latest);
        }
      }
    });

    return unsub;
  }, [sourceValue, targetValue, smoothValue]);

  return smoothValue;
}
