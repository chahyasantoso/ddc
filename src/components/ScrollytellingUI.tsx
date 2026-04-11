/**
 * ScrollytellingUI — Orchestrator
 *
 * Responsibilities:
 *   1. Listen to window `ddc:scroll` events dispatched by index.astro
 *   2. Track scroll progress (0–1) as React state
 *   3. Compute per-checkpoint reveal values via scrollReveal lib
 *   4. Compose FloatingPhotos + CheckpointInfoCard into the fixed UI layer
 *
 * This component holds NO display logic itself — it only wires data to components.
 */

import { useState, useEffect } from 'react';
import { computeReveal, resolveActive } from '../lib/scrollReveal';
import { FloatingPhotos } from './FloatingPhotos';
import { CheckpointInfoCard } from './CheckpointInfoCard';
import type { Checkpoint } from '../lib/types.client';

interface Props {
  checkpoints: Checkpoint[];
}

export function ScrollytellingUI({ checkpoints }: Props) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function onScroll(e: Event) {
      const p = (e as CustomEvent<{ progress: number }>).detail.progress;
      setProgress(p);

      // Notify InteractiveMap of the currently active checkpoint
      const active = resolveActive(p, checkpoints);
      if (active) {
        window.dispatchEvent(
          new CustomEvent('ddc:checkpoint-active', { detail: { id: active.id } })
        );
      }
    }

    window.addEventListener('ddc:scroll', onScroll);
    return () => window.removeEventListener('ddc:scroll', onScroll);
  }, [checkpoints]);

  const N        = checkpoints.length;
  const activeCp = resolveActive(progress, checkpoints);
  const activeIdx = activeCp ? checkpoints.indexOf(activeCp) : -1;

  return (
    <>
      {/* ── Floating photo stacks — one per checkpoint ──────────────── */}
      <div className="floating-photos-zone">
        {checkpoints.map((cp, ci) => (
          <FloatingPhotos
            key={cp.id}
            checkpoint={cp}
            reveal={computeReveal(progress, ci, N)}
          />
        ))}
      </div>

      {/* ── Checkpoint info card — bottom-left ──────────────────────── */}
      <div className="checkpoint-info-zone">
        {activeCp && (
          <CheckpointInfoCard
            key={activeCp.id}
            checkpoint={activeCp}
            index={activeIdx}
            total={N}
          />
        )}
      </div>
    </>
  );
}
