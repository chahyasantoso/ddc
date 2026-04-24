import { motion } from 'framer-motion';
import type { Checkpoint } from '../lib/types.client';

interface InfoCardProps {
  checkpoint: Checkpoint;
  index     : number; // 0-based index in the journey
  total     : number; // total number of checkpoints
}

/**
 * Glassmorphism info card shown at the bottom-left of the screen.
 * Animates in with a spring when checkpoint changes (driven by React key change).
 * No scroll-link needed — just display the active checkpoint's metadata.
 */
export function InfoCard({ checkpoint, index, total }: InfoCardProps) {
  return (
    <motion.div
      key={checkpoint.id}
      className="checkpoint-info-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
    >
      <h2 className="ci-name">{checkpoint.location_name}</h2>
    </motion.div>
  );
}
