import { useTransform, type MotionValue } from 'framer-motion';
import { SCROLL_CONFIG } from '../lib/scrollUtils';
import { StackSlide } from './StackSlide';
import type { Photo } from '../lib/types.client';

// ── Direction & Rotation lookups for photos ───────────────────────────────────
// Deterministic (no runtime randomness) to avoid hydration mismatches.
// TODO: restore multi-direction support when design calls for it.
const REVEAL_DIRECTION = { dx: 0, dy: 320 } as const; // bottom

function getDirection(_absoluteIndex: number) {
  return REVEAL_DIRECTION;
}

interface PhotoSlideProps {
  photo: Photo;
  absoluteIndex: number; // Absolute index in the unified timeline
  totalItems: number;    // Total photos + backdrops
  index: number;         // Checkpoint index
  startVH: number;       // Base map pan end
  smoothVH: MotionValue<number>;
  checkpointReveal: MotionValue<number>;
  parallaxFactor?: number;
  onOpen: (rotate: number) => void;
}

export function PhotoSlide({
  photo,
  absoluteIndex,
  totalItems,
  index,
  startVH,
  smoothVH,
  checkpointReveal,
  parallaxFactor,
  onOpen,
}: PhotoSlideProps) {
  const { SLICE_VH, REST_VH } = SCROLL_CONFIG;
  const PHOTO_BUDGET = SLICE_VH + REST_VH;

  // Helper to compute offset for any absolute timeline index
  function getOffset(k: number) {
    if (k >= totalItems) return Infinity; // No next item
    return (k - (index === 0 ? 1 : 0)) * PHOTO_BUDGET;
  }

  const arriveStart = startVH + getOffset(absoluteIndex);
  const arriveEnd = arriveStart + SLICE_VH;
  const nextArriveStart = startVH + getOffset(absoluteIndex + 1);
  const nextArriveEnd = nextArriveStart + SLICE_VH;

  // 0: hidden, 1: perfectly revealed, >1: pushed back in the stack
  // If there's a gap before the next photo, it holds at 1. Then it grows as subsequent photos arrive.
  const localReveal = useTransform(
    smoothVH, 
    (vh) => {
      if (vh < arriveStart) return 0;
      if (vh <= Math.max(arriveEnd, nextArriveStart)) {
        return Math.min(1, (vh - arriveStart) / SLICE_VH);
      }
      return 1 + (vh - Math.max(arriveEnd, nextArriveStart)) / SLICE_VH;
    }
  );

  // Combine local scroll slice progress with the macro checkpoint reveal 
  const finalReveal = useTransform(
    [localReveal, checkpointReveal],
    ([pr, cr]) => {
      const prVal = pr as number;
      const crVal = cr as number;

      // The FIRST photo of ANY checkpoint uses checkpointReveal as its primary signal.
      // This guarantees it's visible (reveal=1) as soon as the checkpoint opens, 
      // whether via normal scroll or a jump. localReveal only pushes it to 2 (the
      // "covered/tilted" state) when the next photo arrives on top.
      if (absoluteIndex === 0) {
        // Special case for CP0 Photo 0: During the map entry zoom, crVal goes 0->1 while prVal is ALREADY 1
        // because we shifted its slice schedule left to -100vh. We must force it to use crVal so we see the fly-in!
        if (index === 0 && crVal < 0.999) {
          return crVal;
        }
        return Math.max(crVal, prVal);
      }
      return prVal * Math.min(1, crVal);
    }
  );

  const { dx, dy } = getDirection(absoluteIndex);
  const rotate = photo.is_backdrop ? 0 : [3, -2, 4, -4, 2][absoluteIndex % 5];

  return (
    <StackSlide
      reveal={finalReveal}
      revealDx={dx}
      revealDy={dy}
      revealScaleStart={0.88}
      revealRotateStart={rotate}
      baseRotate={rotate}
      parallaxFactor={parallaxFactor}
      className="ps-card"
      zIndex={absoluteIndex + 1}
    >
      <div
        className="ps-peek-face"
        onClick={() => onOpen(rotate)}
      >
        <div className="fp-frame">
          <img
            className="fp-img"
            src={photo.photo_url}
            alt={photo.caption ?? ''}
            draggable={false}
            onDragStart={e => e.preventDefault()}
            loading="lazy"
            decoding="async"
          />
        </div>

        {photo.caption && (
          <div className="ps-footer">
            <p className="ps-caption">{photo.caption}</p>
            <span className="ps-counter">
              {absoluteIndex + 1} / {totalItems}
            </span>
          </div>
        )}
      </div>
    </StackSlide>
  );
}
