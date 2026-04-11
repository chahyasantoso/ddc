import type { Photo } from '../lib/types.client';

interface PhotoCardProps {
  photo: Photo;
}

/**
 * Pure presentational component for a single floating photo card.
 * Renders image + optional caption with hover zoom effect (CSS-driven).
 * No animation logic — wrap with <ScrollSlide> for scroll-linked animation.
 */
export function PhotoCard({ photo }: PhotoCardProps) {
  return (
    <>
      <div className="fp-frame">
        <img
          src={photo.photo_url}
          alt={photo.caption}
          loading="lazy"
          decoding="async"
          className="fp-img"
        />
      </div>
      {photo.caption && (
        <figcaption className="fp-caption">{photo.caption}</figcaption>
      )}
    </>
  );
}
