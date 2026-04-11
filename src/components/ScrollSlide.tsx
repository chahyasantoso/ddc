import { motion, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
export type SlideDirection = 'top' | 'right' | 'bottom' | 'left';

// Pixel offsets representing the "fully hidden" position for each direction.
// When reveal=0, the element is translated this far off-screen.
// When reveal=1, x=0 and y=0 (natural CSS position).
const OFFSETS: Record<SlideDirection, { x: number; y: number }> = {
  top   : { x:    0, y: -1100 },
  right : { x:  900, y:     0 },
  bottom: { x:    0, y:  1100 },
  left  : { x: -900, y:     0 },
};

// Spring config — responsive but with a subtle physical feel
const SPRING = { type: 'spring', stiffness: 280, damping: 32, mass: 0.6 } as const;

// ── Props ─────────────────────────────────────────────────────────────────────
interface ScrollSlideProps extends Omit<HTMLMotionProps<'div'>, 'animate'> {
  /** 0 = fully off-screen, 1 = fully on-screen */
  reveal    : number;
  /** Which edge the element slides in/out from */
  direction : SlideDirection;
  /** Optional static rotation (degrees). Does NOT change during slide. */
  rotate?   : number;
  children  : ReactNode;
}

// ── Component ─────────────────────────────────────────────────────────────────
/**
 * Generic scroll-linked slide animation wrapper.
 *
 * The element's position is driven entirely by the `reveal` prop (0–1).
 * Caller is responsible for computing `reveal` from scroll progress.
 *
 * @example
 * <ScrollSlide reveal={0.7} direction="top" className="float-photo-0">
 *   <PhotoCard photo={photo} />
 * </ScrollSlide>
 */
export function ScrollSlide({
  reveal,
  direction,
  rotate = 0,
  children,
  ...rest
}: ScrollSlideProps) {
  const { x: ox, y: oy } = OFFSETS[direction];
  const t = 1 - reveal; // 1 = fully off-screen, 0 = fully on-screen

  return (
    <motion.div
      {...rest}
      animate={{ x: ox * t, y: oy * t, opacity: reveal, rotate }}
      transition={SPRING}
    >
      {children}
    </motion.div>
  );
}
