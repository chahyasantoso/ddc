import { useState } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import type { Checkpoint } from '../lib/types.client';
import { ScrollSlide } from './ScrollSlide';
import { PhotoCard } from './PhotoCard';

// ── Tuning ────────────────────────────────────────────────────────────────────
const DRAG_COMMIT = 80;   // px to commit a swipe
const FLICK_VEL  = 400;  // px/s to commit via flick
const MAX_VISIBLE  = 4;   // only render top N cards (perf)

// ── Alternative Animation Behaviors (Uncomment one to test) ───────────────────

// 1. Clean & Snappy (Current Default)
// const DECK_SPRING = { type: 'spring' as const, stiffness: 260, damping: 22 };

// 2. Bouncy & Playful (Kartu mantul saat pindah posisi)
// const DECK_SPRING = { type: 'spring' as const, stiffness: 400, damping: 15, mass: 0.8 };

// 3. Smooth & Elegant (Lambat, halus, berasa "premium")
const DECK_SPRING = { type: 'spring' as const, stiffness: 120, damping: 20, mass: 1.2 };

// 4. Swift & Stiff (Gerakan langsung tajam, tanpa banyak bounce)
// const DECK_SPRING = { type: 'spring' as const, stiffness: 350, damping: 35 };

// 5. Classic Tween / CSS-like (Tanpa physics/spring, durasi dipatok pasti)
// const DECK_SPRING = { type: 'tween' as const, ease: 'easeOut', duration: 0.35 };

// ── Style Options ─────────────────────────────────────────────────────────────
// Pilihan A: Physics Stack (seperti tumpukan kartu fisik)
const DP = (offset: number, total: number) => ({
  baseX     : offset * 10,
  baseY     : offset * 8,
  baseScale : offset === 0 ? 1 : 1 - offset * 0.04,
  baseRotate: offset === 0 ? 0 : offset * 2.5 * (offset % 2 === 0 ? -1 : 1),
  zIndex    : total - offset,
  baseOpacity: 1,
});

// Pilihan B: Flat Stack (kartu ditumpuk persis lurus)
// Saat di-drag, kartu di bawahnya tetap terlihat jelas.
// const DP = (offset: number, total: number) => ({
//   baseX     : 0,
//   baseY     : 0,
//   baseScale : 1,
//   baseRotate: 0,
//   zIndex    : total - offset,
//   baseOpacity: 1, // <--- Semua kartu selalu terlihat (opacity 1) karena z-index sudah mengatur urutan numpuknya
// });

function deckPosition(offset: number, total: number) {
  return DP(offset, total);
}

// ── Scroll-reveal entry direction per slot ────────────────────────────────────
// When reveal < 1, each card is displaced by (revealDx, revealDy) × (1-reveal).
// Avoid left (negative x) for slot 0 so it doesn't collide with the map marker.
const REVEAL_DX = [  0, 280,   0, -280 ]; // top, right, bottom, left
const REVEAL_DY = [-280,  0, 280,    0 ]; // top, right, bottom, left

// ── Component ─────────────────────────────────────────────────────────────────
interface Props { checkpoint: Checkpoint; reveal: number; index: number; }

/**
 * Rotating card-deck photo stack.
 *
 * Architecture
 * ─────────────────────────────────────────────────────────────────────────────
 *  photo-stack-wrapper
 *    ps-deck  (aspect-ratio container)
 *      ScrollSlide  ×N  (deck position + scroll-reveal animation)
 *        ps-card
 *          [top]  motion.div.ps-drag-wrap  → PhotoCard (with footer)
 *          [rest] div.ps-peek-face         → PhotoCard (no footer)
 *
 * Navigation
 * ─────────────────────────────────────────────────────────────────────────────
 *  All photos always in DOM. `activeIdx` tracks which photo is on top.
 *  When activeIdx changes, every card's `offset` changes → ScrollSlide
 *  springs all cards to their new deck positions simultaneously.
 *  Top card → springs to back; cards behind → spring forward. Pure position
 *  animation, no enter/exit, no AnimatePresence needed.
 */
export function FloatingPhotos({ checkpoint, reveal, index }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const dragX = useMotionValue(0);

  const photos = checkpoint.photos;
  const total  = photos.length;
  if (!total) return null;

  // Offset the direction indices based on city index to avoid repeating the same 
  // entry sequence (e.g., top, right, bottom...) for every city.
  const getDirIdx = (slotIdx: number) => (slotIdx + index) % 4;

  // ── Navigation ──────────────────────────────────────────────────────────────
  function next() { setActiveIdx(i => (i + 1) % total); dragX.set(0); }
  function prev() { setActiveIdx(i => (i - 1 + total) % total); dragX.set(0); }

  function handleDragEnd(_: PointerEvent, info: PanInfo) {
    const flick = Math.abs(info.velocity.x) > FLICK_VEL;
    if      (info.offset.x < -DRAG_COMMIT || (flick && info.velocity.x < 0)) next();
    else if (info.offset.x >  DRAG_COMMIT || (flick && info.velocity.x > 0)) prev();
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="photo-stack-wrapper">
      <div className="ps-deck">
        {photos.map((photo, i) => {
          const offset = (i - activeIdx + total) % total;
          if (offset >= MAX_VISIBLE) return null;

          const isTop = offset === 0;
          const dp    = deckPosition(offset, total);
          const dirIdx = getDirIdx(offset);

          return (
            <ScrollSlide
              key={`photo-${i}`}
              // Scroll-reveal: each card enters from a different direction
              reveal={reveal}
              revealDx={REVEAL_DX[dirIdx]}
              revealDy={REVEAL_DY[dirIdx]}
              // Deck resting position (springs when activeIdx changes)
              baseX={dp.baseX}
              baseY={dp.baseY}
              baseRotate={dp.baseRotate}
              baseScale={dp.baseScale}
              baseOpacity={dp.baseOpacity}
              // Layout
              className={`ps-card${isTop ? ' ps-top' : ''}`}
              style={{ zIndex: dp.zIndex }}
              transition={DECK_SPRING}
            >
              {isTop ? (
                /* Top card — interactive drag */
                <motion.div
                  className="ps-drag-wrap"
                  drag={total > 1 ? 'x' : false}
                  style={{ x: dragX, touchAction: 'pan-y', userSelect: 'none' }}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.35}
                  onPointerDown={e => e.currentTarget.setPointerCapture(e.pointerId)}
                  onDragEnd={handleDragEnd}
                >
                  <PhotoCard
                    photo={photo}
                    showFooter
                    counter={total > 1 ? `${activeIdx + 1} / ${total}` : undefined}
                  />
                </motion.div>
              ) : (
                /* Peek cards — decorative only */
                <div className="ps-peek-face">
                  <PhotoCard photo={photo} />
                </div>
              )}
            </ScrollSlide>
          );
        })}
      </div>
    </div>
  );
}
