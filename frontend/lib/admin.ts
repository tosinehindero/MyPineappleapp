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
    if (!userDoc.exists()) {
      console.log('🍍 Admin Check: User document not found for', userId);
      return false;
    }
    
    const userData = userDoc.data();
    console.log('🍍 Admin Check - User Data:', {
      userId,
      role: userData.role,
      isVerified: userData.isVerified,
      isAdmin: userData.role === 'admin',
    });
    
    return userData.role === 'admin';
  } catch (error) {
    console.error('Error checking admin role:', error);
    return false;
  }
}

/**
 * Fetch all profiles pending verification (client-side)
 * Handles cases where isVerified is false OR missing/null
 */
export async function getPendingVerifications(): Promise<{
  success: boolean;
  data: PendingProfile[];
  error?: string;
}> {
  try {
    // Query ALL members and filter client-side
    // This handles cases where isVerified is false, null, or missing entirely
    const membersQuery = query(
      collection(db, 'members'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(membersQuery);
    const profiles: PendingProfile[] = [];

    console.log('🍍 Vetting Query: Found', snapshot.size, 'total members in collection');

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      
      // Skip if already verified
      if (data.isVerified === true) {
        console.log('🍍 Skipping verified user:', data.username || docSnap.id);
        return;
      }
      
      // Skip rejected profiles
      if (data.status === 'rejected') {
        console.log('🍍 Skipping rejected user:', data.username || docSnap.id);
        return;
      }

      // Skip admin accounts
      if (data.role === 'admin') {
        console.log('🍍 Skipping admin user:', data.username || docSnap.id);
        return;
      }

      console.log('🍍 Adding pending user:', data.username || docSnap.id, '| isVerified:', data.isVerified);
      
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

    console.log('🍍 Vetting Query: Found', profiles.length, 'pending profiles');
    return { success: true, data: profiles };
  } catch (error: any) {
    console.error('Error fetching pending verifications:', error);
    return { success: false, data: [], error: error.message };
  }
}

/**
 * Create a test pending user for admin dashboard testing
 */
export async function createTestPendingUser(): Promise<{
  success: boolean;
  userId?: string;
  error?: string;
}> {
  try {
    const testUserId = `test_user_${Date.now()}`;
    
    await setDoc(doc(db, 'members', testUserId), {
      uid: testUserId,
      email: `test_${Date.now()}@pineappleplay.com`,
      username: `TestUser_${Math.random().toString(36).substr(2, 5)}`,
      accountType: 'Single',
      experienceLevel: 'Beginner',
      location: 'Miami, FL',
      interests: ['Luxury Travel', 'Fine Dining', 'Mixology'],
      lookingFor: ['Networking', 'Events', 'Friendships'],
      description: 'This is a test profile created for admin dashboard testing. Feel free to approve or reject this user to test the functionality.',
      fantasies: 'Testing the admin approval workflow.',
      photoUrls: [],
      isVerified: false,
      status: 'pending',
      role: 'member',
      ageRangeMin: 25,
      ageRangeMax: 45,
      createdAt: serverTimestamp(),
    });

    console.log('🍍 Created test pending user:', testUserId);
    return { success: true, userId: testUserId };
  } catch (error: any) {
    console.error('Error creating test user:', error);
    return { success: false, error: error.message };
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

    const userData = userDoc.data();

    // Update verification status
    await updateDoc(userRef, {
      isVerified: true,
      status: 'verified',
      role: userData.role || 'member', // Set role to 'member' if not already set
      verifiedAt: serverTimestamp(),
      approvedAt: serverTimestamp(),
    });

    // Create a welcome notification for the user
    const notificationRef = doc(collection(db, 'notifications'));
    await setDoc(notificationRef, {
      toUserId: uid,
      fromUserId: 'system',
      fromUsername: 'PineapplePlay',
      type: 'verification_approved',
      message: 'Welcome to the Inner Circle! Your membership has been verified. You now have full access to all exclusive features.',
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
