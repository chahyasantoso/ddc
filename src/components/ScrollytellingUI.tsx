import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Types (client-safe, no db imports) ───────────────────────────────────────
interface Photo {
  id: number;
  checkpoint_id: number;
  photo_url: string;
  caption: string;
  order: number;
}

interface Checkpoint {
  id: number;
  location_name: string;
  lat: number;
  lng: number;
  description: string | null;
  created_at: string;
  photos: Photo[];
}

interface Props {
  checkpoints: Checkpoint[];
}

// ── Slide directions per photo index (in & out same direction) ────────────────
// Values are large enough to guarantee off-screen regardless of viewport size
const SLIDES = [
  { x: 0,    y: -1400 }, // photo 0: from top
  { x: 1000, y: 0    }, // photo 1: from right
  { x: 0,    y: 1400 }, // photo 2: from bottom
  { x: -1000,y: 0    }, // photo 3: from left (rare)
];

function slideOf(index: number) {
  return SLIDES[index % SLIDES.length];
}

// ── Active checkpoint resolution ──────────────────────────────────────────────
// Returns the checkpoint id that should be showing photos at a given progress,
// or null when the motorcycle is "between" checkpoints (travel zone).
function resolveActiveId(
  progress: number,
  checkpoints: Checkpoint[]
): number | null {
  const N = checkpoints.length;
  if (N === 0) return null;
  if (N === 1) return checkpoints[0].id;

  const segSize  = 1 / (N - 1);      // e.g. 0.5 for 3 checkpoints
  const OVERLAP  = 0.1 * segSize;    // 10% of a segment

  for (let i = 0; i < N; i++) {
    const cpAt     = i / (N - 1);
    const showFrom = i === 0     ? 0   : cpAt - OVERLAP;
    const showTo   = i === N - 1 ? 1.1 : cpAt + OVERLAP; // 1.1 → never clamp last
    if (progress >= showFrom && progress <= showTo) return checkpoints[i].id;
  }
  return null; // travel zone
}

// ── Easing ────────────────────────────────────────────────────────────────────
type Ease = [number, number, number, number];
const EASE_OUT: Ease = [0.22, 1, 0.36, 1];

// ── Main component ────────────────────────────────────────────────────────────
export function ScrollytellingUI({ checkpoints }: Props) {
  const [activeId, setActiveId] = useState<number | null>(
    checkpoints[0]?.id ?? null
  );

  // Listen to scroll progress from the sync engine in index.astro
  useEffect(() => {
    function onScroll(e: Event) {
      const { progress } = (e as CustomEvent<{ progress: number }>).detail;
      const id = resolveActiveId(progress, checkpoints);
      setActiveId(id);
    }
    window.addEventListener('ddc:scroll', onScroll);
    return () => window.removeEventListener('ddc:scroll', onScroll);
  }, [checkpoints]);

  const activeCheckpoint = checkpoints.find((cp) => cp.id === activeId) ?? null;
  const activeIndex      = activeCheckpoint
    ? checkpoints.indexOf(activeCheckpoint)
    : -1;

  return (
    <>
      {/* ── Floating photos ─────────────────────────────────────────── */}
      {/* Desktop: right 45% of viewport | Mobile: bottom 50% */}
      <div className="floating-photos-zone" aria-live="polite">
        <AnimatePresence mode="sync">
          {activeCheckpoint?.photos.map((photo, pi) => {
            const slide = slideOf(pi);
            return (
              <motion.figure
                key={`${activeCheckpoint.id}-${photo.id}`}
                className={`floating-photo-card float-photo-${Math.min(pi, 3)}`}
                // Start off-screen in the slide direction
                initial={{ opacity: 0, x: slide.x, y: slide.y }}
                // Settle to natural CSS position
                animate={{ opacity: 1, x: 0, y: 0 }}
                // Exit back the same direction
                exit={{ opacity: 0, x: slide.x, y: slide.y }}
                transition={{
                  delay   : pi * 0.09,
                  duration: 0.6,
                  ease    : EASE_OUT,
                }}
                whileHover={{ scale: 1.04, zIndex: 30, transition: { duration: 0.2 } }}
              >
                <div className="fp-frame">
                  <img
                    src={photo.photo_url}
                    alt={photo.caption}
                    loading="lazy"
                    decoding="async"
                    className="fp-img"
                  />
                </div>
                {photo.caption && (
                  <figcaption className="fp-caption">{photo.caption}</figcaption>
                )}
              </motion.figure>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ── Checkpoint info card (bottom-left) ──────────────────────── */}
      <div className="checkpoint-info-zone">
        <AnimatePresence mode="wait">
          {activeCheckpoint && (
            <motion.div
              key={activeCheckpoint.id}
              className="checkpoint-info-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: EASE_OUT }}
            >
              <p className="ci-eyebrow">
                Checkpoint {activeIndex + 1} / {checkpoints.length}
              </p>
              <h2 className="ci-name">{activeCheckpoint.location_name}</h2>
              {activeCheckpoint.description && (
                <p className="ci-desc">{activeCheckpoint.description}</p>
              )}
              <p className="ci-coords">
                📍 {activeCheckpoint.lat.toFixed(4)},{' '}
                {activeCheckpoint.lng.toFixed(4)}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
