import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Checkpoint, Photo } from '../lib/types.client';

// ── Off-screen departure points per direction ─────────────────────────────────
type Dir = 'top' | 'right' | 'bottom' | 'left';
const OFF: Record<Dir, [number, number]> = {
  top   : [0,    -900],
  right : [900,  0   ],
  bottom: [0,    900 ],
  left  : [-900, 0   ],
};

// ── Stack slot config: deepest → front ───────────────────────────────────────
// When reveal=0 all cards fly from their direction off-screen.
// When reveal=1 all cards land simultaneously at their resting positions,
// forming a shuffled photo stack.
//
// restX/restY : resting offset (px) from normal position — creates the "peek"
// rotate      : static tilt (degrees) for the shuffled-polaroid look
// z           : CSS z-index (3 = front card, on top of everything)
const SLOTS = [
  { dir: 'left'   as Dir, restX: 18, restY: 10, rotate: -5,  z: 1 }, // deepest peek
  { dir: 'bottom' as Dir, restX: 9,  restY: 5,  rotate:  3,  z: 2 }, // mid peek
  { dir: 'top'    as Dir, restX: 0,  restY: 0,  rotate:  0,  z: 3 }, // front card
] as const;

// Shared spring config — feels physical, not snappy
const SPRING = { type: 'spring', stiffness: 220, damping: 28, mass: 0.8 } as const;

// ── Hook ──────────────────────────────────────────────────────────────────────
function useIsMobile(bp = 768) {
  const [v, set] = useState(() => window.innerWidth < bp);
  useEffect(() => {
    const update = () => set(window.innerWidth < bp);
    window.addEventListener('resize', update, { passive: true });
    return () => window.removeEventListener('resize', update);
  }, [bp]);
  return v;
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  checkpoint: Checkpoint;
  reveal    : number; // 0–1 from scrollReveal — ALL cards use this same value
}

/**
 * Floating photo stack — all photos converge simultaneously from different
 * directions and form a polaroid-style stack.
 *
 * Slot entry directions:
 *   deepest peek → slides in from LEFT
 *   mid peek     → rises up from BOTTOM
 *   front card   → drops down from TOP  ← most dramatic, reveals last "on top"
 *
 * Navigation: prev/next buttons + dot indicators browse ALL photos.
 * Peek cards are clickable to jump to that photo.
 */
export function FloatingPhotos({ checkpoint, reveal }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const photos = checkpoint.photos;
  const total  = photos.length;

  if (!total) return null;

  // Number of visible stack layers (max 3, bounded by total photos)
  const visibleCount = Math.min(3, total);
  // Use the last N slots — always keeps the "front card" slot last
  const slots        = SLOTS.slice(SLOTS.length - visibleCount);
  const frontSlot    = slots.length - 1;

  const goTo = (i: number) => setActiveIdx(((i % total) + total) % total);

  // Which photo to show in slot `si`:
  //   frontSlot     → activeIdx        (front card = current photo)
  //   frontSlot - 1 → activeIdx + 1   (first peek  = next photo)
  //   frontSlot - 2 → activeIdx + 2   (deeper peek = photo after next)
  const photoAt = (si: number): Photo =>
    photos[(activeIdx + (frontSlot - si)) % total];

  return (
    <div className="photo-stack-wrapper">
      {/* ── Card stack ──────────────────────────────────────────────── */}
      <div className="ps-deck">
        {slots.map((slot, si) => {
          const photo    = photoAt(si);
          const isFront  = si === frontSlot;
          const [ox, oy] = OFF[slot.dir];
          const t        = 1 - reveal; // 1 = off-screen, 0 = at resting position

          return (
            <motion.figure
              key={`slot-${si}`}
              className={`ps-card ${isFront ? 'ps-front' : 'ps-peek'}`}
              onClick={isFront ? undefined : () => goTo(activeIdx + (frontSlot - si))}
              title={isFront ? undefined : 'Lihat foto ini'}
              style={{ zIndex: slot.z }}
              animate={{
                // Combines slide-in-from-direction + resting-peek-offset
                x      : ox * t + slot.restX,
                y      : oy * t + slot.restY,
                opacity: reveal,
                rotate : slot.rotate,
              }}
              transition={SPRING}
            >
              {/* ── Photo (cross-fades on activeIdx change) ───────── */}
              <div className="fp-frame">
                <AnimatePresence mode="sync" initial={false}>
                  <motion.img
                    key={photo.id}
                    src={photo.photo_url}
                    alt={isFront ? (photo.caption ?? '') : ''}
                    className="fp-img"
                    loading="lazy"
                    decoding="async"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit      ={{ opacity: 0 }}
                    transition={{ duration: 0.22 }}
                  />
                </AnimatePresence>
              </div>

              {/* ── Caption + counter (front card only) ────────────── */}
              {isFront && (
                <div className="ps-front-footer">
                  {photo.caption && (
                    <p className="ps-caption">{photo.caption}</p>
                  )}
                  {total > 1 && (
                    <span className="ps-counter">{activeIdx + 1} / {total}</span>
                  )}
                </div>
              )}
            </motion.figure>
          );
        })}
      </div>

      {/* ── Navigation ──────────────────────────────────────────────── */}
      {total > 1 && (
        <div className="ps-nav">
          <button
            className="ps-nav-btn"
            onClick={() => goTo(activeIdx - 1)}
            aria-label="Foto sebelumnya"
          >
            ‹
          </button>
          <div className="ps-dots">
            {photos.map((_, i) => (
              <button
                key={i}
                className={`ps-dot${i === activeIdx ? ' ps-dot-active' : ''}`}
                onClick={() => goTo(i)}
                aria-label={`Foto ${i + 1}`}
              />
            ))}
          </div>
          <button
            className="ps-nav-btn"
            onClick={() => goTo(activeIdx + 1)}
            aria-label="Foto berikutnya"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
