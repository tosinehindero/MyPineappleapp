'use server';

import { auth, db, storage } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Next.js Server Actions for PineapplePlay
 * All backend logic handled by Firebase + Server Actions
 */

export async function getUserProfile(userId: string) {
  try {
    const userDoc = await getDoc(doc(db, 'members', userId));
    if (userDoc.exists()) {
      return { success: true, data: userDoc.data() };
    }
    return { success: false, error: 'User not found' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateUserProfile(userId: string, data: any) {
  try {
    await updateDoc(doc(db, 'members', userId), {
      ...data,
      updatedAt: new Date(),
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function searchUsers(filters: {
  interests?: string[];
  location?: string;
  ageMin?: number;
  ageMax?: number;
}) {
  try {
    let q = query(collection(db, 'members'));

    // Apply filters
    if (filters.interests && filters.interests.length > 0) {
      q = query(q, where('interests', 'array-contains-any', filters.interests));
    }

    const snapshot = await getDocs(q);
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, data: users };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateOnlineStatus(userId: string, isOnline: boolean) {
  try {
    await updateDoc(doc(db, 'members', userId), {
      isOnline,
      lastSeen: new Date(),
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getNearbyUsers(userLat: number, userLng: number, radiusMiles: number) {
  try {
    // Fetch all users (in production, use geohashing for efficiency)
    const snapshot = await getDocs(collection(db, 'members'));
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Array<{ id: string; coordinates?: { lat: number; lng: number }; [key: string]: any }>;

    // Filter by distance (Haversine formula)
    const nearbyUsers = users.filter(user => {
      if (!user.coordinates) return false;
      const distance = calculateDistance(
        userLat,
        userLng,
        user.coordinates.lat,
        user.coordinates.lng
      );
      return distance <= radiusMiles;
    });

    return { success: true, data: nearbyUsers };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
