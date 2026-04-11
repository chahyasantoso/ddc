import { useState } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import type { Checkpoint, Photo } from '../lib/types.client';

// ── Resting deck positions (front → deepest) ─────────────────────────────────
const POS = [
  { x: 0,  y: 0,  rotate:  0, zIndex: 10 }, // offset 0 = front
  { x: 9,  y: 5,  rotate:  3, zIndex: 5  }, // offset 1 = peek 1
  { x: 18, y: 10, rotate: -5, zIndex: 1  }, // offset 2 = peek 2 (deepest)
] as const;

// ── Reveal directions — each position enters from a different direction ───────
// When reveal < 1 the card is displaced by [dx*(1-reveal), dy*(1-reveal)].
const REVEAL_DIRS = [
  [0,    -300], // front  : drops in from above
  [300,  0   ], // peek 1 : sweeps in from the right
  [0,    300 ], // peek 2 : rises from below
] as const;

// ── Exit animation (front card flies away on navigation) ─────────────────────
// dir=1  → swipe left  (go next) → card exits LEFT
// dir=-1 → swipe right (go prev) → card exits RIGHT
const mkExit = (dir: 1 | -1) => ({
  x      : dir * -450,
  y      : -20,
  rotate : dir * -15,
  opacity: 0,
  zIndex : 20,          // on top while flying away
});

// ── New deepest card materialises from behind the stack ───────────────────────
const ENTER_BACK = { x: 25, y: 16, rotate: -7, opacity: 0, scale: 0.88 };

// ── Constants ─────────────────────────────────────────────────────────────────
const DRAG_THRESHOLD = 70;   // px — minimum offset to commit a swipe
const FLICK_VELOCITY = 500;  // px/s — quick flick also commits
const CARD_SPRING    = { type: 'spring', stiffness: 280, damping: 28 } as const;

// ── Component ─────────────────────────────────────────────────────────────────
interface Props { checkpoint: Checkpoint; reveal: number; }

/**
 * True card-deck carousel.
 *
 * Architecture — each PHOTO has its own DOM node (key = photo index):
 *   - Deck position is determined by `offset = photoIdx − activeIdx`
 *   - When activeIdx changes, each card gets NEW `animate` props
 *     (e.g. offset 1 → 0 means the same element smoothly slides from
 *     peek position to front position — no teleportation).
 *   - The old front card (offset becomes −1, removed from array) exits
 *     via AnimatePresence with a directional fly-away animation.
 *   - A new deepest card (offset = visibleCount−1) enters from behind.
 *
 * Two-layer nesting for front card:
 *   outer motion.figure — deck position + reveal + exit (animate.x / y)
 *   inner motion.div    — interactive drag (style.x = dragX)
 *   These compose: total x = deck.x + drag.x (no conflict).
 */
export function FloatingPhotos({ checkpoint, reveal }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  // Direction the current FRONT CARD exits toward when navigation commits.
  //   1  = exits LEFT  (user swiped left  / tapped next)
  //  -1  = exits RIGHT (user swiped right / tapped prev)
  const [exitDir, setExitDir] = useState<1 | -1>(1);

  const photos = checkpoint.photos;
  const total  = photos.length;

  // dragX: added to the front card's x via an inner motion.div.
  // Separated from the outer animate so exit animations aren't conflicted.
  const dragX = useMotionValue(0);

  if (!total) return null;

  const visibleCount = Math.min(3, total);

  /**
   * Navigate to photo `i` in direction `dir`.
   * dragX is reset instantly — exit animation then starts clean from 0.
   */
  function goTo(i: number, dir: 1 | -1) {
    dragX.set(0);
    setExitDir(dir);
    setActiveIdx(((i % total) + total) % total);
  }

  function handleDragEnd(_: PointerEvent, info: PanInfo) {
    if (total <= 1) return;
    const flick    = Math.abs(info.velocity.x) > FLICK_VELOCITY;
    const farLeft  = info.offset.x < -DRAG_THRESHOLD || (flick && info.velocity.x < 0);
    const farRight = info.offset.x >  DRAG_THRESHOLD || (flick && info.velocity.x > 0);
    if (farLeft)  goTo(activeIdx + 1,  1);
    if (farRight) goTo(activeIdx - 1, -1);
  }

  // Build the visible card list: front first (offset 0), then peeks.
  const visibleCards = Array.from({ length: visibleCount }, (_, offset) => ({
    idx   : (activeIdx + offset) % total,
    photo : photos[(activeIdx + offset) % total],
    offset,
  }));

  return (
    <div className="photo-stack-wrapper">
      <div className="ps-deck">
        {/* Height placeholder — all real cards are position:absolute */}
        <div className="ps-deck-sizer" aria-hidden />

        {/*
         * AnimatePresence wraps ALL cards.
         * - key changes  → card exits (old front) / enters (new deepest)
         * - key SAME     → card animates between positions (peek → front)
         */}
        <AnimatePresence mode="sync" custom={exitDir}>
          {visibleCards.map(({ idx, photo, offset }) => {
            const pos     = POS[offset];
            const isFront = offset === 0;

            // Scroll-reveal displacement: 0 when reveal=1 (checkpoint reached)
            const t   = 1 - reveal;
            const rdx = REVEAL_DIRS[offset][0] * t;
            const rdy = REVEAL_DIRS[offset][1] * t;

            return (
              // ── Outer: deck position + checkpoint reveal + exit ────────────
              <motion.figure
                key={`photo-${idx}`}
                className={`ps-card ${isFront ? 'ps-front' : 'ps-peek'}`}

                // Deck resting position + reveal offset combined.
                // When activeIdx changes, animate springs to new deck position.
                animate={{
                  x      : pos.x + rdx,
                  y      : pos.y + rdy,
                  rotate : pos.rotate,
                  opacity: reveal,
                }}

                // Only newly appearing deepest cards get an enter animation.
                // Cards that change position (e.g. peek1 → front) should NOT
                // re-trigger initial — they animate smoothly via `animate`.
                initial={offset === visibleCount - 1 ? ENTER_BACK : false}

                // Exit: front card flies away when removed from visibleCards.
                // variant fn receives `custom` (exitDir) from AnimatePresence.
                variants={{ exit: (dir: 1 | -1) => mkExit(dir) }}
                exit="exit"
                custom={exitDir}

                transition={CARD_SPRING}
                style={{ zIndex: pos.zIndex }}

                // Peek cards: click to jump to that photo
                onClick={!isFront ? () => goTo(activeIdx + offset, 1) : undefined}
                title={!isFront ? 'Klik untuk lihat foto ini' : undefined}
              >
                {/* ── Inner: drag gesture (front card only) ─────────────────
                    Separate motion.div so drag's x composes additively with
                    the outer figure's animate.x — no conflicts on exit.      */}
                <motion.div
                  className="ps-drag-area"
                  drag={isFront && total > 1 ? 'x' : false}
                  style={isFront ? { x: dragX, touchAction: 'pan-y' } : undefined}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.35}
                  whileDrag={isFront ? { cursor: 'grabbing' } : undefined}
                  onDragEnd={isFront ? handleDragEnd : undefined}
                >
                  <div className="fp-frame">
                    <img
                      src={photo.photo_url}
                      alt={isFront ? (photo.caption ?? '') : ''}
                      className="fp-img"
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      onDragStart={e => e.preventDefault()}
                    />
                  </div>

                  {isFront && (
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
                  )}
                </motion.div>
              </motion.figure>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ── Navigation ──────────────────────────────────────────────────────── */}
      {total > 1 && (
        <div className="ps-nav">
          {/* Buttons hidden on mobile — swipe replaces them */}
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
