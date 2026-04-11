import type { Photo } from '../lib/types.client';

interface Props {
  photo      : Photo;
  showFooter?: boolean; // show caption + counter overlay on top card
  counter?   : string;  // e.g. "2 / 5"
}

/**
 * Pure presentational photo card content.
 * Renders: image frame + (optionally) caption/counter footer overlay.
 *
 * No animation logic — wrap with <ScrollSlide> and a drag motion.div
 * from the parent for interactive behaviour.
 */
export function PhotoCard({ photo, showFooter = false, counter }: Props) {
  return (
    <>
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

      {showFooter && (photo.caption || counter) && (
        <div className="ps-footer">
          {photo.caption && (
            <p className="ps-caption">{photo.caption}</p>
          )}
          {counter && (
            <span className="ps-counter">{counter}</span>
          )}
        </div>
      )}
    </>
  );
}
