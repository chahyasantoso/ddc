import { ScrollSlide, type SlideDirection } from './ScrollSlide';
import { PhotoCard } from './PhotoCard';
import type { Checkpoint } from '../lib/types.client';

// ── Per-photo-slot config ─────────────────────────────────────────────────────
// Each slot has a fixed slide direction and a subtle rotation.
// Index matches the photo's position in the checkpoint (0 = first photo, etc.)
const PHOTO_SLOTS: Array<{ direction: SlideDirection; rotate: number }> = [
  { direction: 'top',    rotate: -1.8 }, // slot 0: enters from top,   tilted left
  { direction: 'right',  rotate:  1.5 }, // slot 1: enters from right,  tilted right
  { direction: 'bottom', rotate: -1.0 }, // slot 2: enters from bottom, tilted left
];

interface FloatingPhotosProps {
  checkpoint: Checkpoint;
  /** Reveal value 0–1, computed by the parent from scroll progress */
  reveal: number;
}

/**
 * Renders up to 3 floating photo cards for a single checkpoint.
 * Each card is wrapped in <ScrollSlide> so it animates in/out based on reveal.
 *
 * Positioning is controlled by CSS classes `.float-photo-0/1/2`.
 * Animation is fully driven by the `reveal` prop — no internal state.
 */
export function FloatingPhotos({ checkpoint, reveal }: FloatingPhotosProps) {
  return (
    <>
      {checkpoint.photos.slice(0, PHOTO_SLOTS.length).map((photo, pi) => {
        const slot = PHOTO_SLOTS[pi];
        return (
          <ScrollSlide
            key={photo.id}
            reveal={reveal}
            direction={slot.direction}
            rotate={slot.rotate}
            // Positions the card in CSS (absolute layout within floating-photos-zone)
            className={`floating-photo-card float-photo-${pi}`}
            // Hover: native CSS handles fp-img scale; we just straighten rotation
            whileHover={{
              rotate    : 0,
              scale     : 1.04,
              zIndex    : 30,
              transition: { type: 'spring', stiffness: 400, damping: 30 },
            }}
          >
            <PhotoCard photo={photo} />
          </ScrollSlide>
        );
      })}
    </>
  );
}
