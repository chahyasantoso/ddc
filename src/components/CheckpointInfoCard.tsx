import { motion } from 'framer-motion';
import type { Checkpoint } from '../lib/types.client';

interface CheckpointInfoCardProps {
  checkpoint: Checkpoint;
  index     : number; // 0-based index in the journey
  total     : number; // total number of checkpoints
}

/**
 * Glassmorphism info card shown at the bottom-left of the screen.
 * Animates in with a spring when checkpoint changes (driven by React key change).
 * No scroll-link needed — just display the active checkpoint's metadata.
 */
export function CheckpointInfoCard({ checkpoint, index, total }: CheckpointInfoCardProps) {
  return (
    <motion.div
      key={checkpoint.id}
      className="checkpoint-info-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
    >
      <p className="ci-eyebrow">
        Checkpoint {index + 1} / {total}
      </p>
      <h2 className="ci-name">{checkpoint.location_name}</h2>
      {checkpoint.description && (
        <p className="ci-desc">{checkpoint.description}</p>
      )}
      <p className="ci-coords">
        📍 {checkpoint.lat.toFixed(4)}, {checkpoint.lng.toFixed(4)}
      </p>
    </motion.div>
  );
}
