import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Photo } from '../lib/types.client';

interface PhotoModalProps {
  photo: Photo | null;
  rotate?: number; // The same tilt angle as the card in the stack
  onClose: () => void;
}

export function PhotoModal({ photo, rotate = 0, onClose }: PhotoModalProps) {
  // Close on Escape key
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (!photo) return;
    window.addEventListener('keydown', handleKey);
    // Prevent main page scroll while modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [photo, handleKey]);

  // Portal: render outside all ancestor transforms so position:fixed works correctly
  const modal = (
    <AnimatePresence>
      {photo && (
        <>
          {/* ── Backdrop ───────────────────────────────────── */}
          <motion.div
            className="pm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />

          {/* ── Modal Panel ─────────────────────────────────────────── */}
          {/* Centering wrapper: position:fixed flex so Framer Motion's  */}
          {/* transform doesn't clobber translate(-50%,-50%) centering.  */}
          <div className="pm-centering">
            <motion.div
              className="pm-panel"
              initial={{ opacity: 0, scale: 0.88, rotate: rotate }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.88, rotate: rotate / 2 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            >
            {/* Close button */}
            <button className="pm-close" onClick={onClose} aria-label="Close photo">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 4L16 16M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Scrollable content inside the polaroid frame */}
            <div className="pm-scroll">
              {/* Polaroid frame — single photo only */}
              <div className="pm-polaroid">
                <div className="pm-photo-frame">
                  <img
                    className="pm-photo"
                    src={photo.photo_url}
                    alt={photo.caption ?? ''}
                    draggable={false}
                  />
                </div>

                {/* Caption area — can be long, will scroll */}
                {photo.caption && (
                  <div className="pm-caption-area">
                    <p className="pm-caption-text">{photo.caption}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  // Must use typeof document check for SSR safety (Astro renders server-side first)
  if (typeof document === 'undefined') return null;
  return createPortal(modal, document.body);
}
