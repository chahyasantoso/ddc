import { useTransform, type MotionValue } from 'framer-motion';
import type { Checkpoint } from '../lib/types.client';
import { ScrollSlide } from './ScrollSlide';
import { PhotoCard } from './PhotoCard';
import {
  SCROLL_CONFIG,
  getCheckpointStartVH,
} from '../lib/scrollUtils';

// ── Direction sequence ────────────────────────────────────────────────────────
// Deterministic (no runtime randomness) to avoid hydration mismatches.
// Each photo in a checkpoint enters from a different direction; shift by
// checkpoint index to ensure cross-checkpoint variety.
const DIRECTIONS = [
  { dx:    0, dy: -320 }, // top
  { dx:  320, dy:    0 }, // right
  { dx:    0, dy:  320 }, // bottom
  { dx: -320, dy:    0 }, // left
] as const;

function getDirection(cpIndex: number, photoIndex: number) {
  // Avoid left (negative dx) for the very first slot so it doesn't
  // collide with the map marker on the left side of the viewport.
  const baseOffset = cpIndex * 3; // shift sequence per checkpoint
  const dirIdx = (photoIndex + baseOffset) % DIRECTIONS.length;
  // Slot 0: never use 'left' direction (index 3)
  if (photoIndex === 0 && dirIdx === 3) return DIRECTIONS[0];
  return DIRECTIONS[dirIdx];
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  checkpoint: Checkpoint;
  /** All checkpoints — needed for cumulative VH offset math. */
  checkpoints: Checkpoint[];
  /** Live scroll-VH motion value from the parent. */
  smoothVH: MotionValue<number>;
  /** Index of this checkpoint in the array. */
  index: number;
  /**
   * Checkpoint-level reveal (0–1) driven by CheckpointLayer.
   * When this drops to 0 (user scrolled past the last photo slice),
   * ALL photos in this checkpoint exit together.
   */
  checkpointReveal: MotionValue<number>;
}

// ── Component ─────────────────────────────────────────────────────────────────
/**
 * Scroll-driven sequential photo stack.
 *
 * Architecture
 * ─────────────────────────────────────────────────────────────────────────────
 *  Each photo occupies one 100vh scroll "slice".
 *  As smoothVH crosses a photo's center VH, its individual `reveal` (0→1)
 *  causes it to slide in from a pre-assigned direction via ScrollSlide.
 *
 *  When photo k arrives it stacks ON TOP of photos 0…k-1 (z-index = k+1).
 *  Scrolling back up reverses: photo k slides out before photo k-1.
 *
 *  No drag, no state — all motion is derived from the scroll MotionValue.
 */
export function FloatingPhotos({ checkpoint, checkpoints, smoothVH, index, checkpointReveal }: Props) {
  const photos = checkpoint.photos;
  if (!photos.length) return null;

  const startVH = getCheckpointStartVH(checkpoints, index);

  return (
    <div className="photo-stack-wrapper">
      <div className="ps-deck">
        {photos.map((photo, photoIdx) => (
          <PhotoSlideInstance
            key={`photo-${photo.id}`}
            photo={photo}
            photoIdx={photoIdx}
            totalPhotos={photos.length}
            index={index}
            startVH={startVH}
            smoothVH={smoothVH}
            checkpointReveal={checkpointReveal}
          />
        ))}
      </div>
    </div>
  );
}

// ── Sub-component to safely use hooks per-photo ───────────────────────────────

interface PhotoSlideInstanceProps {
  photo: any; // Using the type from types.client.ts ideally
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
  const { SLICE_VH, PARKED_TOLERANCE, FADE_DURATION } = SCROLL_CONFIG;
  const peakVH = startVH + (photoIdx + 1) * SLICE_VH + SLICE_VH * 0.5;

  const gatedReveal = useTransform(smoothVH, (vh) => {
    const sliceStart = startVH + (photoIdx + 1) * SLICE_VH - FADE_DURATION - PARKED_TOLERANCE;
    if (vh < sliceStart) return 0; // Not yet approached
    const delta = vh - peakVH;
    if (delta >= -PARKED_TOLERANCE) return 1; // At or past peak — fully on
    const t = delta + PARKED_TOLERANCE;
    return Math.max(0, 1 + t / FADE_DURATION);
  });

  const finalReveal = useTransform(
    [gatedReveal, checkpointReveal],
    ([pr, cr]) => Math.min(pr as number, cr as number),
  );

  const { dx, dy } = getDirection(index, photoIdx);

  return (
    <ScrollSlide
      reveal={finalReveal}
      revealDx={dx}
      revealDy={dy}
      revealScaleStart={0.88}
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
