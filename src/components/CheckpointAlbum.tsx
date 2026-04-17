import { motion, useTransform, type MotionValue } from 'framer-motion';
import { useCheckpointAlbumAnimation, type CheckpointAlbumProps } from '../hooks/useCheckpointAlbumAnimation';
import { SCROLL_CONFIG, getCheckpointStartVH } from '../lib/scrollUtils';
import { CheckpointInfoCard } from './CheckpointInfoCard';
import { PhotoCard } from './PhotoCard';
import { ScrollSlide } from './ScrollSlide';

// ── Direction & Rotation lookups for photos ───────────────────────────────────
// Deterministic (no runtime randomness) to avoid hydration mismatches.
const DIRECTIONS = [
  { dx: 0, dy: -320 }, // top
  { dx: 320, dy: 0 }, // right
  { dx: 0, dy: 320 }, // bottom
  { dx: -320, dy: 0 }, // left
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

// ── Main Component ────────────────────────────────────────────────────────────

export function CheckpointAlbum(props: CheckpointAlbumProps) {
  const { cp, checkpoints, i, total, smoothVH } = props;

  // 1. Get the behavior/animations from our custom hook
  const { groupY, gatedReveal, infoY } = useCheckpointAlbumAnimation(props);

  // 2. Pre-calculate the starting point of the album for the photos
  const startVH = getCheckpointStartVH(checkpoints, i);

  // Hide the entire checkpoint layer when its reveal is essentially 0.
  // This prevents higher-z-index layers from obscuring earlier checkpoints
  // during backward jumps or while the spring is catching up.
  const wrapperVisibility = useTransform(gatedReveal, r => r > 0.01 ? 'visible' : 'hidden');

  // 3. Render the layout
  return (
    <motion.div
      style={{
        position: 'absolute',
        inset: 0,
        y: groupY,
        zIndex: i * 10,
        pointerEvents: 'none',
        visibility: wrapperVisibility as any,
      }}
    >
      {/* ── Album Photos Stack ── */}
      {cp.photos.length > 0 && (
        <div className="photo-stack-wrapper">
          <div className="ps-deck">
            {cp.photos.map((photo, photoIdx) => (
              <PhotoSlideInstance
                key={`photo-${photo.id}`}
                photo={photo}
                photoIdx={photoIdx}
                totalPhotos={cp.photos.length}
                index={i}
                startVH={startVH}
                smoothVH={smoothVH}
                checkpointReveal={gatedReveal}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Album Info Card ── */}
      <motion.div
        style={{
          position: 'absolute',
          opacity: gatedReveal,
          y: infoY,
          zIndex: 50,
          willChange: 'opacity, transform',
          pointerEvents: 'none',
        }}
        className="checkpoint-info-zone pointer-events-none"
      >
        <motion.div
          style={{
            pointerEvents: useTransform(gatedReveal, (r) => (r > 0.5 ? 'auto' : 'none')) as any,
          }}
        >
          <CheckpointInfoCard checkpoint={cp} index={i} total={total} />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ── Sub-component to safely use hooks per-photo ───────────────────────────────

interface PhotoSlideInstanceProps {
  photo: any;
  photoIdx: number;
  totalPhotos: number;
  index: number;
  startVH: number;
  smoothVH: MotionValue<number>;
  checkpointReveal: MotionValue<number>;
}

function PhotoSlideInstance({
  photo,
  photoIdx,
  totalPhotos,
  index,
  startVH,
  smoothVH,
  checkpointReveal
}: PhotoSlideInstanceProps) {
  const { SLICE_VH } = SCROLL_CONFIG;

  let offsetVH = photoIdx * SLICE_VH;
  if (index === 0 && photoIdx > 0) {
    offsetVH -= 100;
  }
  const sliceStart = startVH + offsetVH;
  const sliceEnd = sliceStart + SLICE_VH;

  // 0: hidden, 1: perfectly revealed, 2: covered by the next photo
  const localReveal = useTransform(smoothVH, [sliceStart, sliceEnd, sliceEnd + SLICE_VH], [0, 1, 2]);

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
      <div className="ps-peek-face">
        <PhotoCard
          photo={photo}
          showFooter
          counter={totalPhotos > 1 ? `${photoIdx + 1} / ${totalPhotos}` : undefined}
        />
      </div>
    </ScrollSlide>
  );
}
