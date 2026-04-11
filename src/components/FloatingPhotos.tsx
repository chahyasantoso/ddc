import { useState } from 'react';
import {
  motion, AnimatePresence,
  useMotionValue, useTransform,
} from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import type { Checkpoint, Photo } from '../lib/types.client';

// ── Slide directions (no 'left' — marker lives there) ────────────────────────
type Dir = 'top' | 'right' | 'bottom';
const OFF: Record<Dir, [number, number]> = {
  top   : [0,    -900],
  right : [800,  0   ],
  bottom: [0,    900 ],
};

// ── Stack slot config: deepest → front ───────────────────────────────────────
const SLOTS = [
  { dir: 'bottom' as Dir, restX: 18, restY: 10, rotate: -5,  z: 1 },
  { dir: 'right'  as Dir, restX: 9,  restY: 5,  rotate:  3,  z: 2 },
  { dir: 'top'    as Dir, restX: 0,  restY: 0,  rotate:  0,  z: 3 },
] as const;

// ── Carousel direction variants ───────────────────────────────────────────────
// dir= 1: swipe left  (next) → old card exits left,  new enters from right
// dir=-1: swipe right (prev) → old card exits right, new enters from left
const carousel = {
  initial: (dir: number) => ({ x: dir * 340 }),
  animate: { x: 0 },
  exit   : (dir: number) => ({ x: -dir * 340 }),
};

const DRAG_THRESHOLD  = 70;   // px to commit a swipe
const FLICK_VELOCITY  = 500;  // px/s — quick flick also commits
const SPRING_SCROLL   = { type: 'spring', stiffness: 220, damping: 28, mass: 0.8 } as const;
const SPRING_CAROUSEL = { type: 'spring', stiffness: 280, damping: 28 } as const;

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  checkpoint: Checkpoint;
  reveal    : number;
}

/**
 * Three-layer photo stack carousel:
 *
 * Layer 1 — scroll animation  (motion.div / ps-slot)
 *   Controls: x/y slide-in from checkpoint direction, opacity, static rotate
 *
 * Layer 2 — carousel animation  (motion.div / ps-carousel-slide)
 *   Controls: directional enter/exit ±340px via AnimatePresence
 *   Key changes with activeIdx to trigger the carousel transition
 *
 * Layer 3 — drag gesture  (motion.figure / ps-front)
 *   Controls: interactive tilt while dragging (dragX → tilt ±12°)
 *   onDragEnd fires goTo() which changes layers 1 & 2
 *
 * Gesture UX:
 *   Swipe LEFT  (or flick) → next photo — card flies left, new arrives from right
 *   Swipe RIGHT (or flick) → prev photo — card flies right, new arrives from left
 *   Buttons hidden on mobile (swipe replaces them)
 *   Dots always visible for jump-to-any-photo
 */
