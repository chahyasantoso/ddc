import { useTransform, type MotionValue } from 'framer-motion';
import { ScrollSlide } from './ScrollSlide';
import { SCROLL_CONFIG } from '../lib/scrollUtils';
import type { AnimationDirective } from '../lib/types.client';

interface FloatingCaptionProps {
  caption: string;
  directive: AnimationDirective;
  smoothVH: MotionValue<number>;
  checkpointReveal: MotionValue<number>;
  checkpointIndex: number;
  absoluteIndex: number;
}

export function FloatingCaption({
  caption,
  directive,
  smoothVH,
  checkpointReveal,
  checkpointIndex,
  absoluteIndex,
}: FloatingCaptionProps) {
  const { startVH, endVH, coverVH } = directive;

  // For CP0 Photo0, startVH and endVH are negative, which means they "arrived" before scroll.
  // We clamp them to 0 so the scroll-driven exit phase doesn't start until vh > 0.
  const effStart = Math.max(0, startVH);
  const effEnd = Math.max(0, endVH);

  // We map the continuous scroll progress to a reveal signal (0 -> 1 -> 2)
  const reveal = useTransform(smoothVH, (vh) => {
    if (vh < effEnd) return 0; // Caption only starts revealing AFTER the photo is 100% revealed (effEnd)
    
    // Caption Entry phase: takes 50vh to fully enter
    const captionEntryEnd = effEnd + 50;
    if (vh <= captionEntryEnd) {
      return (vh - effEnd) / 50;
    }
    
    // Determine when the next photo arrives.
    // We use SCROLL_CONFIG.REST_VH. If coverVH is defined, it should be exactly effEnd + REST_VH.
    const nextArrives = Math.max(captionEntryEnd, coverVH ?? (effEnd + SCROLL_CONFIG.REST_VH));
    
    // Parallax exit phase: starts immediately after caption is fully entered
    // and ends EXACTLY when the next photo starts entering (nextArrives)
    if (vh >= nextArrives) {
      return 2;
    }

    const exitProgress = (vh - captionEntryEnd) / (nextArrives - captionEntryEnd);
    return 1 + exitProgress;
  });

  // For the first checkpoint's first photo, entry is gated by map zoom (checkpointReveal)
  const finalReveal = useTransform([reveal, checkpointReveal], ([r, cr]) => {
    const rVal = r as number;
    const crVal = cr as number;
    
    if (checkpointIndex === 0 && absoluteIndex === 0) {
      // Gate entry on zoom, but let exit be purely scroll-driven
      if (rVal <= 1) return rVal * crVal;
      return rVal;
    }
    
    // For others, we just gate the entry on checkpoint reveal
    return rVal * Math.min(1, crVal);
  });

  return (
    <ScrollSlide
      reveal={finalReveal}
      entryDy={80}     // Enters from 80px below
      exitDy={-800}    // Parallaxes up by 800px (to the top of the screen)
      zIndex={1}       // Behind the photo stack (photos start at z-index 10)
      className="floating-caption-slide"
    >
      <div className="floating-caption-content">
        <p className="fc-text">{caption}</p>
      </div>
    </ScrollSlide>
  );
}
