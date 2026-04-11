import { motion, type HTMLMotionProps } from 'framer-motion';
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
  reveal     : number;

  // ── Reveal displacement (how/where the card enters from) ──────────────────
  /** Slide from this cardinal direction (uses large preset offsets). */
  direction? : SlideDirection;
  /** Custom horizontal reveal displacement in px (overrides direction). */
  revealDx?  : number;
  /** Custom vertical   reveal displacement in px (overrides direction). */
  revealDy?  : number;

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
  baseX      = 0,
  baseY      = 0,
  baseRotate = 0,
  baseScale  = 1,
  baseOpacity = 1,
  children,
  ...rest
}: ScrollSlideProps) {
  const t = 1 - reveal; // 0 = visible at rest, 1 = fully displaced

  // Resolve reveal displacement: explicit dx/dy wins; fallback to direction preset
  const preset = direction ? DIRECTION_OFFSETS[direction] : { x: 0, y: 0 };
  const dx = revealDx ?? preset.x;
  const dy = revealDy ?? preset.y;

  return (
    <motion.div
      // Allow caller to override spring via transition prop
      transition={DEFAULT_SPRING}
      {...rest}
      animate={{
        x      : baseX + dx * t,
        y      : baseY + dy * t,
        rotate : baseRotate,
        scale  : baseScale,
        opacity: reveal * baseOpacity,
      }}
    >
      {children}
    </motion.div>
  );
}
