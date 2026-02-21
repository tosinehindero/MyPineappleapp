import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Hook to fetch and listen to a user profile from the 'members' collection
 * @param {string} uid - The user's UID (document ID in members collection)
 * @returns {Object} - { profile, loading, error }
 */
export const useProfile = (uid) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      setProfile(null);
      return;
    }

    setLoading(true);
    setError(null);

    // Real-time listener on the members collection
    const memberRef = doc(db, 'members', uid);
    
    const unsubscribe = onSnapshot(
      memberRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setProfile({ id: snapshot.id, ...snapshot.data() });
        } else {
          setProfile(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching profile from members:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  return { profile, loading, error };
};

export default useProfile;
