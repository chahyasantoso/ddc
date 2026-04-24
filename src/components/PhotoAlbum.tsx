import { motion } from 'framer-motion';
import { usePhotoAlbumAnimation, type PhotoAlbumProps } from '../hooks/usePhotoAlbumAnimation';
import { getCheckpointStartVH } from '../lib/scrollUtils';
import { planCheckpointTimeline } from '../lib/timeline';
import { AmbyarScatter } from './AmbyarScatter';
import { InfoCard } from './InfoCard';
import { PhotoSlide } from './PhotoSlide';
import { ScrollSlide } from './ScrollSlide';
import { FloatingCaption } from './FloatingCaption';

// ── Main Component ────────────────────────────────────────────────────────────

export function PhotoAlbum(props: PhotoAlbumProps) {
  const { cp, scrollables, i, total, smoothVH, exitStyle = 'default', setActiveModal } = props;

  // Generate explicit animation directives for the entire checkpoint once
  const startVH = getCheckpointStartVH(scrollables, i);
  const directives = planCheckpointTimeline(cp, startVH, i, scrollables);

  // All animation logic lives in the hook.
  // Each style/signal maps directly to one element below — no manual wiring needed.
  const {
    wrapperStyle,       // → outer motion.div    (z-index, visibility gate)
    photoStackStyle,    // → photo-stack-wrapper (entry: drift up | exit: slide up + fade)
    gatedReveal,        // → PhotoSlide signal   (drives individual photo entry animations)
    infoCardReveal,     // → ScrollSlide reveal  (lifecycle 0→1→2: entry slide + exit slide)
    albumExitProgress,  // → AmbyarScatter signal (only when exitStyle='ambyar')
  } = usePhotoAlbumAnimation(props);

  return (
    <motion.div style={wrapperStyle}>

      {/* ── Photo Stack & Title ──────────────────────────────────────────────── */}
      {cp.photos.length > 0 && (
        <motion.div className="photo-stack-wrapper pointer-events-none" style={photoStackStyle}>
          
          {/* Simple Inline Checkpoint Title */}
          <ScrollSlide
            reveal={infoCardReveal}
            entryDx={0}
            exitDy={0}
            entryScaleStart={1}
            zIndex={100}
            className="checkpoint-inline-title"
          >
            <InfoCard checkpoint={cp} index={i} total={total} />
          </ScrollSlide>

          <div className="ps-deck pointer-events-auto">
            {cp.photos.map((photo, absoluteIdx) => {
              if (photo.is_backdrop === 1) return null;

              const directive = directives[absoluteIdx];

              const slide = (
                <PhotoSlide
                  key={`photo-${photo.id}`}
                  photo={photo}
                  directive={directive}
                  absoluteIndex={absoluteIdx}
                  totalItems={cp.photos.length}
                  index={i}
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

      {/* ── Floating Captions ──────────────────────────────────────────────── */}
      <div className="floating-captions-container pointer-events-none">
        {cp.photos.map((photo, absoluteIdx) => {
          if (!photo.caption) return null;
          return (
            <FloatingCaption
              key={`caption-${photo.id}`}
              caption={photo.caption}
              directive={directives[absoluteIdx]}
              smoothVH={smoothVH}
              checkpointReveal={gatedReveal}
              checkpointIndex={i}
              absoluteIndex={absoluteIdx}
            />
          );
        })}
      </div>    </motion.div>
  );
}
