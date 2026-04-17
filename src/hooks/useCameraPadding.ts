import { useState, useEffect } from 'react';

interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Returns the MapLibre camera padding based on the current viewport size.
 *
 * Desktop: Photos cover the right ~45% of the screen, so we push the camera
 * focus into the left half to keep the motorcycle visible.
 *
 * Mobile: Photos + Info Card cover the bottom ~55% of the screen, so we push
 * the camera focus into the top 45%.
 */
export function useCameraPadding(): Padding {
  const [pad, setPad] = useState<Padding>({ top: 0, right: 0, bottom: 0, left: 0 });

  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setPad(
        w >= 768
          ? { top: 0, right: Math.round(w * 0.45), bottom: 0, left: 0 }
          : { top: 0, right: 0, bottom: Math.round(h * 0.55), left: 0 },
      );
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return pad;
}
