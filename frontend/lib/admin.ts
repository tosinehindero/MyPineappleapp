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

// ============================================
// USER REPORTS MODERATION
// ============================================

export interface UserReport {
  id: string;
  reporterId: string;
  reporterUsername?: string;
  reportedUserId: string;
  reportedUsername?: string;
  reason: string;
  details: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: Date;
  reviewedAt?: Date;
  adminNotes?: string;
}

/**
 * Get all user reports for admin review
 */
export async function getUserReports(status?: string): Promise<{
  success: boolean;
  data: UserReport[];
  error?: string;
}> {
  try {
    let reportsQuery;
    
    if (status && status !== 'all') {
      reportsQuery = query(
        collection(db, 'userReports'),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
    } else {
      reportsQuery = query(
        collection(db, 'userReports'),
        orderBy('createdAt', 'desc')
      );
    }

    const snapshot = await getDocs(reportsQuery);
    const reports: UserReport[] = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      
      // Get reporter and reported user info
      let reporterUsername = 'Unknown';
      let reportedUsername = 'Unknown';
      
      try {
        const reporterDoc = await getDoc(doc(db, 'members', data.reporterId));
        if (reporterDoc.exists()) {
          reporterUsername = reporterDoc.data().username || 'Unknown';
        }
        
        const reportedDoc = await getDoc(doc(db, 'members', data.reportedUserId));
        if (reportedDoc.exists()) {
          reportedUsername = reportedDoc.data().username || 'Unknown';
        }
      } catch (e) {
        console.error('Error fetching user info for report:', e);
      }
      
      reports.push({
        id: docSnap.id,
        reporterId: data.reporterId,
        reporterUsername,
        reportedUserId: data.reportedUserId,
        reportedUsername,
        reason: data.reason,
        details: data.details || '',
        status: data.status || 'pending',
        createdAt: data.createdAt?.toDate() || new Date(),
        reviewedAt: data.reviewedAt?.toDate(),
        adminNotes: data.adminNotes,
      });
    }

    return { success: true, data: reports };
  } catch (error: any) {
    console.error('Error fetching user reports:', error);
    return { success: false, data: [], error: error.message };
  }
}

/**
 * Update report status
 */
