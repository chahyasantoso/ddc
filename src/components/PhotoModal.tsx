import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Photo } from '../lib/types.client';

interface PhotoModalProps {
  photo: Photo | null;
  rotate?: number;
  onClose: () => void;
}

interface LenisInstance {
  stop: () => void;
  start: () => void;
}

export function PhotoModal({ photo, rotate = 0, onClose }: PhotoModalProps) {
  const isOpen = !!photo;

  // Use a ref so onExitComplete never captures a stale closure value
  const lenisRef = useRef<LenisInstance | null>(null);

  useEffect(() => {
    lenisRef.current = (window as any).__lenis ?? null;
  }, []);

  // Close on Escape key
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKey);
      lenisRef.current?.stop();
    } else {
      window.removeEventListener('keydown', handleKey);
    }
    return () => {
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, handleKey]);

  // Safety: restart Lenis when the entire component unmounts
  useEffect(() => {
    return () => { lenisRef.current?.start(); };
  }, []);

  // Called by AnimatePresence ONCE when the single root child finishes its exit animation.
  // Using a ref means this callback never has a stale `photo` value.
  const handleExitComplete = useCallback(() => {
    lenisRef.current?.start();
  }, []);

  // Portal: render outside all ancestor transforms so position:fixed works correctly
  const modal = (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {isOpen && (
        // Wrap both backdrop + panel in ONE child so onExitComplete fires exactly once
        <motion.div key="pm-root">
          {/* Backdrop */}
          <motion.div
            className="pm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Panel */}
          <div className="pm-centering">
            <motion.div
              className="pm-panel"
              initial={{ opacity: 0, scale: 0.88, rotate: rotate }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.9, rotate: rotate / 2 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            >
              <button className="pm-close" onClick={onClose} aria-label="Close photo">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 4L16 16M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>

              <div className="pm-scroll" data-lenis-prevent="true">
                <div className="pm-polaroid">
                  <div className="pm-photo-frame">
                    <img
                      className="pm-photo"
                      src={photo.photo_url}
                      alt={photo.caption ?? ''}
                      draggable={false}
                    />
                  </div>
                  {photo.caption && (
                    <div className="pm-caption-area">
                      <p className="pm-caption-text">{photo.caption}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Must use typeof document check for SSR safety (Astro renders server-side first)
  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
}
