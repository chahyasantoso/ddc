import { useTransform, type MotionValue } from 'framer-motion';
import { SCROLL_CONFIG } from '../lib/scrollUtils';
import { ScrollSlide } from './ScrollSlide';

// ── Direction & Rotation lookups for photos ───────────────────────────────────
// Deterministic (no runtime randomness) to avoid hydration mismatches.
const DIRECTIONS = [
  //  { dx: 0, dy: -320 }, // top
  //  { dx: 320, dy: 0 }, // right
  { dx: 0, dy: 320 }, // bottom
  //  { dx: -320, dy: 0 }, // left
] as const;

function getDirection(cpIndex: number, photoIndex: number) {
  const baseOffset = cpIndex * 3;
  const dirIdx = (photoIndex + baseOffset) % DIRECTIONS.length;
  if (photoIndex === 0 && dirIdx === 3) return DIRECTIONS[0]; // Prevent marker collision
  return DIRECTIONS[dirIdx];
}

const ROTATIONS = [-5, 4, -3, 6, -6, 2, 5, -2, 7, -4];

function getRotation(cpIndex: number, photoIndex: number) {
  const baseOffset = cpIndex * 3;
  return ROTATIONS[(photoIndex + baseOffset) % ROTATIONS.length];
}

interface PhotoSlideProps {
  photo: any;
  photoIdx: number;
  totalPhotos: number;
  index: number;
  startVH: number;
  sceneOffset: number;
  smoothVH: MotionValue<number>;
  checkpointReveal: MotionValue<number>;
  onOpen: (rotate: number) => void;
}

export function PhotoSlide({
  photo,
  photoIdx,
  totalPhotos,
  index,
  startVH,
  sceneOffset,
  smoothVH,
  checkpointReveal,
  onOpen,
}: PhotoSlideProps) {
  const { SLICE_VH } = SCROLL_CONFIG;

  // Helper to compute offset for any photoIdx
  function getOffset(pIdx: number) {
    if (pIdx >= totalPhotos) return Infinity; // No next photo
    let off = (pIdx - (index === 0 ? 1 : 0)) * SLICE_VH;
    // sceneOffset applies a gap AFTER photo 0 to allow scene transition
    if (sceneOffset > 0 && pIdx > 0) {
      off += sceneOffset * SLICE_VH;
    }
    return off;
  }

  const arriveStart = startVH + getOffset(photoIdx);
  const arriveEnd = arriveStart + SLICE_VH;
  const nextArriveStart = startVH + getOffset(photoIdx + 1);
  const nextArriveEnd = nextArriveStart + SLICE_VH;

  // 0: hidden, 1: perfectly revealed, 2: covered by the next photo
  // If there's a gap before the next photo, Math.max ensures the hold state at '1' elongates
  const localReveal = useTransform(
    smoothVH, 
    [arriveStart, arriveEnd, Math.max(arriveEnd, nextArriveStart), nextArriveEnd], 
    [0, 1, 1, 2]
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
      if (photoIdx === 0) {
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

  const { dx, dy } = getDirection(index, photoIdx);
  const rotate = getRotation(index, photoIdx);

  return (
    <ScrollSlide
      reveal={finalReveal}
      revealDx={dx}
      revealDy={dy}
      revealScaleStart={0.88}
      revealRotateStart={rotate}
      baseRotate={rotate}
      className="ps-card"
      zIndex={photoIdx + 1}
    >
      <div
        className="ps-peek-face"
        onClick={() => onOpen(rotate)}
        style={{ cursor: 'pointer' }}
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

        {(photo.caption || totalPhotos > 1) && (
          <div className="ps-footer">
            {photo.caption && (
              <p className="ps-caption">{photo.caption}</p>
            )}
            {totalPhotos > 1 && (
              <span className="ps-counter">{`${photoIdx + 1} / ${totalPhotos}`}</span>
            )}
          </div>
        )}
      </div>
    </ScrollSlide>
  );
}
