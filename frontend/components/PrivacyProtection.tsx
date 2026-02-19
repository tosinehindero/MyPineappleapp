'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PrivacyProtectionProps {
  children: React.ReactNode;
  viewerUsername?: string;
  showWarning?: boolean;
}

/**
 * Privacy Protection Component
 * - Prevents text selection
 * - Detects window focus loss (screenshot attempt via Print Screen, etc.)
 * - Shows privacy overlay when window loses focus
 * - Prevents right-click context menu
 */
export default function PrivacyProtection({
  children,
  viewerUsername,
  showWarning = true,
}: PrivacyProtectionProps) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [warningCount, setWarningCount] = useState(0);

  // Handle visibility change (tab switch, minimize, etc.)
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden && showWarning) {
      setShowOverlay(true);
      setWarningCount((prev) => prev + 1);
    }
  }, [showWarning]);

  // Handle window blur (click outside, screenshot tools, etc.)
  const handleBlur = useCallback(() => {
    if (showWarning) {
      setShowOverlay(true);
      setWarningCount((prev) => prev + 1);
    }
  }, [showWarning]);

  // Handle window focus return
  const handleFocus = useCallback(() => {
    // Keep overlay for 2 seconds after regaining focus
    setTimeout(() => {
      setShowOverlay(false);
    }, 2000);
  }, []);

  // Prevent right-click
  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    return false;
  }, []);

  // Prevent keyboard shortcuts (Print Screen, etc.)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Detect Print Screen key
    if (e.key === 'PrintScreen') {
      e.preventDefault();
      setShowOverlay(true);
      setWarningCount((prev) => prev + 1);
    }
    // Detect Ctrl+P (Print)
    if (e.ctrlKey && e.key === 'p') {
      e.preventDefault();
    }
    // Detect Ctrl+Shift+S (Screenshot on some systems)
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      setShowOverlay(true);
    }
  }, []);

  useEffect(() => {
    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleVisibilityChange, handleBlur, handleFocus, handleContextMenu, handleKeyDown]);

  return (
    <div className="privacy-protected relative">
      {/* Protected Content */}
      <div
        className="select-none"
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          msUserSelect: 'none',
          MozUserSelect: 'none',
        }}
        onDragStart={(e) => e.preventDefault()}
      >
        {children}
      </div>

      {/* Privacy Overlay - Shows when window loses focus */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9999] bg-charcoal flex items-center justify-center"
          >
            <div className="text-center p-8">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="w-24 h-24 bg-gold/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-gold"
              >
                <svg
                  className="w-12 h-12 text-gold"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </motion.div>
              <h2 className="text-3xl font-heading text-gold mb-4">
                Privacy Protection Active
              </h2>
              <p className="text-offWhite/80 font-body mb-6 max-w-md mx-auto">
                Screenshots and screen captures are not permitted on this platform.
                This protects the privacy of all community members.
              </p>
              {viewerUsername && (
                <p className="text-offWhite/60 font-body text-sm mb-4">
                  Session tracked as: <span className="text-gold">{viewerUsername}</span>
                </p>
              )}
              {warningCount > 1 && (
                <p className="text-red-400 font-body text-sm">
                  Multiple attempts detected ({warningCount})
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS to prevent selection and dragging */}
      <style jsx global>{`
        .privacy-protected * {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
          -webkit-touch-callout: none !important;
        }
        
        .privacy-protected img {
          pointer-events: none;
          -webkit-user-drag: none;
          user-drag: none;
        }
        
        /* Prevent image saving */
        .privacy-protected img {
          -webkit-touch-callout: none;
        }
      `}</style>
    </div>
  );
}
