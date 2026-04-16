import { useCallback } from 'react';
import { useScroll, useTransform, motion, type MotionValue, useMotionValueEvent } from 'framer-motion';
import { useRef } from 'react';
import { FloatingPhotos } from './FloatingPhotos';
import { CheckpointInfoCard } from './CheckpointInfoCard';
import { InteractiveMap } from './InteractiveMap';
import type { Checkpoint } from '../lib/types.client';
import {
  SCROLL_CONFIG,
  getTotalVH,
  getCheckpointStartVH,
  getActiveCheckpointIndex,
  useJumpableSpring,
  triggerScrollyJump,
} from '../lib/scrollUtils';

interface Props {
  checkpoints: Checkpoint[];
  mapCheckpoints?: { id: number; location_name: string; lat: number; lng: number }[];
}

/**
 * Native Sticky Scrollytelling UI Orchestrator.
 *
 * Architecture:
 * - Container height = sum of each checkpoint's variable scroll budget.
 * - One sticky layer renders ALL checkpoints simultaneously.
 * - Each checkpoint's photos reveal one-by-one as the user scrolls through
 *   that checkpoint's scroll budget. The map marker stays pinned until the
 *   last photo has been revealed.
 */
export function ScrollytellingUI({ checkpoints, mapCheckpoints }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Entry animation progress (map scales in as the section enters the viewport)
  const { scrollYProgress: entryProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'start start'],
  });

  const smoothProgress = useJumpableSpring(scrollYProgress, {
    stiffness: 100,
    damping: 40,
    restDelta: 0.001,
  });

  const smoothEntryProgress = useJumpableSpring(entryProgress, {
    stiffness: 100,
    damping: 40,
    restDelta: 0.001,
  });

  // Map scales up and border disappears as it enters
  const mapScale = useTransform(smoothEntryProgress, [0, 1], [0.75, 1]);
  const mapBorderRadius = useTransform(smoothEntryProgress, [0, 1], ['40px', '0px']);

  const totalVH = checkpoints.length > 0 ? getTotalVH(checkpoints) : 0;
  // Container height = total scroll budget + 100vh padding for last checkpoint settle
  const containerHeightVH = Math.max(100, totalVH + 100);

  // smoothVH: absolute scroll position in viewport-height units
  const smoothVH = useTransform(smoothProgress, (p) =>
    Math.max(0, Math.min(1, p)) * totalVH,
  );

  // Dispatch active checkpoint events for map synchronization.
  // A checkpoint is "active" for its entire scroll budget, keeping the marker pinned.
  useMotionValueEvent(smoothVH, 'change', (vh) => {
    if (checkpoints.length === 0) return;
    const activeK = getActiveCheckpointIndex(checkpoints, vh);
    window.dispatchEvent(
      new CustomEvent('ddc:checkpoint-active', { detail: { id: checkpoints[activeK].id } }),
    );
  });

  const handleJump = useCallback(
    (targetIdx: number) => {
      const currentVh = smoothVH.get();
      const currentIdx = getActiveCheckpointIndex(checkpoints, currentVh);
      const isSequential = Math.abs(currentIdx - targetIdx) <= 1;
      triggerScrollyJump(checkpoints, targetIdx, isSequential);
    },
    [smoothVH, checkpoints],
  );

  return (
    <div
      ref={containerRef}
      className="native-scrolly-container"
      style={{ height: `${containerHeightVH}vh`, position: 'relative' }}
    >

      {/* INVISIBLE SNAP ANCHORS: Aligns browser scroll with checkpoint entry points */}
      {checkpoints.map((cp, i) => (
        <div
          key={`snap-${cp.id}`}
          id={`checkpoint-snap-${i}`}
          style={{
            position: 'absolute',
            top: `${getCheckpointStartVH(checkpoints, i)}vh`,
            height: '100vh',
            width: '100%',
            scrollSnapAlign: 'start',
            pointerEvents: 'none',
          }}
        />
      ))}

      <div
        className="sticky-content-layer"
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          width: '100vw',
        }}
      >

        {/* Interactive Map Layer */}
        {mapCheckpoints && (
          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              scale: mapScale,
              borderRadius: mapBorderRadius,
              overflow: 'hidden',
              transformOrigin: 'center',
              backgroundColor: '#0f0e0d',
            }}
          >
             <InteractiveMap
              checkpoints={mapCheckpoints}
              photoCounts={checkpoints.map(cp => cp.photos.length)}
              scrollProgress={scrollYProgress}
              onCheckpointClick={(idx) => handleJump(idx)}
            />
          </motion.div>
        )}

        {/* PHOTO STACKS & INFO CARDS */}
        <div className="floating-photos-zone">
          {checkpoints.length > 0 ? (
            checkpoints.map((cp, i) => (
              <CheckpointLayer
                key={cp.id}
                cp={cp}
                checkpoints={checkpoints}
                i={i}
                total={checkpoints.length}
                smoothVH={smoothVH}
                entryProgress={smoothEntryProgress}
              />
            ))
          ) : (
            /* COMING SOON OVERLAY */
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 60,
                background: 'rgba(15, 14, 13, 0.4)',
                backdropFilter: 'blur(4px)',
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{ textAlign: 'center', color: '#fff' }}
              >
                <h2
                  style={{
                    fontFamily: '"Oswald", sans-serif',
                    fontSize: 'clamp(3rem, 10vw, 6rem)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginBottom: '1rem',
                    background: 'linear-gradient(180deg, #fff 40%, rgba(255,255,255,0.4) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Coming Soon
                </h2>
                <p
                  style={{
                    fontSize: '18px',
                    opacity: 0.8,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    fontWeight: 500,
                  }}
                >
                  Preparing the next journey
                </p>
                <div
                  style={{
                    width: '60px',
                    height: '2px',
                    background: '#f59e0b',
                    margin: '2rem auto 0',
                    boxShadow: '0 0 15px #f59e0b',
                  }}
                />
              </motion.div>
            </div>
          )}
        </div>

      </div>

      {/* Floating "Latest Update" jump button */}
      {checkpoints.length > 0 && (
        <button
          onClick={() => handleJump(checkpoints.length - 1)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 100,
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(8px)',
            color: '#0f0e0d',
            border: '1px solid rgba(0,0,0,0.1)',
            padding: '12px 16px',
            borderRadius: '50px',
            fontWeight: 600,
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }}
        >
          <span>Latest Update</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ── Sub-components for Hook Scoping ───────────────────────────────────────────

interface CheckpointLayerProps {
  cp: Checkpoint;
  checkpoints: Checkpoint[];
  i: number;
  total: number;
  smoothVH: MotionValue<number>;
  entryProgress: MotionValue<number>;
}

function CheckpointLayer({
  cp,
  checkpoints,
  i,
  total,
  smoothVH,
  entryProgress,
}: CheckpointLayerProps) {
  const { SLICE_VH, PARKED_TOLERANCE, FADE_DURATION } = SCROLL_CONFIG;

  // The checkpoint is "visible" from its entry slice through its last photo slice.
  // reveal drives the info card fade; photos manage their own per-slice reveals.
  const reveal = useTransform(smoothVH, (vh) => {
    const startVH = getCheckpointStartVH(checkpoints, i);
    // Full budget: entry + all photos
    const budgetVH = (1 + cp.photos.length) * SLICE_VH;
    const endVH = startVH + budgetVH;
    // Center of the entry slice — checkpoint "parks" here first
    const centerVH = startVH + SLICE_VH * 0.5;

    // Leading edge: fade in as we approach the checkpoint center
    if (vh < centerVH - PARKED_TOLERANCE) {
      const dist = centerVH - PARKED_TOLERANCE - vh;
      if (dist > FADE_DURATION) return 0;
      return 1 - dist / FADE_DURATION;
    }
    // Parked + photo zone: fully visible until we leave the whole budget
    if (vh <= endVH + PARKED_TOLERANCE) return 1;
    // Trailing edge: fade out after the last photo slice
    const isLast = i === total - 1;
    if (isLast) return 1; // Last checkpoint stays on screen
    const dist = vh - (endVH + PARKED_TOLERANCE);
    if (dist > FADE_DURATION) return 0;
    return 1 - dist / FADE_DURATION;
  });

  // Combine with entry sequence for the very first checkpoint
  const gatedReveal = useTransform([reveal, entryProgress], ([raw, ep]) => {
    if (i === 0) return (raw as number) * (ep as number);
    return raw as number;
  });

  const infoY = useTransform(gatedReveal, (r) => (1 - r) * 20);

  return (
    <>
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
        }}
      >
        <FloatingPhotos
          checkpoint={cp}
          checkpoints={checkpoints}
          smoothVH={smoothVH}
          index={i}
          checkpointReveal={gatedReveal}
        />
      </motion.div>

      <motion.div
        style={{
          position: 'absolute',
          opacity: gatedReveal,
          y: infoY,
          zIndex: 50,
          willChange: 'opacity, transform',
          pointerEvents: 'none',
        }}
        className="checkpoint-info-zone pointer-events-none"
      >
        <motion.div
          style={{
            pointerEvents: useTransform(gatedReveal, (r) => (r > 0.5 ? 'auto' : 'none')) as any,
          }}
        >
          <CheckpointInfoCard checkpoint={cp} index={i} total={total} />
        </motion.div>
      </motion.div>
    </>
  );
}
