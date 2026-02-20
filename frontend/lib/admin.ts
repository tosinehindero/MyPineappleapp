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
  setDoc,
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
 * Check if user has admin role (client-side)
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
 * Fetch all profiles pending verification (client-side)
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

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      // Skip rejected profiles
      if (data.status === 'rejected') return;
      
      profiles.push({
        id: docSnap.id,
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
 * Approve a user - set isVerified to true (client-side)
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
 * Reject a user verification (client-side)
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
 * Get verification statistics (client-side)
 */
export async function getVerificationStats(): Promise<{
  pending: number;
  verified: number;
  rejected: number;
}> {
  try {
    const membersRef = collection(db, 'members');
    
    // Get all members and count locally to avoid complex queries
    const allMembersSnap = await getDocs(membersRef);
    
    let pending = 0;
    let verified = 0;
    let rejected = 0;
    
    allMembersSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.status === 'rejected') {
        rejected++;
      } else if (data.isVerified === true) {
        verified++;
      } else {
        pending++;
      }
    });

    return { pending, verified, rejected };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return { pending: 0, verified: 0, rejected: 0 };
  }
}
