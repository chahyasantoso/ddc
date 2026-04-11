import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { ScrollSlide, type SlideDirection } from './ScrollSlide';
import { PhotoCard } from './PhotoCard';
import type { Checkpoint } from '../lib/types.client';

// ── Slot config ───────────────────────────────────────────────────────────────
interface SlotConfig {
  style    : CSSProperties; // absolute positioning within .floating-photos-zone
  direction: SlideDirection;
  rotate   : number;        // static tilt in degrees
}

// ── Desktop layouts (right 45% of viewport) ───────────────────────────────────
// Each key = total photo count for that checkpoint.
// Cards are staggered to create a natural "scattered on a desk" look.
const DESKTOP: Record<number, SlotConfig[]> = {
  1: [
    { style: { top: '18%', left: '6%',  width: '86%' }, direction: 'top',    rotate: -0.5 },
  ],
  2: [
    { style: { top: '8%',    left: '4%',  width: '64%' }, direction: 'top',    rotate: -2.0 },
    { style: { bottom: '8%', right: '4%', width: '62%' }, direction: 'bottom', rotate:  1.8 },
  ],
  3: [
    { style: { top: '8%',    left: '5%',  width: '54%' }, direction: 'top',    rotate: -1.8 },
    { style: { top: '36%',   right: '4%', width: '50%' }, direction: 'right',  rotate:  1.5 },
    { style: { bottom: '9%', left: '8%',  width: '52%' }, direction: 'bottom', rotate: -1.0 },
  ],
  4: [
    { style: { top: '4%',    left: '3%',  width: '47%' }, direction: 'top',    rotate: -2.0 },
    { style: { top: '4%',    right: '3%', width: '47%' }, direction: 'right',  rotate:  1.8 },
    { style: { bottom: '4%', left: '5%',  width: '47%' }, direction: 'bottom', rotate:  1.5 },
    { style: { bottom: '4%', right: '3%', width: '46%' }, direction: 'left',   rotate: -1.5 },
  ],
};

// ── Mobile layouts (bottom 48% of viewport) ───────────────────────────────────
// Only 2 cards visible — space is too narrow for more.
const MOBILE: SlotConfig[] = [
  { style: { top: 10, left: '4%',  width: '44%' }, direction: 'top',   rotate: -1.5 },
  { style: { top: 24, right: '4%', width: '44%' }, direction: 'right', rotate:  1.5 },
];

// ── Slot resolver ─────────────────────────────────────────────────────────────
function getSlot(index: number, totalCount: number, isMobile: boolean): SlotConfig {
  if (isMobile) {
    return MOBILE[index] ?? MOBILE[MOBILE.length - 1];
  }
  // Clamp to the max defined layout (4). Use last slot as fallback for extras.
  const layout = DESKTOP[Math.min(totalCount, 4)];
  return layout[index] ?? layout[layout.length - 1];
}

// ── Responsive hook ───────────────────────────────────────────────────────────
function useIsMobile(breakpoint = 768): boolean {
  // Safe to access window immediately — this component is client:only
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', update, { passive: true });
    return () => window.removeEventListener('resize', update);
  }, [breakpoint]);
  return isMobile;
}

// ── Component ─────────────────────────────────────────────────────────────────
interface FloatingPhotosProps {
  checkpoint: Checkpoint;
  /** Reveal value 0–1, computed by the parent from scroll progress */
  reveal: number;
}

/**
 * Renders the floating photo stack for one checkpoint.
 *
 * Layout adapts automatically to however many photos the checkpoint has:
 *   1 photo  → large, centered
 *   2 photos → upper-left + lower-right
 *   3 photos → staggered triangle
 *   4+ photos → 2×2 grid (extras are hidden to avoid overcrowding)
 *
 * On mobile: max 2 cards, side by side.
 */
export function FloatingPhotos({ checkpoint, reveal }: FloatingPhotosProps) {
  const isMobile = useIsMobile();
  const MAX      = isMobile ? 2 : 4;
  const photos   = checkpoint.photos.slice(0, MAX);
  const count    = photos.length;

  if (count === 0) return null;

  return (
    <>
      {photos.map((photo, pi) => {
        const slot = getSlot(pi, count, isMobile);
        return (
          <ScrollSlide
            key={photo.id}
            reveal={reveal}
            direction={slot.direction}
            rotate={slot.rotate}
            className="floating-photo-card"
            style={slot.style}
            whileHover={{
              rotate    : 0,
              scale     : 1.04,
              zIndex    : 30,
              transition: { type: 'spring', stiffness: 400, damping: 30 },
            }}
          >
            <PhotoCard photo={photo} />
          </ScrollSlide>
        );
      })}
    </>
  );
}
