import { useTransform, type MotionValue } from 'framer-motion';
import { SCROLL_CONFIG, getCheckpointStartVH, sliceCount, type ScrollableCheckpoint } from '../lib/scrollUtils';
import type { ActiveModal, Checkpoint } from '../lib/types.client';

export interface PhotoAlbumProps {
  cp          : Checkpoint;
  checkpoints : Checkpoint[];
  scrollables : ScrollableCheckpoint[];
  i           : number;
  total       : number;
  smoothVH    : MotionValue<number>;
  entryProgress: MotionValue<number>;
  exitStyle?  : 'default' | 'ambyar';
  setActiveModal: (val: ActiveModal | null) => void;
}

export function usePhotoAlbumAnimation({
  scrollables,
  i,
  total,
  smoothVH,
  entryProgress,
}: PhotoAlbumProps) {
  const { SLICE_VH, REST_VH } = SCROLL_CONFIG;
  const budget = SLICE_VH + REST_VH;

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. TIMELINE — Define when each phase starts and ends (in scroll-vh units)
  // ═══════════════════════════════════════════════════════════════════════════
  const startVH = getCheckpointStartVH(scrollables, i);
  const budgetVH = sliceCount(scrollables[i], i) * budget;
  const endVH = startVH + budgetVH; // When the last photo has been scrolled past
  const exitEndVH = endVH + SLICE_VH;   // When the exit animation finishes (takes 1 slide duration)
  const isLast = i === total - 1;    // Last checkpoint never scrolls out

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. ENTRY — How the album arrives on screen
  // ═══════════════════════════════════════════════════════════════════════════

  // Master reveal signal (0→1): drives PhotoSlide entry animations.
  // CP0 is gated on the map's own entry zoom, not scroll position.
  const rawReveal = useTransform(smoothVH, [startVH, startVH + SLICE_VH], [0, 1]);
  const gatedReveal = useTransform([rawReveal, entryProgress], ([raw, ep]) => {
    if (i === 0) return ep as number;
    return raw as number;
  });

  // Photo stack drifts up into position as the map pans to the marker.
  const entryStartVH = (i === 0 ? 0 : startVH) - SLICE_VH;
  const entryEndVH = i === 0 ? 0 : startVH;
  const entryY = useTransform(smoothVH,
    [entryStartVH, entryEndVH],
    [i === 0 ? '0vh' : '40vh', '0vh']
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. EXIT — How the album leaves the screen
  // ═══════════════════════════════════════════════════════════════════════════

  // Single exit progress signal (0 = resting, 1 = fully exited).
  // All exit animations are derived from this — Y and opacity stay in sync automatically.
  const albumExitProgress = useTransform(smoothVH, [endVH, exitEndVH], [0, isLast ? 0 : 1]);

  // Photo stack: drift up and fade — both driven by the same progress, perfectly in sync.
  const photoExitY = useTransform(albumExitProgress, p => `${-p * 10}vh`);
  const photoExitOpacity = useTransform(albumExitProgress, p => 1 - p);

  // Info card lifecycle signal (0→1→2) fed directly to ScrollSlide.
  // ScrollSlide handles entry (entryDx) and exit (exitDx) by itself.
  const rawInfoReveal = useTransform(smoothVH,
    [startVH, startVH + SLICE_VH, endVH, exitEndVH],
    [0, 1, 1, isLast ? 1 : 2]
  );
  // CP0: entry phase is gated on map zoom; exit phase always uses scroll.
  const infoCardReveal = useTransform([rawInfoReveal, entryProgress], ([raw, ep]) => {
    const rawVal = raw as number;
    if (i === 0 && rawVal <= 1) return ep as number;
    return rawVal;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. COMPOSE — Bundle into per-element style objects
  // ═══════════════════════════════════════════════════════════════════════════

  // Outer wrapper: only handles z-index layering and visibility gating.
  const wrapperVisibility = useTransform(
    [gatedReveal, albumExitProgress],
    ([reveal, exit]) => {
      const r = reveal as number;
      const e = exit as number;
      if (r <= 0.01) return 'hidden';
      if (e >= 0.99 && !isLast) return 'hidden';
      return 'visible';
    }
  ) as MotionValue<'visible' | 'hidden'>;

  const wrapperStyle = {
    position: 'absolute' as const,
    inset: 0,
    zIndex: i * 10,
    pointerEvents: 'none' as const,
    visibility: wrapperVisibility,
  };

  // Photo stack: drifts in on entry, slides up and fades on exit.
  // entryY and photoExitY are both derived from smoothVH, so this transform
  // already re-runs transitively whenever smoothVH changes.
  const photoStackStyle = {
    y: useTransform([entryY, photoExitY], ([eY, xY]: string[]) => {
      const v = smoothVH.get();
      if (v < entryEndVH) return eY;
      if (v > endVH) return xY;
      return '0vh';
    }),
    opacity: photoExitOpacity,
  };

  return {
    // ── Per-element styles (apply directly to motion.div) ──────────────────
    wrapperStyle,
    photoStackStyle,
    // ── Signals for child components ───────────────────────────────────────
    gatedReveal,        // → PhotoSlide (checkpointReveal)
    infoCardReveal,     // → ScrollSlide reveal (lifecycle 0→1→2, handles entry + exit)
    albumExitProgress,  // → AmbyarScatter (exitProgress), when exitStyle='ambyar'
  };
}
