import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollSlide } from './ScrollSlide';
import type { Checkpoint, Photo } from '../lib/types.client';

// ── Responsive hook ───────────────────────────────────────────────────────────
function useIsMobile(bp = 768): boolean {
  const [v, set] = useState(() => window.innerWidth < bp);
  useEffect(() => {
    const update = () => set(window.innerWidth < bp);
    window.addEventListener('resize', update, { passive: true });
    return () => window.removeEventListener('resize', update);
  }, [bp]);
  return v;
}

// ── Peek card (behind the front card) ────────────────────────────────────────
function PeekCard({ photo, depth, onClick }: {
  photo : Photo;
  depth : number; // 1 = directly behind, 2 = further back
  onClick: () => void;
}) {
  return (
    <figure
      className="ps-card ps-peek"
      onClick={onClick}
      title="Click to view"
      style={{
        zIndex   : 10 - depth,
        transform: `rotate(${depth * 3}deg) translate(${depth * 12}px, ${depth * 5}px)`,
      }}
    >
      <div className="fp-frame">
        <img src={photo.photo_url} alt="" className="fp-img" />
      </div>
    </figure>
  );
}

// ── Front card (active photo) ─────────────────────────────────────────────────
function FrontCard({ photo, index, total }: {
  photo: Photo;
  index: number;
  total: number;
}) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.figure
        key={photo.id}
        className="ps-card ps-front"
        initial   ={{ opacity: 0, scale: 0.94, y: 10 }}
        animate   ={{ opacity: 1, scale: 1,    y: 0  }}
        exit      ={{ opacity: 0, scale: 0.94, y: -8 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        style     ={{ zIndex: 20 }}
      >
        <div className="fp-frame">
          <img src={photo.photo_url} alt={photo.caption} className="fp-img" />
        </div>

        {/* Caption + counter overlay */}
        <div className="ps-front-footer">
          {photo.caption && (
            <p className="ps-caption">{photo.caption}</p>
          )}
          {total > 1 && (
            <span className="ps-counter">{index + 1} / {total}</span>
          )}
        </div>
      </motion.figure>
    </AnimatePresence>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface FloatingPhotosProps {
  checkpoint: Checkpoint;
  reveal    : number; // 0–1, computed by ScrollytellingUI
}

/**
 * Card-deck photo stack — shows ALL photos from the checkpoint.
 *
 * - Front card: active photo with caption + "i / N" counter
 * - Peek cards: next 1–2 photos visible behind (click to jump to that photo)
 * - Prev / Next buttons for full navigation
 * - Whole deck slides in/out as one unit via <ScrollSlide reveal={reveal}>
 */
export function FloatingPhotos({ checkpoint, reveal }: FloatingPhotosProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const isMobile = useIsMobile();
  const photos   = checkpoint.photos;
  const total    = photos.length;

  if (total === 0) return null;

  const PEEK     = Math.min(2, total - 1); // number of peek cards (max 2)
  const direction = isMobile ? 'bottom' : 'right';

  function goTo(i: number) {
    setActiveIdx(((i % total) + total) % total);
  }

  // Peek card photos: the ones AFTER the active card
  const peekPhotos = Array.from({ length: PEEK }, (_, d) => ({
    photo: photos[(activeIdx + d + 1) % total],
    depth: d + 1,
  }));

  return (
    <ScrollSlide
      reveal={reveal}
      direction={direction}
      className="photo-stack-wrapper"
    >
      {/* ── Card deck ─────────────────────────────────────────────── */}
      <div className="ps-deck">
        {/* Peeking cards — rendered first so they sit behind via z-index */}
        {[...peekPhotos].reverse().map(({ photo, depth }) => (
          <PeekCard
            key={`peek-${depth}`}
            photo={photo}
            depth={depth}
            onClick={() => goTo(activeIdx + depth)}
          />
        ))}

        {/* Front card */}
        <FrontCard
          photo={photos[activeIdx]}
          index={activeIdx}
          total={total}
        />
      </div>

      {/* ── Navigation ────────────────────────────────────────────── */}
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
    </ScrollSlide>
  );
}
