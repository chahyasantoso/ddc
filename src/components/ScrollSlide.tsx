import { motion, useMotionTemplate, useTransform, type HTMLMotionProps, type MotionValue } from 'framer-motion';
import type { ReactNode } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
export type SlideDirection = 'top' | 'right' | 'bottom' | 'left';

// Pixel offsets for the "fully hidden" state per direction.
// When reveal=0: element is translated this far from resting position.
// When reveal=1: element sits exactly at its baseX/baseY resting position.
const DIRECTION_OFFSETS: Record<SlideDirection, { x: number; y: number }> = {
  top   : { x:    0, y: -1100 },
  right : { x:  900, y:     0 },
  bottom: { x:    0, y:  1100 },
  left  : { x: -900, y:     0 },
};

// Default spring — responsive with a subtle physical feel
const DEFAULT_SPRING = { type: 'spring', stiffness: 280, damping: 32, mass: 0.6 } as const;

// ── Props ─────────────────────────────────────────────────────────────────────
interface ScrollSlideProps extends Omit<HTMLMotionProps<'div'>, 'animate'> {
  /** 0 = fully off-screen, 1 = fully on-screen */
  reveal     : MotionValue<number>;

  // ── Reveal displacement (how/where the card enters from) ──────────────────
  /** Slide from this cardinal direction (uses large preset offsets). */
  direction? : SlideDirection;
  /** Custom horizontal reveal displacement in px (overrides direction). */
  revealDx?  : number;
  /** Custom vertical   reveal displacement in px (overrides direction). */
  revealDy?  : number;
  /** Initial scale when fully hidden (reveal=0). Defaults to 0.85 */
  revealScaleStart?: number;

  // ── Deck resting position (where the card sits when reveal=1) ─────────────
  /** Horizontal offset from the deck origin when fully revealed. */
  baseX?     : number;
  /** Vertical   offset from the deck origin when fully revealed. */
  baseY?     : number;
  /** Rotation (deg) when fully revealed. */
  baseRotate?: number;
  /** Scale when fully revealed. Defaults to 1. */
  baseScale? : number;
  /** Opacity when fully revealed. Defaults to 1. */
  baseOpacity?: number;
  /** Z-index of the slide deck wrapper. Defaults to 0. */
  zIndex?    : number;

  children   : ReactNode;
}

// ── Component ─────────────────────────────────────────────────────────────────
/**
 * Generic scroll-linked animation wrapper.
 *
 * Drives position (x, y, rotate, scale, opacity) from a single `reveal` (0–1).
 *
 * Two use cases:
 *  1. Simple slide-in:      pass `direction="top"` (uses large preset offset)
 *  2. Card deck position:   pass `baseX/Y/Rotate/Scale/Opacity` + `revealDx/Dy`
 *
 * @example — simple slide
 *   <ScrollSlide reveal={0.7} direction="top">
 *     <PhotoCard photo={photo} />
 *   </ScrollSlide>
 *
 * @example — in a card deck
 *   <ScrollSlide reveal={reveal} revealDx={280} revealDy={0}
 *                baseX={10} baseY={8} baseRotate={3} baseScale={0.96}>
 *     <PhotoCard photo={photo} />
 *   </ScrollSlide>
 */
export function ScrollSlide({
  reveal,
  direction,
  revealDx,
  revealDy,
  revealScaleStart = 0.85,
  baseX      = 0,
  baseY      = 0,
  baseRotate = 0,
  baseScale  = 1,
  baseOpacity = 1,
  zIndex     = 0,
  children,
  ...rest
}: ScrollSlideProps) {
  // Map reveal to a 't' inverse progress (0 = visible at rest, 1 = fully displaced)
  const t = useTransform(reveal, r => 1 - r);

  // Resolve reveal displacement: explicit dx/dy wins; fallback to direction preset
  const preset = direction ? DIRECTION_OFFSETS[direction] : { x: 0, y: 0 };
  const dx = revealDx ?? preset.x;
  const dy = revealDy ?? preset.y;

  // Interpolate directly on the MotionValue
  const translateX = useTransform(t, tVal => dx * tVal);
  const translateY = useTransform(t, tVal => dy * tVal);
  const scale = useTransform(reveal, r => revealScaleStart + (1 - revealScaleStart) * r);
  const opacity = useTransform(reveal, r => Math.max(0, r * baseOpacity)); // Ensure opacity drops to exactly 0 to allow visibility to hide
  
  // Transform string constructed entirely outside React render loop
  const transform = useMotionTemplate`translate(${translateX}px, ${translateY}px) scale(${scale})`;

  return (
    <motion.div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex,
        transform,
        opacity,
        willChange: 'transform, opacity',
        pointerEvents: 'none',
      }}
    >
      <motion.div
        className="scroll-slide"
        style={{
          pointerEvents: useTransform(reveal, r => r > 0.1 ? 'auto' : 'none') as any,
        }}
        {...rest}
        transition={rest.transition || DEFAULT_SPRING}
        initial={{
          x      : baseX,
          y      : baseY,
          rotate : baseRotate,
          scale  : baseScale,
        }}
        animate={{
          x      : baseX,
          y      : baseY,
          rotate : baseRotate,
          scale  : baseScale,
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
