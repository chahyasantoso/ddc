import { motion } from 'framer-motion';
import type { Checkpoint } from '../lib/types.client';

interface AnimatedCheckpointListProps {
  checkpoints: Checkpoint[];
}

// ── Shared easing ─────────────────────────────────────────────────────────────
type EasingDefinition = [number, number, number, number];
const ease: EasingDefinition = [0.22, 1, 0.36, 1]; // expo-out feel

// ── Photo rotation helper ─────────────────────────────────────────────────────
function photoRot(index: number): number {
  return (index % 2 === 0 ? 1 : -1) * (0.8 + index * 1.2);
}

// ── Single checkpoint section ─────────────────────────────────────────────────
function CheckpointSection({
  cp,
  index,
  total,
}: {
  cp: Checkpoint;
  index: number;
  total: number;
}) {
  const timeStr = new Date(cp.created_at).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.section
      className="checkpoint-section"
      id={`checkpoint-${cp.id}`}
      data-checkpoint-id={cp.id}
      data-lat={cp.lat}
      data-lng={cp.lng}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '0px 0px -80px 0px' }}
      transition={{ duration: 0.45, ease }}
      // When this section enters: notify map to highlight this marker
      onViewportEnter={() =>
        window.dispatchEvent(
          new CustomEvent('ddc:checkpoint-active', { detail: { id: cp.id } })
        )
      }
    >
      {/* ── Timeline spine ─────────────────────────────────────────────── */}
      <div className="checkpoint-marker" aria-hidden="true">
        <div className={`marker-line-top${index === 0 ? ' invisible' : ''}`} />

        <motion.div
          className="marker-orb"
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.05, type: 'spring', stiffness: 300, damping: 22 }}
        >
          <span className="marker-num">{index + 1}</span>
        </motion.div>

        <div className={`marker-line-bot${index === total - 1 ? ' dashed' : ''}`} />
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="checkpoint-content">
        {/* Location header */}
        <motion.div
          className="checkpoint-header"
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.4, ease }}
        >
          <h2 className="checkpoint-name">{cp.location_name}</h2>
          <time className="checkpoint-time" dateTime={cp.created_at}>
            {timeStr} WIB
          </time>
        </motion.div>

        {/* Coordinates badge */}
        <motion.div
          className="checkpoint-coords"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.18, duration: 0.35 }}
        >
          <span>📍</span>
          <span className="coords-text">
            {cp.lat.toFixed(4)}, {cp.lng.toFixed(4)}
          </span>
        </motion.div>

        {/* Description */}
        {cp.description && (
          <motion.p
            className="checkpoint-desc"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.22, duration: 0.4, ease }}
          >
            {cp.description}
          </motion.p>
        )}

        {/* Photo stack */}
        {cp.photos.length > 0 ? (
          <div
            className="photo-stack"
            data-photos={cp.photos.length}
            aria-label={`${cp.photos.length} foto dari ${cp.location_name}`}
          >
            {cp.photos.map((photo, pi) => {
              const rot = photoRot(pi);
              return (
                <motion.figure
                  key={photo.id}
                  className="photo-card"
                  data-photo-id={photo.id}
                  data-photo-index={pi}
                  // Framer Motion owns all transforms — no CSS transform on .photo-card
                  initial={{ opacity: 0, y: 32, scale: 0.91, rotate: rot }}
                  whileInView={{ opacity: 1, y: 0, scale: 1, rotate: rot }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.26 + pi * 0.13, duration: 0.55, ease }}
                  whileHover={{
                    scale: 1.03,
                    rotate: 0,
                    zIndex: 20,
                    transition: { duration: 0.22 },
                  }}
                >
                  <div className="photo-frame">
                    <img
                      src={photo.photo_url}
                      alt={photo.caption}
                      loading={index === 0 && pi === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                      className="photo-img"
                    />
                  </div>
                  <figcaption className="photo-caption">{photo.caption}</figcaption>
                </motion.figure>
              );
            })}
          </div>
        ) : (
          <div className="no-photos">Belum ada foto di checkpoint ini.</div>
        )}
      </div>
    </motion.section>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function AnimatedCheckpointList({ checkpoints }: AnimatedCheckpointListProps) {
  return (
    <div className="checkpoints-list">
      {checkpoints.map((cp, i) => (
        <CheckpointSection key={cp.id} cp={cp} index={i} total={checkpoints.length} />
      ))}

      {/* Journey-continues dot */}
      <motion.div
        className="journey-continues"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.15, duration: 0.6 }}
      >
        <div className="continues-line" />
        <div className="continues-dot" />
        <p className="continues-label">perjalanan berlanjut...</p>
      </motion.div>
    </div>
  );
}
