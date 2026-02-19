'use server';

import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  increment,
  updateDoc,
} from 'firebase/firestore';

export interface ProfileView {
  id: string;
  viewerId: string;
  viewerUsername: string;
  viewerPhotoUrl?: string;
  viewedAt: Date;
}

export interface ViewStats {
  totalViews: number;
  uniqueViewers: number;
  recentViews: ProfileView[];
}

/**
 * Record a profile view
 * - Creates a view record
 * - Sends notification to profile owner
 * - Updates view count on profile
 */
export async function recordProfileView(
  viewerId: string,
  viewerUsername: string,
  viewerPhotoUrl: string | null,
  profileOwnerId: string
) {
  try {
    // Don't record self-views
    if (viewerId === profileOwnerId) {
      return { success: true, recorded: false };
    }

    const now = new Date();
    const viewId = `${viewerId}_${profileOwnerId}_${now.toISOString().split('T')[0]}`;

    // Check if viewer already viewed today (prevent spam)
    const existingView = await getDoc(doc(db, 'profileViews', viewId));
    if (existingView.exists()) {
      // Update timestamp only
      await updateDoc(doc(db, 'profileViews', viewId), {
        viewedAt: Timestamp.fromDate(now),
        viewCount: increment(1),
      });
      return { success: true, recorded: false, reason: 'Already viewed today' };
    }

    // Record the view
    await setDoc(doc(db, 'profileViews', viewId), {
      viewerId,
      viewerUsername,
      viewerPhotoUrl: viewerPhotoUrl || null,
      profileOwnerId,
      viewedAt: Timestamp.fromDate(now),
      viewCount: 1,
    });

    // Create notification for profile owner
    const notificationId = `view_${viewerId}_${profileOwnerId}_${Date.now()}`;
    await setDoc(doc(db, 'notifications', notificationId), {
      toUserId: profileOwnerId,
      fromUserId: viewerId,
      fromUsername: viewerUsername,
      fromPhotoUrl: viewerPhotoUrl || null,
      type: 'profile_view',
      message: `${viewerUsername} viewed your profile`,
      createdAt: Timestamp.fromDate(now),
      read: false,
    });

    // Update total view count on the profile
    const profileRef = doc(db, 'members', profileOwnerId);
    const profileDoc = await getDoc(profileRef);
    if (profileDoc.exists()) {
      await updateDoc(profileRef, {
        totalViews: increment(1),
        lastViewedAt: Timestamp.fromDate(now),
      });
    }

    return { success: true, recorded: true };
  } catch (error: any) {
    console.error('Error recording profile view:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get recent profile views for a user
 */
export async function getProfileViews(
  profileOwnerId: string,
  limitCount: number = 10
) {
  try {
    const viewsQuery = query(
      collection(db, 'profileViews'),
      where('profileOwnerId', '==', profileOwnerId),
      orderBy('viewedAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(viewsQuery);
    const views: ProfileView[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      views.push({
        id: doc.id,
        viewerId: data.viewerId,
        viewerUsername: data.viewerUsername,
        viewerPhotoUrl: data.viewerPhotoUrl,
        viewedAt: data.viewedAt?.toDate(),
      });
    });

    return { success: true, data: views };
  } catch (error: any) {
    console.error('Error fetching profile views:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Get view statistics for a profile
 */
export async function getProfileViewStats(profileOwnerId: string): Promise<{
  success: boolean;
  stats?: ViewStats;
  error?: string;
}> {
  try {
    // Get total views from profile
    const profileDoc = await getDoc(doc(db, 'members', profileOwnerId));
    const totalViews = profileDoc.data()?.totalViews || 0;

    // Get unique viewers count
    const viewsQuery = query(
      collection(db, 'profileViews'),
      where('profileOwnerId', '==', profileOwnerId)
    );
    const viewsSnapshot = await getDocs(viewsQuery);
    
    const uniqueViewerIds = new Set<string>();
    viewsSnapshot.forEach((doc) => {
      uniqueViewerIds.add(doc.data().viewerId);
    });

    // Get recent views
    const recentViewsQuery = query(
      collection(db, 'profileViews'),
      where('profileOwnerId', '==', profileOwnerId),
      orderBy('viewedAt', 'desc'),
      limit(5)
    );
    const recentSnapshot = await getDocs(recentViewsQuery);
    const recentViews: ProfileView[] = [];

    recentSnapshot.forEach((doc) => {
      const data = doc.data();
      recentViews.push({
        id: doc.id,
        viewerId: data.viewerId,
        viewerUsername: data.viewerUsername,
        viewerPhotoUrl: data.viewerPhotoUrl,
        viewedAt: data.viewedAt?.toDate(),
      });
    });

    return {
      success: true,
      stats: {
        totalViews,
        uniqueViewers: uniqueViewerIds.size,
        recentViews,
      },
    };
  } catch (error: any) {
    console.error('Error fetching view stats:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark view notifications as read
 */
export async function markViewNotificationsRead(userId: string) {
  try {
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('toUserId', '==', userId),
      where('type', '==', 'profile_view'),
      where('read', '==', false)
    );

    const snapshot = await getDocs(notificationsQuery);
    const updatePromises = snapshot.docs.map((doc) =>
      updateDoc(doc.ref, { read: true })
    );

    await Promise.all(updatePromises);
    return { success: true, count: snapshot.size };
  } catch (error: any) {
    console.error('Error marking notifications read:', error);
    return { success: false, error: error.message };
  }
}
