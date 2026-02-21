import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc,
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Hook to fetch and manage all members (for admin dashboard)
 * @returns {Object} - { members, loading, error, toggleVerification }
 */
export const useMembers = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    try {
      const membersRef = collection(db, 'members');
      // Try without orderBy first as createdAt might not exist on all docs
      const q = query(membersRef);

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const membersData = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }));
          // Sort client-side by createdAt (handles missing field)
          membersData.sort((a, b) => {
            const aTime = a.createdAt?.toDate?.() || new Date(0);
            const bTime = b.createdAt?.toDate?.() || new Date(0);
            return bTime - aTime;
          });
          setMembers(membersData);
          setLoading(false);
        },
        (err) => {
          console.error('Error fetching members:', err);
          setError(err);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up members listener:', err);
      setError(err);
      setLoading(false);
    }
  }, []);

  const toggleVerification = useCallback(async (memberId, currentStatus) => {
    try {
      const memberRef = doc(db, 'members', memberId);
      await updateDoc(memberRef, {
        isVerified: !currentStatus,
      });
      return !currentStatus;
    } catch (err) {
      console.error('Error toggling verification:', err);
      throw err;
    }
  }, []);

  const updateMemberRole = useCallback(async (memberId, role) => {
    try {
      const memberRef = doc(db, 'members', memberId);
      await updateDoc(memberRef, { role });
    } catch (err) {
      console.error('Error updating member role:', err);
      throw err;
    }
  }, []);

  return { members, loading, error, toggleVerification, updateMemberRole };
};

export default useMembers;
