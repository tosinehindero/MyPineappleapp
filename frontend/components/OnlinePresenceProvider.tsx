'use client';

import { useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export function useOnlinePresence() {
  const lastUpdateRef = useRef<number>(0);
  
  useEffect(() => {
    let unsubscribe: () => void;
    let intervalId: NodeJS.Timeout;

    const updatePresence = async (userId: string) => {
      const now = Date.now();
      // Only update every 2 minutes to reduce writes
      if (now - lastUpdateRef.current < 2 * 60 * 1000) return;
      
      try {
        // Check if document exists first
        const userDoc = await getDoc(doc(db, 'members', userId));
        if (!userDoc.exists()) {
          // User document doesn't exist yet (registration not complete)
          return;
        }
        
        await updateDoc(doc(db, 'members', userId), {
          isOnline: true,
          lastSeen: serverTimestamp(),
        });
        lastUpdateRef.current = now;
      } catch (error: any) {
        // Silently ignore "no document" errors
        if (!error.message?.includes('No document to update')) {
          console.error('Error updating presence:', error);
        }
      }
    };

    const setOffline = async (userId: string) => {
      try {
        // Check if document exists first
        const userDoc = await getDoc(doc(db, 'members', userId));
        if (!userDoc.exists()) {
          return;
        }
        
        await updateDoc(doc(db, 'members', userId), {
          isOnline: false,
          lastSeen: serverTimestamp(),
        });
      } catch (error: any) {
        // Silently ignore "no document" errors
        if (!error.message?.includes('No document to update')) {
          console.error('Error setting offline:', error);
        }
      }
    };

    unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Update presence immediately
        updatePresence(user.uid);
        
        // Update presence periodically while active
        intervalId = setInterval(() => {
          updatePresence(user.uid);
        }, 2 * 60 * 1000); // Every 2 minutes

        // Update on user activity
        const handleActivity = () => updatePresence(user.uid);
        window.addEventListener('mousemove', handleActivity, { passive: true });
        window.addEventListener('keydown', handleActivity, { passive: true });
        window.addEventListener('touchstart', handleActivity, { passive: true });
        window.addEventListener('scroll', handleActivity, { passive: true });

        // Set offline when tab is hidden or window closes
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'hidden') {
            setOffline(user.uid);
          } else {
            updatePresence(user.uid);
          }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        const handleBeforeUnload = () => {
          // Use sendBeacon for reliable offline update
          navigator.sendBeacon?.('/api/offline', JSON.stringify({ userId: user.uid }));
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
          window.removeEventListener('mousemove', handleActivity);
          window.removeEventListener('keydown', handleActivity);
          window.removeEventListener('touchstart', handleActivity);
          window.removeEventListener('scroll', handleActivity);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          window.removeEventListener('beforeunload', handleBeforeUnload);
          clearInterval(intervalId);
        };
      }
    });

    return () => {
      unsubscribe?.();
      clearInterval(intervalId);
    };
  }, []);
}

export default function OnlinePresenceProvider({ children }: { children: React.ReactNode }) {
  useOnlinePresence();
  return <>{children}</>;
}
