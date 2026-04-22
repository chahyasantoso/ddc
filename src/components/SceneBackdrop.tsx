import { motion, type MotionValue, useMotionValueEvent, useTransform } from 'framer-motion';
import { useState } from 'react';

interface SceneBackdropProps {
  imageUrl: string;
  entryStartVH: number;
  entryEndVH: number;
  exitStartVH: number;
  exitEndVH: number;
  smoothVH: MotionValue<number>;
}

export function SceneBackdrop({
  imageUrl,
  entryStartVH,
  exitStartVH,
  smoothVH,
}: SceneBackdropProps) {
  const [status, setStatus] = useState<'hidden' | 'visible' | 'exited'>('hidden');

  // Trigger animations based on passing the thresholds, decoupled from exact scroll speed
  useMotionValueEvent(smoothVH, 'change', (vh) => {
    if (vh < entryStartVH) {
      if (status !== 'hidden') setStatus('hidden');
    } else if (vh >= entryStartVH && vh < exitStartVH) {
      if (status !== 'visible') setStatus('visible');
    } else if (vh >= exitStartVH) {
      if (status !== 'exited') setStatus('exited');
    }
  });

  // Parallax keeps the interactive feel while the backdrop sits in its "visible" state
  const parallaxY = useTransform(smoothVH, (vh) => {
    if (vh < entryStartVH) return 0;
    const totalRange = exitStartVH - entryStartVH;
    const progress = Math.min(1, (vh - entryStartVH) / totalRange);
    return -progress * 30;
  });

  const parallaxTranslateY = useTransform(parallaxY, (v) => `${v}vh`);

  const parallaxScale = useTransform(smoothVH, (vh) => {
    if (vh < entryStartVH) return 1.15;
    const totalRange = exitStartVH - entryStartVH;
    const progress = Math.min(1, Math.max(0, (vh - entryStartVH) / totalRange));
    return 1.15 - (progress * 0.15); // 1.15 -> 1.0 (Zoom Out)
  });

  return (
    <motion.div
      initial="hidden"
      animate={status}
      variants={{
        hidden: { y: '-100vh', opacity: 0 },
        visible: { y: '0vh', opacity: 1 },
        exited: { y: '100vh', opacity: 0 },
      }}
      transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
      className="scene-backdrop-wrapper"
    >
      {/* ── Background Layer ── */}
      <motion.img
        src={imageUrl}
        alt=""
        className="scene-backdrop-img"
        style={{
          translateY: parallaxTranslateY,
          scale: parallaxScale,
        }}
      />
      {/* Dark gradient overlay for readability */}
      <div className="scene-backdrop-overlay" />
    </motion.div>
  );
}
