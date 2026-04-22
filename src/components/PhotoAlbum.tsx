import { motion } from 'framer-motion';
import { usePhotoAlbumAnimation, type PhotoAlbumProps } from '../hooks/usePhotoAlbumAnimation';
import { getCheckpointStartVH } from '../lib/scrollUtils';
import { AmbyarScatter } from './AmbyarScatter';
import { InfoCard } from './InfoCard';
import { PhotoSlide } from './PhotoSlide';
import { ScrollSlide } from './ScrollSlide';

// ── Main Component ────────────────────────────────────────────────────────────

export function PhotoAlbum(props: PhotoAlbumProps) {
  const { cp, scrollables, i, total, smoothVH, exitStyle = 'default', setActiveModal } = props;

  // All animation logic lives in the hook.
  // Each style/signal maps directly to one element below — no manual wiring needed.
  const {
    wrapperStyle,       // → outer motion.div    (z-index, visibility gate)
    photoStackStyle,    // → photo-stack-wrapper (entry: drift up | exit: slide up + fade)
    gatedReveal,        // → PhotoSlide signal   (drives individual photo entry animations)
    infoCardReveal,     // → ScrollSlide reveal  (lifecycle 0→1→2: entry slide + exit slide)
    albumExitProgress,  // → AmbyarScatter signal (only when exitStyle='ambyar')
  } = usePhotoAlbumAnimation(props);

  const startVH = getCheckpointStartVH(scrollables, i);

  return (
    <motion.div style={wrapperStyle}>

      {/* ── Photo Stack ────────────────────────────────────────────────────── */}
      {cp.photos.length > 0 && (
        <motion.div className="photo-stack-wrapper" style={photoStackStyle}>
          <div className="ps-deck">
            {cp.photos.map((photo, absoluteIdx) => {
              if (photo.is_backdrop === 1) return null;

              const slide = (
                <PhotoSlide
                  key={`photo-${photo.id}`}
                  photo={photo}
                  absoluteIndex={absoluteIdx}
                  totalItems={cp.photos.length}
                  index={i}
                  startVH={startVH}
                  smoothVH={smoothVH}
                  checkpointReveal={gatedReveal}
                  parallaxFactor={0.5 + absoluteIdx * 0.1}
                  onOpen={(rotate) => setActiveModal({ photo, rotate })}
                />
              );

              if (exitStyle === 'ambyar') {
                return (
                  <AmbyarScatter
                    key={`ambyar-${photo.id}`}
                    exitProgress={albumExitProgress}
                    index={absoluteIdx}
                  >
                    {slide}
                  </AmbyarScatter>
                );
              }

              return slide;
            })}
          </div>
        </motion.div>
      )}

      {/* ── Info Card ──────────────────────────────────────────────────────── */}
      {/* ScrollSlide owns the full lifecycle: enters from left (entryDx), exits to right (exitDx) */}
      <div className="checkpoint-info-zone pointer-events-none">
        <ScrollSlide
          reveal={infoCardReveal}
          entryDx={-200}
          exitDy={-200}
          entryScaleStart={1.05}
          zIndex={50}
          className="info-card-parallax-wrapper"
        >
          <InfoCard checkpoint={cp} index={i} total={total} />
        </ScrollSlide>
      </div>


    </motion.div>
  );
}
