import { motion, type HTMLMotionProps, type MotionValue } from 'framer-motion';
import type { ReactNode } from 'react';
import { useScrollSlide } from '../hooks/useScrollSlide';

export interface ScrollSlideProps extends Omit<HTMLMotionProps<'div'>, 'animate' | 'initial' | 'transition'> {
  /**
   * Lifecycle progress:
   *   0 = off-screen before entry
   *   1 = resting on screen
   *   2 = off-screen after exit
   */
  reveal: MotionValue<number>;

  // ── Entry displacement (where the element comes from) ─────────────────────
  entryDx?: number;
  entryDy?: number;
  /** Scale when fully hidden at entry (reveal=0). Defaults to 1. */
  entryScaleStart?: number;

  // ── Exit displacement (where the element goes to) ─────────────────────────
  exitDx?: number;
  exitDy?: number;

  baseOpacity?   : number;
  parallaxFactor?: number;
  zIndex?        : number;
  children       : ReactNode;
}

export function ScrollSlide({
  reveal,
  entryDx,
  entryDy,
  exitDx,
  exitDy,
  entryScaleStart,
  baseOpacity,
  parallaxFactor,
  zIndex = 0,
  children,
  ...rest
}: ScrollSlideProps) {
  const { style } = useScrollSlide({
    reveal,
    entryDx,
    entryDy,
    exitDx,
    exitDy,
    entryScaleStart,
    baseOpacity,
    parallaxFactor,
  });

  return (
    <motion.div
      style={{ position: 'absolute', inset: 0, zIndex, ...style }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