export function FloatingPhotos({ checkpoint, reveal }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  // exitDir: direction the FRONT CARD exits toward
  //   1 = exits left  (user swiped left  → next photo)
  //  -1 = exits right (user swiped right → prev photo)
  const [exitDir, setExitDir] = useState<1 | -1>(1);

  const photos = checkpoint.photos;
  const total  = photos.length;

  // Drag motion values — applied on the inner drag figure only
  const dragX = useMotionValue(0);
  const tilt  = useTransform(dragX, [-150, 0, 150], [-12, 0, 12]);

  if (!total) return null;

  const visibleCount = Math.min(3, total);
  const slots        = SLOTS.slice(SLOTS.length - visibleCount);
  const frontSlot    = slots.length - 1;

  /**
   * Navigate to photo `i` with explicit direction.
   * Resets dragX instantly so the carousel exit starts clean.
   */
  function goTo(i: number, dir: 1 | -1) {
    dragX.set(0);
    setExitDir(dir);
    setActiveIdx(((i % total) + total) % total);
  }

  function handleDragEnd(_: PointerEvent, info: PanInfo) {
    if (total <= 1) return;
    const flick   = Math.abs(info.velocity.x) > FLICK_VELOCITY;
    const farLeft  = info.offset.x < -DRAG_THRESHOLD  || (flick && info.velocity.x < 0);
    const farRight = info.offset.x >  DRAG_THRESHOLD  || (flick && info.velocity.x > 0);
    if (farLeft)  goTo(activeIdx + 1,  1);
    if (farRight) goTo(activeIdx - 1, -1);
  }

  // Photo for each slot (front = activeIdx, peeks = activeIdx+1, +2, …)
  const photoAt = (si: number): Photo =>
    photos[(activeIdx + (frontSlot - si)) % total];

  return (
    <div className="photo-stack-wrapper">
      <div className="ps-deck">
        {/* Height placeholder — all real cards are position:absolute */}
        <div className="ps-deck-sizer" aria-hidden />

        {slots.map((slot, si) => {
          const photo    = photoAt(si);
          const isFront  = si === frontSlot;
          const [ox, oy] = OFF[slot.dir];
          const t        = 1 - reveal;

          return (
            // ── Layer 1: scroll animation ─────────────────────────────────
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
              transition={SPRING_SCROLL}
            >
              {isFront ? (
                // ── Layer 2: directional carousel enter/exit ───────────
                // Key changes with activeIdx → AnimatePresence triggers
                // the carousel slide animation in/out.
                <AnimatePresence mode="sync" initial={false} custom={exitDir}>
                  <motion.div
                    key={`front-${activeIdx}`}
                    className="ps-carousel-slide"
                    custom={exitDir}
                    variants={carousel}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={SPRING_CAROUSEL}
                  >
                    {/* ── Layer 3: drag gesture ─────────────────────── */}
                    <motion.figure
                      className="ps-card ps-front"
                      drag={total > 1 ? 'x' : false}
                      style={{ x: dragX, rotate: tilt, touchAction: 'pan-y' }}
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.35}
                      whileDrag={{ cursor: 'grabbing', scale: 1.02 }}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="fp-frame">
                        {/* Photo — instant swap (carousel handles visual change) */}
                        <img
                          src={photo.photo_url}
                          alt={photo.caption ?? ''}
                          className="fp-img"
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                          onDragStart={e => e.preventDefault()}
                        />
                      </div>
                      <div className="ps-front-footer">
                        {photo.caption && (
                          <p className="ps-caption">{photo.caption}</p>
                        )}
                        {total > 1 && (
                          <span className="ps-counter">
                            {activeIdx + 1} / {total}
                          </span>
                        )}
                      </div>
                    </motion.figure>
                  </motion.div>
                </AnimatePresence>

              ) : (
                // ── Peek cards: no carousel, quiet cross-fade ─────────
                <motion.figure
                  className="ps-card ps-peek"
                  onClick={() => goTo(activeIdx + (frontSlot - si), 1)}
                  title="Klik untuk lihat foto ini"
                >
                  <div className="fp-frame">
                    <AnimatePresence mode="sync" initial={false}>
                      <motion.img
                        key={photo.id}
                        src={photo.photo_url}
                        alt=""
                        className="fp-img"
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                        onDragStart={e => e.preventDefault()}
                        initial   ={{ opacity: 0 }}
                        animate   ={{ opacity: 1 }}
                        exit      ={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      />
                    </AnimatePresence>
                  </div>
                </motion.figure>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* ── Navigation ──────────────────────────────────────────────── */}
      {total > 1 && (
        <div className="ps-nav">
          {/* Buttons — hidden on mobile, swipe replaces them */}
          <button
            className="ps-nav-btn"
            onClick={() => goTo(activeIdx - 1, -1)}
            aria-label="Foto sebelumnya"
          >‹</button>

          <div className="ps-dots">
            {photos.map((_, i) => (
              <button
                key={i}
                className={`ps-dot${i === activeIdx ? ' ps-dot-active' : ''}`}
                onClick={() => goTo(i, i >= activeIdx ? 1 : -1)}
                aria-label={`Foto ${i + 1}`}
              />
            ))}
          </div>

          <button
            className="ps-nav-btn"
            onClick={() => goTo(activeIdx + 1, 1)}
            aria-label="Foto berikutnya"
          >›</button>
        </div>
      )}
    </div>
  );
}
