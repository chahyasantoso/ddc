import { useRef, useEffect, useCallback } from 'react';
import { useScroll, useSpring, useTransform, motion, type MotionValue, useMotionValueEvent } from 'framer-motion';
import { FloatingPhotos } from './FloatingPhotos';
import { CheckpointInfoCard } from './CheckpointInfoCard';
import { InteractiveMap } from './InteractiveMap';
import type { Checkpoint } from '../lib/types.client';
import { SCROLL_CONFIG, getTotalVH, getCheckpointCenter, useJumpableSpring, triggerScrollyJump } from '../lib/scrollUtils';

interface Props {
  checkpoints: Checkpoint[];
  mapCheckpoints?: { id: number; location_name: string; lat: number; lng: number }[];
}

/**
 * Native Sticky Scrollytelling UI Orchestrator.
 * 
 * Architecture:
 * - A single 200vh * N height container drives the native scroll.
 * - One sticky layer renders ALL cities simultaneously.
 * - Each city calculates its own localized 'reveal' (0-1) based on pure scroll VH.
 * - This allows smooth overlapping transitions (relay handover) without remounting artifacts.
 */
export function ScrollytellingUI({ checkpoints, mapCheckpoints }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Entry animation progress (from bottom of viewport to top of viewport)
  const { scrollYProgress: entryProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "start start"]
  });

  const smoothProgress = useJumpableSpring(scrollYProgress, {
    stiffness: 100,
    damping: 40,
    restDelta: 0.001
  });

  const smoothEntryProgress = useJumpableSpring(entryProgress, {
    stiffness: 100,
    damping: 40,
    restDelta: 0.001
  });

  // Map scales up from 75% to 100% and border disappears when it reaches the top
  const mapScale = useTransform(smoothEntryProgress, [0, 1], [0.75, 1]);
  const mapBorderRadius = useTransform(smoothEntryProgress, [0, 1], ["40px", "0px"]);

  // Native motion value streams (no React state re-renders)
  const totalVH = checkpoints.length > 0 ? getTotalVH(checkpoints.length) : 0;
  const smoothVH = useTransform(smoothProgress, p => Math.max(0, Math.min(1, p)) * totalVH);

  // Still dispatch global events on scroll for interactive map synchronization
  // We can track smoothVH to update active active checkpoint ID
  useMotionValueEvent(smoothVH, "change", (vh) => {
    if (checkpoints.length === 0) return;
    const activeK = Math.min(Math.round(vh / SCROLL_CONFIG.VH_PER_CHECKPOINT), checkpoints.length - 1);
    const activeID = checkpoints[activeK].id;
    window.dispatchEvent(
      new CustomEvent('ddc:checkpoint-active', { detail: { id: activeID } })
    );
  });

  const handleJump = useCallback((targetIdx: number) => {
    const currentVh = smoothVH.get();
    const currentIdx = Math.round(currentVh / SCROLL_CONFIG.VH_PER_CHECKPOINT);
    const isSequential = Math.abs(currentIdx - targetIdx) <= 1;
    triggerScrollyJump(targetIdx, isSequential);
  }, [smoothVH]);

  return (
    <div 
      ref={containerRef} 
      className="native-scrolly-container"
      style={{ height: `${Math.max(100, getTotalVH(checkpoints.length) + 100)}vh`, position: 'relative' }}
    >

      {/* INVISIBLE SNAP ANCHORS: Natively aligns browser scroll with checkpoint centers */}
      {checkpoints.map((cp, i) => (
        <div
          key={`snap-${cp.id}`}
          id={`checkpoint-snap-${i}`}
          style={{
            position: 'absolute',
            top: `${getCheckpointCenter(i)}vh`,
            height: '100vh',
            width: '100%',
            scrollSnapAlign: 'start',
            pointerEvents: 'none'
          }}
        />
      ))}

      <div 
        className="sticky-content-layer"
        style={{ 
          position: 'sticky', 
          top: 0, 
          height: '100vh', 
          width: '100vw'
        }}
      >
        
        {/* Interactive Map Layer (Scales dynamically upon entering) */}
        {mapCheckpoints && (
          <motion.div 
            style={{ 
              position: 'absolute', 
              inset: 0, 
              scale: mapScale, 
              borderRadius: mapBorderRadius, 
              overflow: 'hidden',
              transformOrigin: 'center',
              backgroundColor: '#0f0e0d' // Prevents flashing white behind map
            }}
          >
             <InteractiveMap 
               checkpoints={mapCheckpoints} 
               scrollProgress={scrollYProgress} 
               onCheckpointClick={(idx) => {
                 handleJump(idx);
               }}
             />
          </motion.div>
        )}

        {/* PHOTO DECKS & INFO CARDS ZONES */}
        <div className="floating-photos-zone">
          {checkpoints.length > 0 ? (
            checkpoints.map((cp, i) => (
              <CheckpointLayer 
                key={cp.id} 
                cp={cp} 
                i={i} 
                isLast={i === checkpoints.length - 1} 
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
                transition={{ duration: 0.8, ease: "easeOut" }}
                style={{ textAlign: 'center', color: '#fff' }}
              >
                <h2 style={{ 
                  fontFamily: '"Oswald", sans-serif', 
                  fontSize: 'clamp(3rem, 10vw, 6rem)', 
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '1rem',
                  background: 'linear-gradient(180deg, #fff 40%, rgba(255,255,255,0.4) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  Coming Soon
                </h2>
                <p style={{ 
                  fontSize: '18px', 
                  opacity: 0.8, 
                  letterSpacing: '0.2em', 
                  textTransform: 'uppercase',
                  fontWeight: 500
                }}>
                  Preparing the next journey
                </p>
                <div style={{ 
                  width: '60px', 
                  height: '2px', 
                  background: '#f59e0b', 
                  margin: '2rem auto 0',
                  boxShadow: '0 0 15px #f59e0b' 
                }} />
              </motion.div>
            </div>
          )}
        </div>

      </div>

      {/* Floating Jump to Latest Checkpoint Button */}
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <polyline points="19 12 12 19 5 12"></polyline>
          </svg>
        </button>
      )}
    </div>
  );
}

// ── Sub-components for Hook Scoping ──────────────────────────────────────────

interface CheckpointLayerProps {
  cp: Checkpoint;
  i: number;
  total: number;
  isLast: boolean;
  smoothVH: MotionValue<number>;
  entryProgress: MotionValue<number>;
}

function CheckpointLayer({ cp, i, total, isLast, smoothVH, entryProgress }: CheckpointLayerProps) {
  const center = getCheckpointCenter(i);
  const { PARKED_TOLERANCE, FADE_DURATION } = SCROLL_CONFIG;

  // Derive localized reveal progress directly from smoothVH
  const revealRaw = useTransform(smoothVH, (y) => {
    const delta = y - center;
    let r = 1;
    if (delta < -PARKED_TOLERANCE) {
      if (delta < -(PARKED_TOLERANCE + FADE_DURATION)) r = 0;
      else r = (delta + (PARKED_TOLERANCE + FADE_DURATION)) / FADE_DURATION;
    } else if (delta > PARKED_TOLERANCE) {
      if (isLast) r = 1;
      else if (delta > (PARKED_TOLERANCE + FADE_DURATION)) r = 0;
      else r = 1 - (delta - PARKED_TOLERANCE) / FADE_DURATION;
    }
    return r;
  });

  // Combine with entry sequence for first checkpoint
  const reveal = useTransform([revealRaw, entryProgress], ([raw, ep]) => {
    if (i === 0) return (raw as number) * (ep as number);
    return raw as number;
  });

  // Calculate generic derived values
  const infoY = useTransform(reveal, r => (1 - r) * 20);

  return (
    <>
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none', // Allow clicks to pass through empty regions
        }}
      >
        <FloatingPhotos checkpoint={cp} reveal={reveal} index={i} />
      </motion.div>

      <motion.div
        style={{
          position: 'absolute',
          opacity: reveal,
          y: infoY,
          zIndex: 50, // Keep info card strictly above photos
          willChange: 'opacity, transform',
          pointerEvents: 'none', // Let map clicks pass through background
        }}
        // pointerEvents handles clicks blocking map interaction
        className="checkpoint-info-zone pointer-events-none"
      >
        <motion.div style={{ pointerEvents: useTransform(reveal, r => r > 0.5 ? 'auto' : 'none') as any }}>
          <CheckpointInfoCard
            checkpoint={cp}
            index={i}
            total={total}
          />
        </motion.div>
      </motion.div>
    </>
  );
}
