import { motion, type HTMLMotionProps, type MotionValue } from 'framer-motion';
import type { ReactNode } from 'react';
import { useStackSlide, type SlideDirection } from '../hooks/useStackSlide';

export interface StackSlideProps extends Omit<HTMLMotionProps<'div'>, 'animate' | 'initial' | 'transition'> {
  /**
   * Stack depth signal:
   *   0  = off-screen (before entry)
   *   1  = on top of the stack (fully visible)
   *  >1  = buried under subsequent photos
   */
  reveal: MotionValue<number>;

  // ── Entry displacement ─────────────────────────────────────────────────────
  direction?        : SlideDirection;
  revealDx?         : number;
  revealDy?         : number;
  revealScaleStart? : number;
  revealRotateStart?: number;

  // ── Resting position ───────────────────────────────────────────────────────
  baseX?      : number;
  baseY?      : number;
  baseRotate? : number;
  baseScale?  : number;
  baseOpacity?: number;
  zIndex?     : number;
  parallaxFactor?: number;

  children: ReactNode;
}

export function StackSlide({
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
  parallaxFactor,
  children,
  ...rest
}: StackSlideProps) {
  const { outerStyle, innerStyle, pointerEvents } = useStackSlide({
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
    parallaxFactor,
  });

  return (
    <motion.div style={{ position: 'absolute', inset: 0, zIndex, ...outerStyle }}>
      <motion.div
        className="scroll-slide"
        style={{ pointerEvents, ...innerStyle }}
        {...rest}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
