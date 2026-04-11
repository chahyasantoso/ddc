import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// ── Types ─────────────────────────────────────────────────────────────────────
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

// ── Scroll-linked reveal calculation ──────────────────────────────────────────
//
//  Reveal (0–1) is driven by the motor's position along the route:
//
//  Slide IN  window: from when motor LEAVES prev checkpoint → ARRIVES here
//  Slide OUT window: from when motor LEAVES here → ARRIVES at next checkpoint
//
//  i.e. photos are exactly FULLY IN when the motor reaches that checkpoint,
//  and exactly FULLY OUT when the motor reaches the next/prev one.
//
function computeReveal(
  p: number,   // current scroll progress 0–1
  ci: number,  // checkpoint index
  N: number    // total checkpoint count
): number {
  if (N === 1) return 1;

  const cpProg   = ci / (N - 1);
  const prevProg = (ci - 1) / (N - 1); // < 0 for ci=0, ignored via isFirst
  const nextProg = (ci + 1) / (N - 1); // > 1 for last, ignored via isLast

  const isFirst = ci === 0;
  const isLast  = ci === N - 1;

  // Before this checkpoint's entry window
  if (!isFirst && p <= prevProg) return 0;

  // Entering: motor travelling from prev checkpoint toward this one
  if (!isFirst && p < cpProg) {
    return (p - prevProg) / (cpProg - prevProg); // 0 → 1
  }

  // At or past arrival at this checkpoint
  if (isLast) return 1; // last checkpoint stays visible forever

  // Exiting: motor travelling from this checkpoint toward the next one
  if (p >= nextProg) return 0; // fully gone when motor arrives at next cp
  return 1 - (p - cpProg) / (nextProg - cpProg); // 1 → 0
}

// ── Slide config per photo position ──────────────────────────────────────────
// Direction the photo travels when entering/exiting.
// reveal=0  → photo is OFF-SCREEN (full offset)
// reveal=1  → photo is ON-SCREEN  (x:0, y:0)
const SLIDE_DIRS = [
  { x:  0,  y: -1 }, // 0: top
  { x:  1,  y:  0 }, // 1: right
  { x:  0,  y:  1 }, // 2: bottom
  { x: -1,  y:  0 }, // 3: left
];
const SLIDE_DIST = { x: 900, y: 1100 }; // px off-screen when reveal=0

// Subtle rotation for each photo slot (replaces CSS transform on .float-photo-N)
const ROTATIONS = [-1.8, 1.5, -1.0, 0.8];

// Compute animation values for one photo from its reveal (0–1)
function photoAnimate(pi: number, reveal: number) {
  const dir = SLIDE_DIRS[pi % SLIDE_DIRS.length];
  const t   = 1 - reveal; // 1 = fully off-screen, 0 = fully on-screen
  return {
    x      : dir.x * SLIDE_DIST.x * t,
    y      : dir.y * SLIDE_DIST.y * t,
    opacity: reveal,
    rotate : ROTATIONS[Math.min(pi, ROTATIONS.length - 1)],
  };
}

// Resolve the "active" checkpoint for the info card (binary — which one the
// motorcycle is closest too or inside the reveal window of).
function resolveActiveCheckpoint(p: number, cps: Checkpoint[]): Checkpoint | null {
  const N = cps.length;
  if (N === 0) return null;
  if (N === 1) return cps[0];
  for (let i = 0; i < N; i++) {
    const r = computeReveal(p, i, N);
    if (r > 0) return cps[i]; // first checkpoint with any visibility is the "active" one
  }
  // Between checkpoints: return whichever is closer
  const segSize  = 1 / (N - 1);
  const seg      = Math.min(Math.floor(p / segSize), N - 2);
  const localT   = (p - seg * segSize) / segSize;
  return localT < 0.5 ? cps[seg] : cps[seg + 1];
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ScrollytellingUI({ checkpoints }: Props) {
  const [progress,   setProgress]   = useState(0);
  const [activeCp,   setActiveCp]   = useState<Checkpoint | null>(
    checkpoints[0] ?? null
  );

  // Single scroll listener — updates progress and active checkpoint
  useEffect(() => {
    function onScroll(e: Event) {
      const p = (e as CustomEvent<{ progress: number }>).detail.progress;
      setProgress(p);
      setActiveCp(resolveActiveCheckpoint(p, checkpoints));

      // Also notify InteractiveMap of the active checkpoint id
      const active = resolveActiveCheckpoint(p, checkpoints);
      if (active) {
        window.dispatchEvent(
          new CustomEvent('ddc:checkpoint-active', { detail: { id: active.id } })
        );
      }
    }
    window.addEventListener('ddc:scroll', onScroll);
    return () => window.removeEventListener('ddc:scroll', onScroll);
  }, [checkpoints]);

  const N = checkpoints.length;

  return (
    <>
      {/* ── Floating photos zone ─────────────────────────────────────── */}
      <div className="floating-photos-zone">
        {checkpoints.map((cp, ci) => {
          const reveal = computeReveal(progress, ci, N);
          // Skip rendering entirely if completely invisible AND far from window
          // (avoids GPU overdraw for many checkpoints)
          if (reveal < 0.001 && ci !== 0 && ci !== N - 1) return null;

          return cp.photos.slice(0, 3).map((photo, pi) => (
            <motion.figure
              key={`${cp.id}-${photo.id}`}
              className={`floating-photo-card float-photo-${pi}`}
              animate={photoAnimate(pi, reveal)}
              // Scroll-linked: near-instant time, spring for physical smoothness
              transition={{
                type     : 'spring',
                stiffness: 280,
                damping  : 32,
                mass     : 0.6,
              }}
              whileHover={{
                scale     : 1.05,
                rotate    : 0,
                zIndex    : 30,
                transition: { type: 'spring', stiffness: 400, damping: 30 },
              }}
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
          ));
        })}
      </div>

      {/* ── Checkpoint info card — bottom-left ───────────────────────── */}
      <div className="checkpoint-info-zone">
        {activeCp && (
          <motion.div
            key={activeCp.id}
            className="checkpoint-info-card"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          >
            <p className="ci-eyebrow">
              Checkpoint {checkpoints.indexOf(activeCp) + 1} / {N}
            </p>
            <h2 className="ci-name">{activeCp.location_name}</h2>
            {activeCp.description && (
              <p className="ci-desc">{activeCp.description}</p>
            )}
            <p className="ci-coords">
              📍 {activeCp.lat.toFixed(4)}, {activeCp.lng.toFixed(4)}
            </p>
          </motion.div>
        )}
      </div>
    </>
  );
}
