import { useRef, useState, useEffect } from 'react';
import { useScroll, useSpring, useTransform, motion, type MotionValue, useMotionValueEvent } from 'framer-motion';
import { FloatingPhotos } from './FloatingPhotos';
import { CheckpointInfoCard } from './CheckpointInfoCard';
import { InteractiveMap } from './InteractiveMap';
import type { Checkpoint } from '../lib/types.client';
import { SCROLL_CONFIG, getTotalVH, getCheckpointCenter } from '../lib/scrollUtils';

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

  // Map scales up from 75% to 100% and border disappears when it reaches the top
  const mapScale = useTransform(entryProgress, [0, 1], [0.75, 1]);
  const mapBorderRadius = useTransform(entryProgress, [0, 1], ["40px", "0px"]);

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 40,
    restDelta: 0.001
  });

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
          width: '100vw',
          overflow: 'hidden'
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
             <InteractiveMap checkpoints={mapCheckpoints} scrollProgress={scrollYProgress} />
          </motion.div>
        )}

        {/* PHOTO DECKS & INFO CARDS ZONES */}
        <div className="floating-photos-zone">
          {checkpoints.map((cp, i) => (
            <CheckpointLayer 
              key={cp.id} 
              cp={cp} 
              i={i} 
              isLast={i === checkpoints.length - 1} 
              total={checkpoints.length} 
              smoothVH={smoothVH} 
              entryProgress={entryProgress} 
            />
          ))}
        </div>

      </div>
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
