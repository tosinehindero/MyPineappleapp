'use client';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';

// Circle member interface
export interface CircleMember {
  id: string;
  memberId: string;
  username: string;
  photoUrl: string | null;
  addedAt: Date;
}

// Add a user to your circle
export const addToCircle = async (
  currentUserId: string,
  targetUserId: string,
  targetUsername: string,
  targetPhotoUrl: string | null
): Promise<{ success: boolean; error?: string }> => {
  try {
    const circleId = `${currentUserId}_${targetUserId}`;
    await setDoc(doc(db, 'circles', circleId), {
      ownerId: currentUserId,
      memberId: targetUserId,
      memberUsername: targetUsername,
      memberPhotoUrl: targetPhotoUrl,
      createdAt: Timestamp.now(),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error adding to circle:', error);
    return { success: false, error: error.message };
  }
};

// Remove a user from your circle
export const removeFromCircle = async (
  currentUserId: string,
  targetUserId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const circleId = `${currentUserId}_${targetUserId}`;
    await deleteDoc(doc(db, 'circles', circleId));
    return { success: true };
  } catch (error: any) {
    console.error('Error removing from circle:', error);
    return { success: false, error: error.message };
  }
};

// Check if a user is in your circle
export const isInCircle = async (
  currentUserId: string,
  targetUserId: string
): Promise<boolean> => {
  try {
    const circleId = `${currentUserId}_${targetUserId}`;
    const circleDoc = await getDoc(doc(db, 'circles', circleId));
    return circleDoc.exists();
  } catch (error) {
    console.error('Error checking circle status:', error);
    return false;
  }
};

// Get all members in your circle
export const getCircleMembers = async (
  userId: string
): Promise<CircleMember[]> => {
  try {
    const q = query(
      collection(db, 'circles'),
      where('ownerId', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        memberId: data.memberId,
        username: data.memberUsername || 'Member',
        photoUrl: data.memberPhotoUrl || null,
        addedAt: data.createdAt?.toDate() || new Date(),
      };
    });
  } catch (error) {
    console.error('Error getting circle members:', error);
    return [];
  }
};

// Get IDs of all members in your circle (for filtering posts)
export const getCircleMemberIds = async (
  userId: string
): Promise<string[]> => {
  try {
    const q = query(
      collection(db, 'circles'),
      where('ownerId', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data().memberId);
  } catch (error) {
    console.error('Error getting circle member IDs:', error);
    return [];
  }
};

// Get users who have you in their circle (for showing their circle posts to you)
export const getUsersWhoHaveMeInCircle = async (
  userId: string
): Promise<string[]> => {
  try {
    const q = query(
      collection(db, 'circles'),
      where('memberId', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data().ownerId);
  } catch (error) {
    console.error('Error getting users who have me in circle:', error);
    return [];
  }
};

// Subscribe to circle members in real-time
export const subscribeToCircleMembers = (
  userId: string,
  callback: (members: CircleMember[]) => void
): (() => void) => {
  const q = query(
    collection(db, 'circles'),
    where('ownerId', '==', userId)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const members = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        memberId: data.memberId,
        username: data.memberUsername || 'Member',
        photoUrl: data.memberPhotoUrl || null,
        addedAt: data.createdAt?.toDate() || new Date(),
      };
    });
    callback(members);
  });

  return unsubscribe;
};

// Get circle count for a user
export const getCircleCount = async (userId: string): Promise<number> => {
  try {
    const q = query(
      collection(db, 'circles'),
      where('ownerId', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting circle count:', error);
    return 0;
  }
};

// Check mutual circle status (both users have each other in their circles)
export const isMutualCircle = async (
  userId1: string,
  userId2: string
): Promise<boolean> => {
  try {
    const [user1HasUser2, user2HasUser1] = await Promise.all([
      isInCircle(userId1, userId2),
      isInCircle(userId2, userId1),
    ]);
    return user1HasUser2 && user2HasUser1;
  } catch (error) {
    console.error('Error checking mutual circle status:', error);
    return false;
  }
};
