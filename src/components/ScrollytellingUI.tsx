import { motion, useAnimation, useMotionValueEvent, useScroll, useTransform } from 'framer-motion';
import React, { useCallback, useRef } from 'react';

import { useActiveCheckpoint } from '../hooks/useActiveCheckpoint';
import { useSceneAnimation } from '../hooks/useSceneAnimation';
import {
  SCROLL_CONFIG,
  getCheckpointStartVH,
  getTotalVH,
  toScrollables,
  triggerScrollyJump
} from '../lib/scrollUtils';
import type { Checkpoint, ActiveModal } from '../lib/types.client';
import type { CheckpointCoord } from '../lib/mapUtils';
import { InteractiveMap } from './InteractiveMap';
import { PhotoAlbum } from './PhotoAlbum';
import { PhotoModal } from './PhotoModal';
import { SceneBackdrop } from './SceneBackdrop';

interface ScrollytellingUIProps {
  checkpoints   : Checkpoint[];
  mapCheckpoints?: CheckpointCoord[];
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
export function ScrollytellingUI({ checkpoints, mapCheckpoints }: ScrollytellingUIProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapIsReady, setMapIsReady] = React.useState(false);
  const [activeModal, setActiveModal] = React.useState<ActiveModal | null>(null);
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

  // Use robust state-based animation for map displacement
  useMotionValueEvent(smoothVH, 'change', (vh) => {
    const pVH = prevVH.current;
    if (vh === pVH) return;

    // Check if map should currently be hidden by a scene
    const currentRange = mapDisplacementRanges.find(r => vh >= r.start && vh < r.end);
    const prevRange = mapDisplacementRanges.find(r => pVH >= r.start && pVH < r.end);

    // If we jump more than 50vh instantly, we skip the animation to avoid jarring fast-forwards
    const isJump = Math.abs(vh - pVH) > 50;

    // Only animate when the hidden state actually changes
    if (!!currentRange !== !!prevRange) {
      if (!prevRange && currentRange) {
        // Map needs to exit
        const exitY = vh > pVH ? '100vh' : '-100vh';
        if (isJump) {
          mapControls.set({ y: exitY });
        } else {
          mapControls.start({ y: exitY, transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] } });
        }
      } else if (prevRange && !currentRange) {
        // Map needs to enter
        const enterStart = vh > pVH ? '-100vh' : '100vh';
        if (isJump) {
          mapControls.set({ y: '0vh' });
        } else {
          mapControls.set({ y: enterStart });
          mapControls.start({ y: '0vh', transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] } });
        }
      }
    }

    prevVH.current = vh;
  });

  const handleJump = useCallback(
    (targetIdx: number) => {
      // Always use the teleport jump when clicking a map marker.
      // Smooth scrolling through a long adjacent album feels like a bug.
      triggerScrollyJump(targetIdx, false);
    },
    [], // stable — triggerScrollyJump reads DOM directly, no captured deps needed
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
          const { SLICE_VH, REST_VH } = SCROLL_CONFIG;
          const budget = SLICE_VH + REST_VH;
          
          // Checkpoint 0 is shifted left by 1 slice, so its arrival points are (photoIdx) * BUDGET
          // instead of (photoIdx + 1) * BUDGET.
          const arrivalVH = startVH + (i === 0 ? photoIdx : photoIdx + 1) * budget;

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
            className="map-motion-wrapper"
            style={{
              scale: mapScale,
              borderRadius: mapBorderRadius,
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
                setActiveModal={setActiveModal}
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
      {/* ── Photo Modal ────────────────────────────────────────────────────── */}
      <PhotoModal
        photo={activeModal?.photo ?? null}
        rotate={activeModal?.rotate ?? 0}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
}
