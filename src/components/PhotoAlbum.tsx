import { motion, useTransform } from 'framer-motion';
import { useState } from 'react';
import { usePhotoAlbumAnimation, type PhotoAlbumProps } from '../hooks/usePhotoAlbumAnimation';
import { getCheckpointStartVH } from '../lib/scrollUtils';
import type { Photo } from '../lib/types.client';
import { InfoCard } from './InfoCard';
import { PhotoModal } from './PhotoModal';
import { PhotoSlide } from './PhotoSlide';

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
            {cp.photos.map((photo, photoIdx) => (
              <PhotoSlide
                key={`photo-${photo.id}`}
                photo={photo}
                photoIdx={photoIdx}
                totalPhotos={cp.photos.length}
                index={i}
                startVH={startVH}
                sceneOffset={cp.scene_image ? 1 : 0}
                smoothVH={smoothVH}
                checkpointReveal={gatedReveal}
                onOpen={(rotate) => setActiveModal({ photo, rotate })}
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
          <InfoCard checkpoint={cp} index={i} total={total} />
        </motion.div>
      </motion.div>
      {/* ── Photo Modal (rendered outside sticky/z-index layer) ── */}
      <PhotoModal
        photo={activeModal?.photo ?? null}
        rotate={activeModal?.rotate ?? 0}
        onClose={() => setActiveModal(null)}
      />
    </motion.div>
  );
}