export async function updateReportStatus(
  reportId: string,
  status: 'reviewed' | 'resolved' | 'dismissed',
  adminNotes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc(doc(db, 'userReports', reportId), {
      status,
      adminNotes: adminNotes || '',
      reviewedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error updating report:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Ban/Suspend a user
 */
export async function banUser(
  userId: string,
  reason: string,
  duration: 'permanent' | '7days' | '30days'
): Promise<{ success: boolean; error?: string }> {
  try {
    const banEndDate = duration === 'permanent' 
      ? null 
      : duration === '7days'
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await updateDoc(doc(db, 'members', userId), {
      isBanned: true,
      banReason: reason,
      banDuration: duration,
      bannedAt: serverTimestamp(),
      banEndDate: banEndDate,
    });

    // Send notification to user
    await setDoc(doc(collection(db, 'notifications')), {
      toUserId: userId,
      fromUserId: 'system',
      fromUsername: 'PineapplePlay',
      type: 'account_suspended',
      message: `Your account has been suspended. Reason: ${reason}`,
      createdAt: serverTimestamp(),
      read: false,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error banning user:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Unban a user
 */
export async function unbanUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc(doc(db, 'members', userId), {
      isBanned: false,
      banReason: null,
      banDuration: null,
      bannedAt: null,
      banEndDate: null,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error unbanning user:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// CONTENT MODERATION
// ============================================

export interface ReportedPost {
  id: string;
  postId: string;
  authorId: string;
  authorUsername: string;
  content: string;
  images: string[];
  reportCount: number;
  reportReasons: string[];
  createdAt: Date;
}

/**
 * Get reported posts for moderation
 */
export async function getReportedPosts(): Promise<{
  success: boolean;
  data: ReportedPost[];
  error?: string;
}> {
  try {
    // Query posts that have been flagged
    const postsQuery = query(
      collection(db, 'posts'),
      where('reportCount', '>', 0),
      orderBy('reportCount', 'desc')
    );

    const snapshot = await getDocs(postsQuery);
    const posts: ReportedPost[] = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      
      posts.push({
        id: docSnap.id,
        postId: docSnap.id,
        authorId: data.authorId,
        authorUsername: data.authorUsername || 'Unknown',
        content: data.content || '',
        images: data.images || [],
        reportCount: data.reportCount || 0,
        reportReasons: data.reportReasons || [],
        createdAt: data.createdAt?.toDate() || new Date(),
      });
    }

    return { success: true, data: posts };
  } catch (error: any) {
    console.error('Error fetching reported posts:', error);
    return { success: false, data: [], error: error.message };
  }
}

/**
 * Delete a post (admin action)
 */
export async function deletePost(postId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { deleteDoc: firestoreDelete } = await import('firebase/firestore');
    await firestoreDelete(doc(db, 'posts', postId));
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting post:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Clear post reports (approve post)
 */
export async function clearPostReports(postId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc(doc(db, 'posts', postId), {
      reportCount: 0,
      reportReasons: [],
      moderatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error clearing post reports:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// ADMIN DASHBOARD STATS
// ============================================

export interface AdminStats {
  totalUsers: number;
  verifiedUsers: number;
  pendingUsers: number;
  bannedUsers: number;
  pendingReports: number;
  totalPosts: number;
  reportedPosts: number;
  totalListings: number;
}

export interface SubscriptionStats {
  total_subscribers: number;
  basic_subscribers: number;
  premium_subscribers: number;
  active_subscriptions: number;
  total_revenue: number;
  monthly_revenue: number;
  free_users: number;
}

export interface UserWithSubscription {
  id: string;
  username: string;
  email: string;
  photoUrl?: string;
  role: string;
  isVerified: boolean;
  isFounder?: boolean;
  tier: 'free' | 'basic' | 'premium';
  subscriptionStatus?: string;
  createdAt?: Date;
}

/**
 * Get comprehensive admin statistics
 */
export async function getAdminStats(): Promise<AdminStats> {
  try {
    const membersSnap = await getDocs(collection(db, 'members'));
    const reportsSnap = await getDocs(query(collection(db, 'userReports'), where('status', '==', 'pending')));
    const postsSnap = await getDocs(collection(db, 'posts'));
    
    let totalUsers = 0;
    let verifiedUsers = 0;
    let pendingUsers = 0;
    let bannedUsers = 0;
    
    membersSnap.forEach((doc) => {
      const data = doc.data();
      totalUsers++;
      if (data.isBanned) bannedUsers++;
      else if (data.isVerified === true) verifiedUsers++;
      else pendingUsers++;
    });

    let totalPosts = 0;
    let reportedPosts = 0;
    
    postsSnap.forEach((doc) => {
      const data = doc.data();
      totalPosts++;
      if (data.reportCount && data.reportCount > 0) reportedPosts++;
    });

    return {
      totalUsers,
      verifiedUsers,
      pendingUsers,
      bannedUsers,
      pendingReports: reportsSnap.size,
      totalPosts,
      reportedPosts,
      totalListings: 0, // Would need to query MongoDB for this
    };
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return {
      totalUsers: 0,
      verifiedUsers: 0,
      pendingUsers: 0,
      bannedUsers: 0,
      pendingReports: 0,
      totalPosts: 0,
      reportedPosts: 0,
      totalListings: 0,
    };
  }
}

// ============================================
// SUBSCRIPTION & TIER MANAGEMENT
// ============================================

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

/**
 * Get subscription statistics from MongoDB
 */
export async function getSubscriptionStats(): Promise<SubscriptionStats> {
  try {
    const response = await fetch(`${API_URL}/api/admin/subscription-stats`);
    const data = await response.json();
    
    if (data.success) {
      return data.stats;
    }
    
    return {
      total_subscribers: 0,
      basic_subscribers: 0,
      premium_subscribers: 0,
      active_subscriptions: 0,
      total_revenue: 0,
      monthly_revenue: 0,
      free_users: 0,
    };
  } catch (error) {
    console.error('Error fetching subscription stats:', error);
    return {
      total_subscribers: 0,
      basic_subscribers: 0,
      premium_subscribers: 0,
      active_subscriptions: 0,
      total_revenue: 0,
      monthly_revenue: 0,
      free_users: 0,
    };
  }
}

/**
 * Set a user's subscription tier via admin API
 */
export async function setUserTier(
  userId: string, 
  tier: 'free' | 'basic' | 'premium'
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_URL}/api/admin/set-tier`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, tier }),
    });
    
    const data = await response.json();
    return { success: data.success || false, error: data.detail };
  } catch (error: any) {
    console.error('Error setting user tier:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Set founder status for a user (updates Firestore)
 */
export async function setFounderStatus(
  userId: string, 
  isFounder: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update the user's Firestore document directly
    const userRef = doc(db, 'members', userId);
    await updateDoc(userRef, {
      isFounder: isFounder,
      updatedAt: serverTimestamp(),
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error setting founder status:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all users for admin management (from Firestore + subscription data)
 */
export async function getAllUsersForAdmin(): Promise<{
  success: boolean;
  data: UserWithSubscription[];
  error?: string;
}> {
  try {
    // First get subscription data from MongoDB
    const subscriptionResponse = await fetch(`${API_URL}/api/admin/search-users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '', limit: 500 }),
    });
    
    const subscriptionData = await subscriptionResponse.json();
    const subscriptionMap = subscriptionData.subscription_map || {};
    
    // Get all users from Firestore - use simple query without orderBy to avoid index issues
    const membersRef = collection(db, 'members');
    const snapshot = await getDocs(membersRef);
    const users: UserWithSubscription[] = [];
    
    console.log('🍍 Admin: Fetched', snapshot.size, 'users from Firestore');
    
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const userId = docSnap.id;
      const subscription = subscriptionMap[userId];
      
      users.push({
        id: userId,
        username: data.username || 'Unknown',
        email: data.email || '',
        photoUrl: data.photoUrls?.[0] || data.photoUrl,
        role: data.role || 'member',
        isVerified: data.isVerified === true,
        isFounder: data.isFounder === true,
        tier: subscription?.tier || 'free',
        subscriptionStatus: subscription?.status,
        createdAt: data.createdAt?.toDate(),
      });
    });
    
    // Sort by createdAt client-side (most recent first)
    users.sort((a, b) => {
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
    
    return { success: true, data: users };
  } catch (error: any) {
    console.error('Error fetching users for admin:', error);
    return { success: false, data: [], error: error.message };
  }
}
