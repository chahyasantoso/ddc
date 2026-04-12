import { useRef, useState, useEffect } from 'react';
import { useScroll, useMotionValueEvent, useSpring, useTransform, motion } from 'framer-motion';
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
  const [scrollVH, setScrollVH] = useState(0);
  const [entryProgressValue, setEntryProgressValue] = useState(0);

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

  useMotionValueEvent(entryProgress, "change", (p) => {
    setEntryProgressValue(p);
  });

  useMotionValueEvent(smoothProgress, "change", (p) => {
    if (checkpoints.length === 0) return;
    // Map progression to total virtual height of scroll content
    const totalVH = getTotalVH(checkpoints.length);
    setScrollVH(Math.max(0, Math.min(1, p)) * totalVH);
  });

  // Helper to calculate reveal (0-1) for a specific city based on current scroll
  function getCityReveal(y: number, cityIdx: number) {
    const center = getCheckpointCenter(cityIdx);
    const delta = y - center;
    const { PARKED_TOLERANCE, FADE_DURATION } = SCROLL_CONFIG;
    
    // Arrival: fully parked PARKED_TOLERANCE before center
    let reveal = 1;
    if (delta < -PARKED_TOLERANCE) {
      if (delta < -(PARKED_TOLERANCE + FADE_DURATION)) reveal = 0;
      else reveal = (delta + (PARKED_TOLERANCE + FADE_DURATION)) / FADE_DURATION;
    }
    // Departure: stays parked until PARKED_TOLERANCE after center
    // Special case: Last city should NOT slide out at the end of the journey.
    else if (delta > PARKED_TOLERANCE) {
      if (cityIdx === checkpoints.length - 1) reveal = 1; 
      else if (delta > (PARKED_TOLERANCE + FADE_DURATION)) reveal = 0;
      else reveal = 1 - (delta - PARKED_TOLERANCE) / FADE_DURATION;
    }
    
    // Smooth entry transition for the first checkpoint linked to Hero->Map scroll
    if (cityIdx === 0) {
      return reveal * entryProgressValue;
    }
    
    return reveal;
  }

  // Handle global event dispatching for map synchronization
  useEffect(() => {
    const N = checkpoints.length;
    if (N === 0) return;
    
    // Find which city is currently the closest to being active (for z-indexing)
    let activeK = 0;
    if (checkpoints.length > 0) {
      activeK = Math.min(Math.round(scrollVH / SCROLL_CONFIG.VH_PER_CHECKPOINT), checkpoints.length - 1);
    }
    const activeID = checkpoints[activeK].id;
    
    window.dispatchEvent(
      new CustomEvent('ddc:checkpoint-active', { detail: { id: activeID } })
    );
  }, [scrollVH, checkpoints]);

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

        {/* PHOTO DECKS ZONE: Each city renders its deck */}
        <div className="floating-photos-zone">
          {checkpoints.map((cp, i) => {
            const reveal = getCityReveal(scrollVH, i);
            return (
              <div
                key={cp.id}
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: reveal > 0.1 ? 'auto' : 'none',
                }}
              >
                <FloatingPhotos checkpoint={cp} reveal={reveal} index={i} />
              </div>
            );
          })}
        </div>

        {/* INFO CARDS ZONE: Each city renders its info card */}
        <div className="checkpoint-info-zone">
          {checkpoints.map((cp, i) => {
            const reveal = getCityReveal(scrollVH, i);
            return (
              <div 
                key={cp.id} 
                style={{ 
                  position: 'absolute', 
                  inset: 0, 
                  display: 'flex', 
                  alignItems: 'center',
                  opacity: reveal,
                  transform: `translateY(${(1 - reveal) * 20}px)`,
                  pointerEvents: reveal > 0.5 ? 'auto' : 'none',
                  visibility: reveal > 0 ? 'visible' : 'hidden', // Add visibility hidden for perf
                }}
              >
                <CheckpointInfoCard 
                  checkpoint={cp} 
                  index={i}
                  total={checkpoints.length}
                />
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
