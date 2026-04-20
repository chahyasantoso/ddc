import { useTransform, motion, type MotionValue } from 'framer-motion';
import { SCROLL_CONFIG } from '../lib/scrollUtils';

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
  entryEndVH,
  exitStartVH,
  exitEndVH,
  smoothVH,
}: SceneBackdropProps) {
  const { SLICE_VH } = SCROLL_CONFIG;

  // Visibility: only render when we're in/near this scene's range
  const visibility = useTransform(smoothVH, (vh) => {
    if (vh >= entryStartVH - SLICE_VH && vh <= exitEndVH + SLICE_VH) return 'visible';
    return 'hidden';
  });

  // Background Scene slide: enters from top (-100vh → 0), exits downward (0 → 100vh)
  const sceneY = useTransform(smoothVH, (vh) => {
    if (vh < entryStartVH) return '-100vh';
    if (vh < entryEndVH) {
      const t = (vh - entryStartVH) / SLICE_VH;
      return `${-100 + t * 100}vh`;
    }
    if (vh < exitStartVH) return '0vh';
    if (vh < exitEndVH) {
      const t = (vh - exitStartVH) / SLICE_VH;
      return `${t * 100}vh`;
    }
    return '100vh';
  });

  // Opacity: fade in during entry, fade out during exit
  const sceneOpacity = useTransform(smoothVH, (vh) => {
    if (vh < entryStartVH) return 0;
    if (vh < entryEndVH) return (vh - entryStartVH) / SLICE_VH;
    if (vh < exitStartVH) return 1;
    if (vh < exitEndVH) return 1 - (vh - exitStartVH) / SLICE_VH;
    return 0;
  });

  // Dramatic parallax: image shifts 30vh over the scene's lifetime
  const parallaxY = useTransform(smoothVH, (vh) => {
    if (vh < entryStartVH) return 0;
    const totalRange = exitEndVH - entryStartVH;
    const progress = Math.min(1, (vh - entryStartVH) / totalRange);
    return -progress * 30; // vh units
  });

  const parallaxTranslateY = useTransform(parallaxY, (v) => `${v}vh`);

  // Breathing parallax: slowly zoom out over the scene's lifetime
  const parallaxScale = useTransform(smoothVH, (vh) => {
    if (vh < entryStartVH) return 1.15;
    const totalRange = exitEndVH - entryStartVH;
    const progress = Math.min(1, Math.max(0, (vh - entryStartVH) / totalRange));
    return 1.15 - (progress * 0.15); // 1.15 -> 1.0
  });

  return (
    <motion.div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: sceneOpacity,
        y: sceneY, // Move the entire container (image + gradient)
        visibility: visibility as any,
        overflow: 'hidden',
        willChange: 'transform, opacity',
      }}
    >
      {/* ── Background Layer ── */}
      <motion.img
        src={imageUrl}
        alt=""
        style={{
          position: 'absolute',
          inset: '-20vh -5vw',
          width: '110vw',
          height: '140vh',
          objectFit: 'cover',
          translateY: parallaxTranslateY, // Parallax drift inside container
          scale: parallaxScale,           // Slow zoom out
          willChange: 'transform',
        }}
      />
      {/* Dark gradient overlay for readability */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.3) 100%)',
      }} />
    </motion.div>
  );
}
