import { useRef, useState, useEffect } from 'react';
import { useScroll, useMotionValueEvent } from 'framer-motion';
import { FloatingPhotos } from './FloatingPhotos';
import { CheckpointInfoCard } from './CheckpointInfoCard';
import type { Checkpoint } from '../lib/types.client';
import { SCROLL_CONFIG, getTotalVH, getCheckpointCenter } from '../lib/scrollUtils';

interface Props {
  checkpoints: Checkpoint[];
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
export function ScrollytellingUI({ checkpoints }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollVH, setScrollVH] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  useMotionValueEvent(scrollYProgress, "change", (p) => {
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
    if (delta < -PARKED_TOLERANCE) {
      if (delta < -(PARKED_TOLERANCE + FADE_DURATION)) return 0;
      return (delta + (PARKED_TOLERANCE + FADE_DURATION)) / FADE_DURATION;
    }
    
    // Departure: stays parked until PARKED_TOLERANCE after center
    // Special case: Last city should NOT slide out at the end of the journey.
    if (delta > PARKED_TOLERANCE) {
      if (cityIdx === checkpoints.length - 1) return 1; 
      if (delta > (PARKED_TOLERANCE + FADE_DURATION)) return 0;
      return 1 - (delta - PARKED_TOLERANCE) / FADE_DURATION;
    }
    
    return 1; // Parked range
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
      {/* --- DEBUG HUD --- */}
      <div style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
        background: 'rgba(0,0,0,0.85)', color: '#0f0', padding: '12px',
        borderRadius: '8px', fontFamily: 'monospace', fontSize: '14px',
        pointerEvents: 'none', border: '1px solid #0f0', display: 'flex',
        flexDirection: 'column', gap: '4px'
      }}>
        <div style={{ paddingBottom: '4px', borderBottom: '1px solid #0f0', marginBottom: '4px' }}>
          <strong>🕹️ DDC Tracker</strong><br/>
          <div className="text-blue-300">Scroll VH: {scrollVH.toFixed(1)}</div>
        </div>
        {checkpoints.map((cp, i) => {
           const rev = getCityReveal(scrollVH, i);
           const activeStatus = rev === 1 ? '🟢 PARKED' : rev > 0 ? '🟡 MOVING' : '  IDLE  ';
           return (
            <div key={cp.id}>
              [{getCheckpointCenter(i)}vh] {cp.location_name}: <span style={{ color: rev > 0 ? '#fff' : '#555' }}>{rev.toFixed(2)}</span> {activeStatus}
            </div>
           );
        })}
      </div>
      {/* ----------------- */}

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
        
        {/* PHOTO DECKS ZONE: Each city renders its deck if reveal > 0 */}
        <div className="floating-photos-zone">
          {checkpoints.map((cp, i) => {
            const reveal = getCityReveal(scrollVH, i);
            if (reveal <= 0) return null;
            return <FloatingPhotos key={cp.id} checkpoint={cp} reveal={reveal} index={i} />;
          })}
        </div>

        {/* INFO CARDS ZONE: Each city renders its info card if reveal > 0 */}
        <div className="checkpoint-info-zone">
          {checkpoints.map((cp, i) => {
            const reveal = getCityReveal(scrollVH, i);
            if (reveal <= 0) return null;
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
                  pointerEvents: reveal > 0.5 ? 'auto' : 'none'
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
