import { useTransform, type MotionValue } from 'framer-motion';
import { SCROLL_CONFIG } from '../lib/scrollUtils';
import { StackSlide } from './StackSlide';
import type { Photo, AnimationDirective } from '../lib/types.client';

// ── Direction & Rotation lookups for photos ───────────────────────────────────
// Deterministic (no runtime randomness) to avoid hydration mismatches.
// TODO: restore multi-direction support when design calls for it.
const REVEAL_DIRECTION = { dx: 0, dy: 320 } as const; // bottom

function getDirection(_absoluteIndex: number) {
  return REVEAL_DIRECTION;
}

interface PhotoSlideProps {
  photo: Photo;
  directive: AnimationDirective;
  absoluteIndex: number; // For visual rotation and counter
  totalItems: number;    // For counter
  index: number;         // Checkpoint index
  smoothVH: MotionValue<number>;
  checkpointReveal: MotionValue<number>;
  parallaxFactor?: number;
  onOpen: (rotate: number) => void;
}

export function PhotoSlide({
  photo,
  directive,
  absoluteIndex,
  totalItems,
  index,
  smoothVH,
  checkpointReveal,
  parallaxFactor,
  onOpen,
}: PhotoSlideProps) {
  const { SLICE_VH } = SCROLL_CONFIG;
  const { startVH, endVH, coverVH } = directive;

  // 0: hidden, 1: perfectly revealed, >1: pushed back in the stack
  // The logic is now purely driven by the directive's VH ranges.
  const localReveal = useTransform(
    smoothVH, 
    (vh) => {
      if (vh < startVH) return 0;
      
      // Phase 1: Revealing (0 -> 1)
      if (vh <= endVH) {
        return (vh - startVH) / SLICE_VH;
      }

      // Phase 2: Resting (at 1) until covered
      if (coverVH === undefined || vh <= coverVH) {
        return 1;
      }

      // Phase 3: Being covered (1 -> 2)
      return 1 + (vh - coverVH) / SLICE_VH;
    }
  );

  // Combine local scroll slice progress with the macro checkpoint reveal 
  const finalReveal = useTransform(
    [localReveal, checkpointReveal],
    ([pr, cr]) => {
      const prVal = pr as number;
      const crVal = cr as number;

      // The FIRST photo of the FIRST checkpoint (CP0) needs special handling 
      // because its arrival happens in 'negative' scroll time (during map zoom).
      // We use a simple product: at scroll 0, prVal is 1.0, so it follows crVal (zoom).
      // Once zoomed (crVal=1), it follows prVal (scroll) perfectly.
      if (index === 0 && absoluteIndex === 0) {
        return prVal * crVal;
      }

      // For every other photo, the Directive-driven localReveal is the boss.
      // We gate it with crVal (0->1) to ensure the album fades in/out with the checkpoint.
      return prVal * Math.min(1, crVal);
    }
  );

  const { dx, dy } = getDirection(absoluteIndex);
  const rotate = photo.is_backdrop ? 0 : [6, -5, 8, -7, 4][absoluteIndex % 5];

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
