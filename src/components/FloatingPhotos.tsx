import { useState, useEffect } from 'react';
import {
  motion, AnimatePresence,
  useMotionValue, useTransform, animate,
} from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import type { Checkpoint, Photo } from '../lib/types.client';

// ── Slide directions ──────────────────────────────────────────────────────────
// NOTE: 'left' is intentionally excluded — the map marker lives on the left
// side of the screen and we don't want cards flying through it.
type Dir = 'top' | 'right' | 'bottom';
const OFF: Record<Dir, [number, number]> = {
  top   : [0,    -900],
  right : [800,  0   ],
  bottom: [0,    900 ],
};

// ── Stack slot config: deepest → front ───────────────────────────────────────
// All slots use the same reveal value — cards converge simultaneously.
// restX/restY shift the card from the "natural" position to create the peek.
// rotate is static (the tilt of cards in a shuffled stack).
const SLOTS = [
  { dir: 'bottom' as Dir, restX: 18, restY: 10, rotate: -5,  z: 1 }, // deepest peek
  { dir: 'right'  as Dir, restX: 9,  restY: 5,  rotate:  3,  z: 2 }, // mid peek
  { dir: 'top'    as Dir, restX: 0,  restY: 0,  rotate:  0,  z: 3 }, // front card
] as const;

// ── Constants ─────────────────────────────────────────────────────────────────
const DRAG_THRESHOLD = 75; // px to commit a swipe navigation
const SPRING = { type: 'spring', stiffness: 220, damping: 28, mass: 0.8 } as const;

// ── Hook ──────────────────────────────────────────────────────────────────────
function useIsMobile(bp = 768) {
  const [v, set] = useState(() => window.innerWidth < bp);
  useEffect(() => {
    const u = () => set(window.innerWidth < bp);
    window.addEventListener('resize', u, { passive: true });
    return () => window.removeEventListener('resize', u);
  }, [bp]);
  return v;
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  checkpoint: Checkpoint;
  reveal    : number; // 0–1, ALL slots share this value
}

/**
 * Card-stack photo viewer with drag-to-navigate gesture.
 *
 * Layout (3 slots, all reveal simultaneously):
 *   deepest peek → flies in from BOTTOM
 *   mid peek     → flies in from RIGHT
 *   front card   → drops from TOP  (most cinematic, appears "on top")
 *
 * Gesture:
 *   ← swipe left   = next photo
 *   → swipe right  = prev photo
 *   The front card physically tilts during drag (Framer Motion motion values).
 *   touch-action: pan-y ensures vertical scroll passes through on mobile.
 *
 * Navigation buttons are hidden on mobile (swipe replaces them).
 * Dot indicators always visible for jump-to-photo.
 */
export function FloatingPhotos({ checkpoint, reveal }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const isMobile = useIsMobile();
  const photos   = checkpoint.photos;
  const total    = photos.length;

  // ── Drag motion values (front card only) ───────────────────────────────────
  const dragX = useMotionValue(0);
  // Cards tilt up to ±12° while being dragged — feels like holding a real card
  const tilt  = useTransform(dragX, [-150, 0, 150], [-12, 0, 12]);

  if (!total) return null;

  const visibleCount = Math.min(3, total);
  const slots        = SLOTS.slice(SLOTS.length - visibleCount);
  const frontSlot    = slots.length - 1;

  // Navigate and spring dragX back to center
  const goTo = (i: number) => {
    setActiveIdx(((i % total) + total) % total);
    animate(dragX, 0, { type: 'spring', stiffness: 400, damping: 30 });
  };

  // Which photo shows in slot si:
  //   frontSlot     → activeIdx         (current photo, front)
  //   frontSlot - 1 → activeIdx + 1    (next photo, first peek)
  //   frontSlot - 2 → activeIdx + 2    (further peeking)
  const photoAt = (si: number): Photo =>
    photos[(activeIdx + (frontSlot - si)) % total];

  function handleDragEnd(_: PointerEvent, info: PanInfo) {
    if (total <= 1) return;
    if (info.offset.x < -DRAG_THRESHOLD) goTo(activeIdx + 1); // swipe left  = next
    if (info.offset.x >  DRAG_THRESHOLD) goTo(activeIdx - 1); // swipe right = prev
    // If under threshold, dragConstraints auto-spring back to center
  }

  return (
    <div className="photo-stack-wrapper">
      {/* ── Card deck ──────────────────────────────────────────────── */}
      <div className="ps-deck">
        {/* Invisible placeholder: sets the deck height via aspect-ratio
            (all actual cards are position:absolute, so they don't set height) */}
        <div className="ps-deck-sizer" aria-hidden />

        {slots.map((slot, si) => {
          const photo    = photoAt(si);
          const isFront  = si === frontSlot;
          const [ox, oy] = OFF[slot.dir];
          const t        = 1 - reveal; // 0 = fully in, 1 = off-screen

          return (
            // ── Outer wrapper: scroll-linked animation ─────────────
            // Handles: slide direction, resting peek offset, opacity, static rotate
            <motion.div
              key={`slot-${si}`}
              className="ps-slot"
              style={{ zIndex: slot.z }}
              animate={{
                x      : ox * t + slot.restX,
                y      : oy * t + slot.restY,
                opacity: reveal,
                rotate : slot.rotate,
              }}
              transition={SPRING}
            >
              {/* ── Inner card: drag gesture (front card only) ─────── */}
              {/* Separated from outer so drag x/rotate doesn't conflict
                  with the scroll animation's x/rotate via animate.        */}
              <motion.figure
                className={`ps-card ${isFront ? 'ps-front' : 'ps-peek'}`}
                onClick={!isFront ? () => goTo(activeIdx + (frontSlot - si)) : undefined}
                title={!isFront ? 'Klik untuk lihat foto ini' : undefined}
                // Drag gesture — only on front card when multiple photos exist
                drag={isFront && total > 1 ? 'x' : false}
                style={isFront
                  ? { x: dragX, rotate: tilt, touchAction: 'pan-y' }
                  : undefined
                }
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.35}
                whileDrag={{ cursor: 'grabbing', scale: 1.02 }}
                onDragEnd={handleDragEnd}
              >
                {/* Photo — AnimatePresence cross-fades when photo changes */}
                <div className="fp-frame">
                  <AnimatePresence mode="sync" initial={false}>
                    <motion.img
                      key={photo.id}
                      src={photo.photo_url}
                      alt={isFront ? (photo.caption ?? '') : ''}
                      className="fp-img"
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      onDragStart={e => e.preventDefault()}
                      initial   ={{ opacity: 0 }}
                      animate   ={{ opacity: 1 }}
                      exit      ={{ opacity: 0 }}
                      transition={{ duration: 0.22 }}
                    />
                  </AnimatePresence>
                </div>

                {/* Caption + counter — front card only */}
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
            </motion.div>
          );
        })}
      </div>

      {/* ── Navigation ──────────────────────────────────────────────── */}
      {total > 1 && (
        <div className="ps-nav">
          {/* Prev/Next buttons — hidden on mobile (swipe gesture instead) */}
          <button
            className="ps-nav-btn"
            onClick={() => goTo(activeIdx - 1)}
            aria-label="Foto sebelumnya"
          >‹</button>

          {/* Dot indicators — always visible, for jump-to-any-photo */}
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
          >›</button>
        </div>
      )}
    </div>
  );
}
