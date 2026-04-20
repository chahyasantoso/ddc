import React, { useCallback, useRef } from 'react';
import { useScroll, useTransform, motion, useAnimation, useMotionValueEvent } from 'framer-motion';

import { InteractiveMap } from './InteractiveMap';
import { SceneBackdrop } from './SceneBackdrop';
import type { Checkpoint } from '../lib/types.client';
import {
  SCROLL_CONFIG,
  getTotalVH,
  toScrollables,
  triggerScrollyJump,
  getCheckpointStartVH
} from '../lib/scrollUtils';
import { useActiveCheckpoint } from '../hooks/useActiveCheckpoint';
import { useSceneAnimation } from '../hooks/useSceneAnimation';
import { PhotoAlbum } from './PhotoAlbum';

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
  const [mapIsReady, setMapIsReady] = React.useState(false);
  const mapControls = useAnimation();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Entry animation progress (map scales in as the section enters the viewport)
  const { scrollYProgress: entryProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'start start'],
  });

  // Map scales up and border disappears as it enters
  // With Lenis, the global scroll is already smoothed, so we use the progress values directly
  const mapScale = useTransform(entryProgress, [0, 1], [0.75, 1]);
  const mapBorderRadius = useTransform(entryProgress, [0, 1], ['40px', '0px']);

  const scrollables = React.useMemo(() => toScrollables(checkpoints), [checkpoints]);
  const totalVH = checkpoints.length > 0 ? getTotalVH(scrollables) : 0;
  // Container height = total scroll budget + 100vh padding for last checkpoint settle
  const containerHeightVH = Math.max(100, totalVH + 100);

  // smoothVH: absolute scroll position in viewport-height units
  const smoothVH = useTransform(scrollYProgress, (p) =>
    Math.max(0, Math.min(1, p)) * totalVH,
  );

  // Dispatch active checkpoint ring events to the map
  useActiveCheckpoint(smoothVH, checkpoints);

  // Scene animation: computes map displacement and scene ranges for parallax backgrounds
  const { mapDisplacementRanges, sceneRanges } = useSceneAnimation({
    checkpoints,
    scrollables,
    smoothVH,
  });

  const prevVH = useRef(0);

  // Sync prevVH on mount
  React.useEffect(() => {
    prevVH.current = smoothVH.get();
  }, [smoothVH]);

  // Use triggered animation rather than perfectly matched scroll frames
  useMotionValueEvent(smoothVH, 'change', (vh) => {
    const pVH = prevVH.current;
    
    for (const range of mapDisplacementRanges) {
      // Crossing 'start' downwards -> map exits down
      if (pVH < range.start && vh >= range.start) {
        mapControls.start({ y: '100vh', transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] } });
      }
      // Crossing 'start' upwards -> map enters from bottom (100vh -> 0)
      else if (pVH >= range.start && vh < range.start) {
        mapControls.set({ y: '100vh' }); 
        mapControls.start({ y: '0vh', transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] } });
      }
      // Crossing 'end' downwards -> map enters from top (-100vh -> 0)
      else if (pVH < range.end && vh >= range.end) {
        mapControls.set({ y: '-100vh' }); 
        mapControls.start({ y: '0vh', transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] } });
      }
      // Crossing 'end' upwards -> map exits up (0 -> -100vh)
      else if (pVH >= range.end && vh < range.end) {
        mapControls.start({ y: '-100vh', transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] } });
      }
    }

    prevVH.current = vh;
  });

  const handleJump = useCallback(
    (targetIdx: number) => {
      // Always use the teleport jump when clicking a map marker.
      // Smooth scrolling through a long adjacent album feels like a bug.
      const isSequential = false;
      triggerScrollyJump(targetIdx, isSequential);
    },
    [smoothVH, scrollables],
  );

  // Notify the splash screen once we are visually and mathematically ready
  React.useEffect(() => {
    if (mapIsReady) {
      // Small buffer for React hydration to settle and initial photo decoding
      const timer = setTimeout(() => {
        window.dispatchEvent(new CustomEvent('ddc:ready'));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [mapIsReady]);

  return (
    <div
      ref={containerRef}
      className="native-scrolly-container"
      style={{ height: `${containerHeightVH}dvh` }}
    >

      {/* INVISIBLE SNAP ANCHORS: Aligns browser scroll with the arrival of EACH photo! */}
      {checkpoints.flatMap((cp, i) => {
        const startVH = getCheckpointStartVH(scrollables, i);
        
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
          className="scroll-snap-anchor"
          style={{ top: `${snap.vh}vh` }}
        />
      ))}

      {/* MAP STICKY LAYER (Strictly clipped to avoid mobile Android bug) */}
      <div className="sticky-viewport sv-map">

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
            animate={mapControls}
          >
            <div className="map-canvas-layer">
              <InteractiveMap
                checkpoints={mapCheckpoints}
                scrollables={scrollables}
                scrollProgress={scrollYProgress}
                onCheckpointClick={(idx) => handleJump(idx)}
                onMapLoaded={() => setMapIsReady(true)}
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* SCENE STICKY LAYER (parallax backgrounds for special checkpoints) */}
      <div className="sticky-viewport sv-scene">
        {sceneRanges.map((range) => (
          <SceneBackdrop
            key={`${range.cp.id}-${range.imageIndex}`}
            imageUrl={range.imageUrl}
            entryStartVH={range.entryStartVH}
            entryEndVH={range.entryEndVH}
            exitStartVH={range.exitStartVH}
            exitEndVH={range.exitEndVH}
            smoothVH={smoothVH}
          />
        ))}
      </div>

      {/* PHOTOS STICKY LAYER (Visible overflow so photos can fly) */}
      <div className="sticky-viewport sv-photos">
        {/* PHOTO STACKS & INFO CARDS */}
        <div className="floating-photos-zone">
          {checkpoints.length > 0 ? (
            checkpoints.map((cp, i) => (
              <PhotoAlbum
                key={cp.id}
                cp={cp}
                checkpoints={checkpoints}
                scrollables={scrollables}
                i={i}
                total={checkpoints.length}
                smoothVH={smoothVH}
                entryProgress={entryProgress}
              />
            ))
          ) : (
            <div className="coming-soon-overlay">
              <motion.div
                className="coming-soon-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              >
                <h2 className="coming-soon-title">Coming Soon</h2>
                <p className="coming-soon-subtitle">Preparing the next journey</p>
                <div className="coming-soon-divider" />
              </motion.div>
            </div>
          )}
        </div>

      </div>

      {/* Floating "Latest Update" jump button */}
      {checkpoints.length > 0 && (
        <button
          className="latest-update-btn"
          onClick={() => handleJump(checkpoints.length - 1)}
        >
          <span>Latest Update</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
        </button>
      )}
    </div>
  );
}



