import { useCallback, useRef } from 'react';
import { useScroll, useTransform, motion, type MotionValue } from 'framer-motion';

import { CheckpointInfoCard } from './CheckpointInfoCard';
import { InteractiveMap } from './InteractiveMap';
import type { Checkpoint } from '../lib/types.client';
import {
  SCROLL_CONFIG,
  getTotalVH,
  getCheckpointStartVH,
  sliceCount,
  triggerScrollyJump,
} from '../lib/scrollUtils';
import { useJumpableSpring } from '../hooks/useJumpableSpring';
import { useActiveCheckpoint } from '../hooks/useActiveCheckpoint';
import { CheckpointAlbum } from './CheckpointAlbum';

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

  // Dispatch active checkpoint ring events to the map
  useActiveCheckpoint(smoothVH, checkpoints);

  const handleJump = useCallback(
    (targetIdx: number) => {
      const currentVh = smoothVH.get();
      // Always use the teleport jump when clicking a map marker.
      // Smooth scrolling through a long adjacent album feels like a bug.
      const isSequential = false;
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

      {/* INVISIBLE SNAP ANCHORS: Aligns browser scroll with the arrival of EACH photo! */}
      {checkpoints.flatMap((cp, i) => {
        const startVH = getCheckpointStartVH(checkpoints, i);
        
        const snaps = cp.photos.map((_, photoIdx) => {
          const isCPArrival = i > 0 && photoIdx === 0;
          // Checkpoint 0 is shifted left by 1 slice, so its arrival points are (photoIdx) * 100vh
          // instead of (photoIdx + 1) * 100vh.
          const arrivalVH = startVH + (i === 0 ? photoIdx : photoIdx + 1) * SCROLL_CONFIG.SLICE_VH;
          
          return {
            // For jumps, we anchor to the first photo's arrival point (except CP0, which map clicks jump to 0vh manually if we want, or rather checkpoint-snap-0 is P0 arrival which is 0vh)
            id: (i === 0 && photoIdx === 0) || isCPArrival ? `checkpoint-snap-${i}` : undefined,
            vh: arrivalVH
          };
        });
        
        return snaps;
      }).map((snap, globalIdx) => (
        <div
          key={snap.id || `photo-snap-${globalIdx}`}
          id={snap.id}
          style={{
            position: 'absolute',
            top: `${snap.vh}vh`,
            height: '10px',
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
          height: '100dvh', // Modern dynamic viewport (100vh fallback)
          minHeight: '100vh', 
          width: '100vw',
        }}
      >

        {/* Interactive Map Layer */}
        {/* pointerEvents: 'none' on the wrapper lets photo clicks pass through.   */}
        {/* The map canvas itself handles marker clicks internally via maplibre.    */}
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
              pointerEvents: 'none',
            }}
          >
            <div style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}>
              <InteractiveMap
                checkpoints={mapCheckpoints}
                photoCounts={checkpoints.map(cp => cp.photos.length)}
                scrollProgress={scrollYProgress}
                onCheckpointClick={(idx) => handleJump(idx)}
              />
            </div>
          </motion.div>
        )}

        {/* PHOTO STACKS & INFO CARDS */}
        <div className="floating-photos-zone">
          {checkpoints.length > 0 ? (
            checkpoints.map((cp, i) => (
              <CheckpointAlbum
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



