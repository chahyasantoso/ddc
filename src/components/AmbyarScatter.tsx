import { motion, useTransform, type MotionValue } from 'framer-motion';
import type { ReactNode } from 'react';

// ── Deterministic scatter presets ─────────────────────────────────────────────
// Each photo gets a unique scatter direction based on its index.
const SCATTER_PRESETS = [
  { dx: -250, dy: -300, rotate: -45 },
  { dx:  300, dy: -150, rotate:  60 },
  { dx: -350, dy:  200, rotate: -80 },
  { dx:  200, dy: -400, rotate:  30 },
  { dx:    0, dy: -350, rotate: -90 },
];

interface AmbyarScatterProps {
  /** 0 = resting, 1 = fully scattered */
  exitProgress: MotionValue<number>;
  /** Index used to pick a deterministic scatter direction */
  index: number;
  children: ReactNode;
}

/**
 * Composable wrapper that applies a "scatter/ambyar" effect to its children.
 * 
 * When `exitProgress` is 0, the children render in their normal position.
 * As `exitProgress` goes from 0 → 1, the children fly outward in a unique
 * direction (based on `index`) while rotating and fading out.
 *
 * Usage:
 * ```tsx
 * <AmbyarScatter exitProgress={albumExitProgress} index={photoIdx}>
 *   <PhotoSlide ... />
 * </AmbyarScatter>
 * ```
 */
export function AmbyarScatter({ exitProgress, index, children }: AmbyarScatterProps) {
  const preset = SCATTER_PRESETS[index % SCATTER_PRESETS.length];

  const x = useTransform(exitProgress, [0, 1], [0, preset.dx]);
  const y = useTransform(exitProgress, [0, 1], [0, preset.dy]);
  const rotate = useTransform(exitProgress, [0, 1], [0, preset.rotate]);
  const scale = useTransform(exitProgress, [0, 1], [1, 0.6]);
  const opacity = useTransform(exitProgress, [0, 0.6, 1], [1, 0.8, 0]);

  return (
    <motion.div
      style={{
        position: 'absolute',
        inset: 0,
        x, y, rotate, scale, opacity,
        willChange: 'transform, opacity',
      }}
    >
      {children}
    </motion.div>
  );
}
