import { motion, useTransform } from 'framer-motion';
import { useState } from 'react';
import { usePhotoAlbumAnimation, type PhotoAlbumProps } from '../hooks/usePhotoAlbumAnimation';
import { getCheckpointStartVH } from '../lib/scrollUtils';
import type { Photo } from '../lib/types.client';
import { InfoCard } from './InfoCard';
import { PhotoModal } from './PhotoModal';
import { PhotoSlide } from './PhotoSlide';
import { ScrollSlide } from './ScrollSlide';

// ── Main Component ────────────────────────────────────────────────────────────

export function PhotoAlbum(props: PhotoAlbumProps) {
  const { cp, scrollables, i, total, smoothVH } = props;

  // Modal state: which photo is open (null = closed)
  const [activeModal, setActiveModal] = useState<{ photo: Photo; rotate: number } | null>(null);

  // 1. Get the behavior/animations from our custom hook
  const { groupY, groupOpacity, gatedReveal, infoY } = usePhotoAlbumAnimation(props);

  // 2. Pre-calculate the starting point of the album for the photos
  const startVH = getCheckpointStartVH(scrollables, i);

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
        opacity: groupOpacity,
        zIndex: i * 10,
        pointerEvents: 'none',
        visibility: wrapperVisibility as any,
      }}
    >
      {/* ── Album Photos Stack ── */}
      {cp.photos.length > 0 && (
        <div className="photo-stack-wrapper">
          <div className="ps-deck">
            {cp.photos.map((photo, absoluteIdx) => {
              if (photo.is_backdrop === 1) return null;
              
              return (
                <PhotoSlide
                  key={`photo-${photo.id}`}
                  photo={photo}
                  absoluteIndex={absoluteIdx}
                  totalItems={cp.photos.length}
                  index={i}
                  startVH={startVH}
                  smoothVH={smoothVH}
                  checkpointReveal={gatedReveal}
                  parallaxFactor={0.85 + (absoluteIdx * 0.1)}
                  onOpen={(rotate) => setActiveModal({ photo, rotate })}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ── Album Info Card ── */}
      <div className="checkpoint-info-zone pointer-events-none">
        <ScrollSlide
          reveal={gatedReveal}
          direction="bottom"
          parallaxFactor={1.4}
          revealScaleStart={1.1}
          baseScale={1}
          zIndex={50}
          className="info-card-parallax-wrapper"
        >
          <InfoCard checkpoint={cp} index={i} total={total} />
        </ScrollSlide>
      </div>
      {/* ── Photo Modal (rendered outside sticky/z-index layer) ── */}
      <PhotoModal
        photo={activeModal?.photo ?? null}
        rotate={activeModal?.rotate ?? 0}
        onClose={() => setActiveModal(null)}
      />
    </motion.div>
  );
}
