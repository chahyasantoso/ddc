import { useMotionTemplate, useTransform, type MotionValue } from 'framer-motion';

export type SlideDirection = 'top' | 'right' | 'bottom' | 'left';

const DIRECTION_OFFSETS: Record<SlideDirection, { x: number; y: number }> = {
  top: { x: 0, y: -1100 },
  right: { x: 900, y: 0 },
  bottom: { x: 0, y: 1100 },
  left: { x: -900, y: 0 },
};

interface UseStackSlideOptions {
  /**
   * Stack depth signal:
   *   0  = off-screen (before entry)
   *   1  = on top of the stack (fully visible)
   *  >1  = buried under subsequent photos (depth = reveal - 1)
   */
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
  parallaxFactor?: number;
}

export function useStackSlide({
  reveal,
  direction,
  revealDx,
  revealDy,
  revealScaleStart = 0.85,
  revealRotateStart = 0,
  baseX = 0,
  baseY = 0,
  baseRotate = 0,
  baseScale = 1,
  baseOpacity = 1,
  parallaxFactor = 1,
}: UseStackSlideOptions) {
  const clampedReveal = useTransform(reveal, r => Math.min(1, r));
  const t = useTransform(clampedReveal, r => 1 - r);

  const preset = direction ? DIRECTION_OFFSETS[direction] : { x: 0, y: 0 };
  const dx = revealDx ?? preset.x;
  const dy = revealDy ?? preset.y;

  // ── Outer Layer: Position ──────────────────────────────────────────────────
  const translateX = useTransform(t, tVal => dx * tVal * parallaxFactor);
  const translateY = useTransform(t, tVal => dy * tVal * parallaxFactor);
  const scale      = useTransform(clampedReveal, r => revealScaleStart + (1 - revealScaleStart) * r);

  const opacity = useTransform(reveal, r => {
    if (r <= 1) return Math.max(0, r * baseOpacity);
    // Stack-depth fade: gradually disappear when buried (> 3 layers deep)
    const fadeStart = 3;
    const fadeEnd   = 5;
    if (r <= fadeStart) return baseOpacity;
    if (r >= fadeEnd)   return 0;
    return baseOpacity * (1 - (r - fadeStart) / (fadeEnd - fadeStart));
  });

  const outerTransform = useMotionTemplate`translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`;

  // ── Inner Layer: Rotation & Stack Parallax ────────────────────────────────
  // Smoothly interpolates: entry tilt → straight at rest → resting tilt when stacked
  const childRotate = useTransform(reveal, [0, 1, 2], [revealRotateStart, 0, baseRotate]);

  // Push photo upward and shrink as more photos pile on top
  const childTranslateY = useTransform(reveal, r => {
    if (r <= 1) return baseY;
    return baseY - (r - 1) * 35; // 35px per stack layer
  });

  const childScale = useTransform(reveal, r => {
    if (r <= 1) return baseScale;
    return Math.max(0.8, baseScale - (r - 1) * 0.03); // shrink 3% per layer
  });

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
      y: childTranslateY,
      rotate: childRotate,
      scale: childScale,
    },
    pointerEvents: pe,
  };
}
