'use server';

import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';

export interface PendingProfile {
  id: string;
  username: string;
  email: string;
  accountType: string;
  experienceLevel: string;
  location: string;
  interests: string[];
  lookingFor: string[];
  fantasies: string;
  description: string;
  photoUrls: string[];
  liveSelfieUrl?: string;
  idUploadUrl?: string;
  createdAt?: Date;
  ageRangeMin?: number;
  ageRangeMax?: number;
}

/**
 * Check if user has admin role
 */
export async function checkAdminRole(userId: string): Promise<boolean> {
  try {
    const userDoc = await getDoc(doc(db, 'members', userId));
    if (!userDoc.exists()) return false;
    
    const userData = userDoc.data();
    return userData.role === 'admin';
  } catch (error) {
    console.error('Error checking admin role:', error);
    return false;
  }
}

/**
 * Fetch all profiles pending verification
 */
export async function getPendingVerifications(): Promise<{
  success: boolean;
  data: PendingProfile[];
  error?: string;
}> {
  try {
    const pendingQuery = query(
      collection(db, 'members'),
      where('isVerified', '==', false),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(pendingQuery);
    const profiles: PendingProfile[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      profiles.push({
        id: doc.id,
        username: data.username || 'Unknown',
        email: data.email || '',
        accountType: data.accountType || 'Unknown',
        experienceLevel: data.experienceLevel || 'Unknown',
        location: data.location || 'Unknown',
        interests: data.interests || [],
        lookingFor: data.lookingFor || [],
        fantasies: data.fantasies || '',
        description: data.description || '',
        photoUrls: data.photoUrls || [],
        liveSelfieUrl: data.liveSelfieUrl || data.photoUrls?.[0] || null,
        idUploadUrl: data.idUploadUrl || null,
        createdAt: data.createdAt?.toDate(),
        ageRangeMin: data.ageRangeMin,
        ageRangeMax: data.ageRangeMax,
      });
    });

    return { success: true, data: profiles };
  } catch (error: any) {
    console.error('Error fetching pending verifications:', error);
    return { success: false, data: [], error: error.message };
  }
}

/**
 * Approve a user - set isVerified to true
 */
export async function approveUser(uid: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const userRef = doc(db, 'members', uid);
    
    // Check if user exists
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }

    // Update verification status
    await updateDoc(userRef, {
      isVerified: true,
      status: 'verified',
      verifiedAt: serverTimestamp(),
    });

    // Create a welcome notification for the user
    const notificationRef = doc(collection(db, 'notifications'));
    const { setDoc } = await import('firebase/firestore');
    await setDoc(notificationRef, {
      toUserId: uid,
      fromUserId: 'system',
      fromUsername: 'PineapplePlay',
      type: 'verification_approved',
      message: 'Welcome to the Inner Circle! Your membership has been verified.',
      createdAt: serverTimestamp(),
      read: false,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error approving user:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reject a user verification
 */
export async function rejectUser(uid: string, reason?: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const userRef = doc(db, 'members', uid);
    
    // Check if user exists
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }

    // Update status to rejected
    await updateDoc(userRef, {
      status: 'rejected',
      rejectedAt: serverTimestamp(),
      rejectionReason: reason || 'Did not meet verification requirements',
    });

    // Create a notification for the user
    const notificationRef = doc(collection(db, 'notifications'));
    const { setDoc } = await import('firebase/firestore');
    await setDoc(notificationRef, {
      toUserId: uid,
      fromUserId: 'system',
      fromUsername: 'PineapplePlay',
      type: 'verification_rejected',
      message: reason || 'Your verification request needs additional information.',
      createdAt: serverTimestamp(),
      read: false,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error rejecting user:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get verification statistics
 */
export async function getVerificationStats(): Promise<{
  pending: number;
  verified: number;
  rejected: number;
}> {
  try {
    const membersRef = collection(db, 'members');
    
    const [pendingSnap, verifiedSnap, rejectedSnap] = await Promise.all([
      getDocs(query(membersRef, where('isVerified', '==', false), where('status', '!=', 'rejected'))),
      getDocs(query(membersRef, where('isVerified', '==', true))),
      getDocs(query(membersRef, where('status', '==', 'rejected'))),
    ]);

    return {
      pending: pendingSnap.size,
      verified: verifiedSnap.size,
      rejected: rejectedSnap.size,
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return { pending: 0, verified: 0, rejected: 0 };
  }
}
