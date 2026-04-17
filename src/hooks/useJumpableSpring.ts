import { useEffect, useRef } from 'react';
import { useMotionValue, useSpring, type MotionValue } from 'framer-motion';

/**
 * Drop-in replacement for useSpring() that can be temporarily bypassed.
 *
 * When a 'ddc:jump-state' event fires with { jumping: true }, the spring
 * is skipped so that instant-scroll jumps don't visibly animate through
 * intermediate states (the "fast-forward" glitch).
 *
 * On mount, the spring starts as bypassed (isJumping = true) so that
 * browser scroll restoration (which fires before React hydration) doesn't
 * trigger an unwanted initial spring animation.
 */
export function useJumpableSpring(
  sourceValue: MotionValue<number>,
  config: Parameters<typeof useSpring>[1],
): MotionValue<number> {
  const targetValue = useMotionValue(sourceValue.get());
  const smoothValue = useSpring(targetValue, config);
  const isJumping = useRef(true); // Start bypassed for scroll restoration

  useEffect(() => {
    // Release the initial bypass after a short delay to allow page to settle
    const settleTimeout = setTimeout(() => {
      isJumping.current = false;
    }, 200);

    const handleJump = (e: Event) => {
      isJumping.current = (e as CustomEvent<{ jumping: boolean }>).detail.jumping;
    };
    window.addEventListener('ddc:jump-state', handleJump);

    return () => {
      clearTimeout(settleTimeout);
      window.removeEventListener('ddc:jump-state', handleJump);
    };
  }, []);

  useEffect(() => {
    const initial = sourceValue.get();
    targetValue.set(initial);
    if ((smoothValue as any).jump) (smoothValue as any).jump(initial);

    const unsub = sourceValue.on('change', (latest) => {
      targetValue.set(latest);
      if (isJumping.current) {
        // jump() bypasses internal velocity; set() is the fallback
        if ((smoothValue as any).jump) {
          (smoothValue as any).jump(latest);
        } else {
          (smoothValue as any).set(latest);
        }
      }
    });
    return unsub;
  }, [sourceValue, targetValue, smoothValue]);

  return smoothValue;
}
