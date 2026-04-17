import { motion, type HTMLMotionProps, type MotionValue } from 'framer-motion';
import type { ReactNode } from 'react';
import { useScrollSlide, type SlideDirection } from '../hooks/useScrollSlide';

export interface ScrollSlideProps extends Omit<HTMLMotionProps<'div'>, 'animate' | 'initial' | 'transition'> {
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
  /** Initial rotation (deg) when fully hidden (reveal=0). Defaults to 0 (straight) */
  revealRotateStart?: number;

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

export function ScrollSlide({
  reveal,
  direction,
  revealDx,
  revealDy,
  revealScaleStart,
  revealRotateStart,
  baseX,
  baseY,
  baseRotate,
  baseScale,
  baseOpacity,
  zIndex = 0,
  children,
  ...rest
}: ScrollSlideProps) {
  // Delegate all the math to our custom hook!
  const { outerStyle, innerStyle, pointerEvents } = useScrollSlide({
    reveal,
    direction,
    revealDx,
    revealDy,
    revealScaleStart,
    revealRotateStart,
    baseX,
    baseY,
    baseRotate,
    baseScale,
    baseOpacity,
  });

  return (
    <motion.div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex,
        pointerEvents: 'none',
        ...outerStyle, // Contains transform, opacity, willChange
      }}
    >
      <motion.div
        className="scroll-slide"
        style={{
          pointerEvents,
          ...innerStyle, // Contains strictly x, y, rotate, scale!
        }}
        {...rest}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
