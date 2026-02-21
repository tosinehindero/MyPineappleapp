'use server';

import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from 'firebase/firestore';

export interface PulseMember {
  id: string;
  username: string;
  photoUrl?: string;
  location?: string;
  isOnline?: boolean;
  lastSeen?: Date;
  accountType?: string;
  createdAt?: Date;
  favoritesCount?: number;
}

export interface PulseNotification {
  id: string;
  type: 'message' | 'favorite' | 'view' | 'match';
  fromUserId: string;
  fromUsername: string;
  fromPhotoUrl?: string;
  message?: string;
  createdAt: Date;
  read: boolean;
}

/**
 * Get new members (joined in last 7 days)
 */
export async function getNewMembers(limitCount: number = 5) {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const membersQuery = query(
      collection(db, 'members'),
      where('createdAt', '>=', Timestamp.fromDate(sevenDaysAgo)),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(membersQuery);
    const members: PulseMember[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      members.push({
        id: doc.id,
        username: data.username || 'New Member',
        photoUrl: data.photoUrls?.[0] || null,
        location: data.location,
        accountType: data.accountType,
        createdAt: data.createdAt?.toDate(),
      });
    });

    return { success: true, data: members };
  } catch (error: any) {
    console.error('Error fetching new members:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Get online members (for verified users only)
 */
export async function getOnlineMembers(
  viewerIsVerified: boolean,
  viewerLocation?: string,
  limitCount: number = 10
) {
  try {
    // Only verified members can see online status
    if (!viewerIsVerified) {
      return { success: true, data: [], restricted: true };
    }

    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

    const onlineQuery = query(
      collection(db, 'members'),
      where('isOnline', '==', true),
      where('lastSeen', '>=', Timestamp.fromDate(fiveMinutesAgo)),
      limit(limitCount)
    );

    const snapshot = await getDocs(onlineQuery);
    const members: PulseMember[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      members.push({
        id: doc.id,
        username: data.username || 'Member',
        photoUrl: data.photoUrls?.[0] || null,
        location: data.location,
        isOnline: true,
        lastSeen: data.lastSeen?.toDate(),
        accountType: data.accountType,
      });
    });

    // Sort by location proximity if viewer location provided
    if (viewerLocation) {
      members.sort((a, b) => {
        const aMatch = a.location?.toLowerCase().includes(viewerLocation.toLowerCase()) ? 0 : 1;
        const bMatch = b.location?.toLowerCase().includes(viewerLocation.toLowerCase()) ? 0 : 1;
        return aMatch - bMatch;
      });
    }

    return { success: true, data: members, restricted: false };
  } catch (error: any) {
    console.error('Error fetching online members:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Get trending/hot profiles (based on favorites count)
 */
export async function getTrendingProfiles(limitCount: number = 5) {
  try {
    // Get profiles with most favorites
    const favoritesSnapshot = await getDocs(collection(db, 'favorites'));
    
    // Count favorites per user
    const favoriteCounts: { [userId: string]: number } = {};
    favoritesSnapshot.forEach((doc) => {
      const data = doc.data();
      const targetId = data.favoriteUserId;
      if (targetId) {
        favoriteCounts[targetId] = (favoriteCounts[targetId] || 0) + 1;
      }
    });

    // Sort by count and get top users
    const topUserIds = Object.entries(favoriteCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limitCount)
      .map(([id]) => id);

    if (topUserIds.length === 0) {
      // Fallback: get random active members
      const membersQuery = query(
        collection(db, 'members'),
        orderBy('lastSeen', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(membersQuery);
      const members: PulseMember[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        members.push({
          id: doc.id,
          username: data.username || 'Member',
          photoUrl: data.photoUrls?.[0] || null,
          location: data.location,
          accountType: data.accountType,
          favoritesCount: 0,
        });
      });
      return { success: true, data: members };
    }

    // Fetch profile data for top users
    const members: PulseMember[] = [];
    for (const userId of topUserIds) {
      const membersQuery = query(
        collection(db, 'members'),
        where('__name__', '==', userId),
        limit(1)
      );
      const snapshot = await getDocs(membersQuery);
      snapshot.forEach((doc) => {
        const data = doc.data();
        members.push({
          id: doc.id,
          username: data.username || 'Member',
          photoUrl: data.photoUrls?.[0] || null,
          location: data.location,
          accountType: data.accountType,
          favoritesCount: favoriteCounts[userId],
        });
      });
    }

    return { success: true, data: members };
  } catch (error: any) {
    console.error('Error fetching trending profiles:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Get user's recent notifications
 */
export async function getUserNotifications(userId: string, limitCount: number = 10) {
  try {
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('toUserId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(notificationsQuery);
    const notifications: PulseNotification[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        type: data.type,
        fromUserId: data.fromUserId,
        fromUsername: data.fromUsername || 'Someone',
        fromPhotoUrl: data.fromPhotoUrl,
        message: data.message,
        createdAt: data.createdAt?.toDate(),
        read: data.read || false,
      });
    });

    return { success: true, data: notifications };
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Get unread message count
 */
export async function getUnreadMessageCount(userId: string) {
  try {
    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId)
    );

    const snapshot = await getDocs(conversationsQuery);
    let unreadCount = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      unreadCount += data.unreadCount?.[userId] || 0;
    });

    return { success: true, count: unreadCount };
  } catch (error: any) {
    console.error('Error fetching unread count:', error);
    return { success: false, count: 0 };
  }
}
