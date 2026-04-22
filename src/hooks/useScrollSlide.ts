import { useTransform, type MotionValue } from 'framer-motion';

interface UseScrollSlideOptions {
  /**
   * Lifecycle progress:
   *   0 = off-screen before entry
   *   1 = resting on screen
   *   2 = off-screen after exit
   */
  reveal: MotionValue<number>;
  entryDx?: number;
  entryDy?: number;
  exitDx?: number;
  exitDy?: number;
  /** Scale when fully hidden at entry (reveal=0). Defaults to 1 (no scale). */
  entryScaleStart?: number;
  baseOpacity?: number;
  parallaxFactor?: number;
}

export function useScrollSlide({
  reveal,
  entryDx = 0,
  entryDy = 0,
  exitDx = 0,
  exitDy = 0,
  entryScaleStart = 1,
  baseOpacity = 1,
  parallaxFactor = 1,
}: UseScrollSlideOptions) {
  const x = useTransform(reveal, r => {
    if (r < 1) return entryDx * (1 - r) * parallaxFactor; // Entry: slides in
    if (r > 1) return exitDx  * Math.min(1, r - 1);       // Exit:  slides out
    return 0;
  });

  const y = useTransform(reveal, r => {
    if (r < 1) return entryDy * (1 - r) * parallaxFactor;
    if (r > 1) return exitDy  * Math.min(1, r - 1);
    return 0;
  });

  const scale = useTransform(reveal, r => {
    const clamped = Math.min(1, r);
    return entryScaleStart + (1 - entryScaleStart) * clamped;
  });

  const opacity = useTransform(reveal, r => {
    if (r <= 1) return Math.max(0, r * baseOpacity); // Fade in on entry
    return baseOpacity * Math.max(0, 2 - r);         // Fade out on exit (1→2)
  });

  return {
    style: { x, y, scale, opacity, willChange: 'transform, opacity' },
  };
}
