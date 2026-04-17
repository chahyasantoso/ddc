import { useMotionTemplate, useTransform, type MotionValue } from 'framer-motion';

export type SlideDirection = 'top' | 'right' | 'bottom' | 'left';

const DIRECTION_OFFSETS: Record<SlideDirection, { x: number; y: number }> = {
  top   : { x:    0, y: -1100 },
  right : { x:  900, y:     0 },
  bottom: { x:    0, y:  1100 },
  left  : { x: -900, y:     0 },
};

interface UseScrollSlideOptions {
  reveal: MotionValue<number>;
  direction?: SlideDirection;
  revealDx?: number;
  revealDy?: number;
  revealScaleStart?: number;
  revealRotateStart?: number;
  baseX?: number;
  baseY?: number;
  baseRotate?: number;
  baseScale?: number;
  baseOpacity?: number;
}

export function useScrollSlide({
  reveal,
  direction,
  revealDx,
  revealDy,
  revealScaleStart = 0.85,
  revealRotateStart = 0, // Starts straight by default!
  baseX = 0,
  baseY = 0,
  baseRotate = 0,
  baseScale = 1,
  baseOpacity = 1,
}: UseScrollSlideOptions) {
  // Clamp reveal to 1 for position/scale calculations, so it doesn't overshoot when 'reveal' hits 2
  const clampedReveal = useTransform(reveal, r => Math.min(1, r));

  // Map reveal to a 't' inverse progress (0 = visible at rest, 1 = fully displaced)
  const t = useTransform(clampedReveal, r => 1 - r);

  // Resolve reveal displacement: explicit dx/dy wins; fallback to direction preset
  const preset = direction ? DIRECTION_OFFSETS[direction] : { x: 0, y: 0 };
  const dx = revealDx ?? preset.x;
  const dy = revealDy ?? preset.y;

  // ── Outer Layer: Handles the "Slide Arrival" ─────────────────────────────────
  const translateX = useTransform(t, tVal => dx * tVal);
  const translateY = useTransform(t, tVal => dy * tVal);
  const scale = useTransform(clampedReveal, r => revealScaleStart + (1 - revealScaleStart) * r);
  const opacity = useTransform(clampedReveal, r => Math.max(0, r * baseOpacity)); // Drops to exactly 0
  
  const outerTransform = useMotionTemplate`translate(${translateX}px, ${translateY}px) scale(${scale})`;

  // ── Inner Layer: Handles the "Identity & Spiraling" ──────────────────────────
  // Interpolates smoothly: 0 (tilt on entry) -> 1 (straight to read) -> 2 (messy rest tilt)
  const childRotate = useTransform(reveal, [0, 1, 2], [revealRotateStart, 0, baseRotate]);

  const pe = useTransform(reveal, r => r > 0.1 ? 'auto' : 'none') as MotionValue<any>;

  return {
    outerStyle: {
      transform: outerTransform,
      opacity,
      willChange: 'transform, opacity',
      pointerEvents: pe,
    },
    innerStyle: {
      x: baseX,
      y: baseY,
      rotate: childRotate, 
      scale: baseScale,
    },
    pointerEvents: pe,
  };
}
