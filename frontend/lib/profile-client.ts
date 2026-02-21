'use client';

import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';

/**
 * Get profile with field-level privacy (client-side)
 */
export async function getProfileClient(userId: string, requestingUserId?: string, isVerified?: boolean) {
  try {
    const profileDoc = await getDoc(doc(db, 'members', userId));
    
    if (!profileDoc.exists()) {
      return { success: false, error: 'Profile not found' };
    }

    const data = profileDoc.data() as {
      username?: string;
      accountType?: string;
      experienceLevel?: string;
      location?: string;
      interests?: string[];
      lookingFor?: string[];
      isVerified?: boolean;
      ageRangeMin?: number;
      ageRangeMax?: number;
      description?: string;
      fantasies?: string;
      photoUrls?: string[];
      [key: string]: any;
    };
    const fullProfile = { id: profileDoc.id, ...data };
    
    // Check if requesting user is owner or verified
    const isOwner = requestingUserId === userId;
    const canViewPrivate = isOwner || isVerified;

    if (!canViewPrivate) {
      // Return only public fields for unverified users
      const publicProfile = {
        id: fullProfile.id,
        username: fullProfile.username,
        accountType: fullProfile.accountType,
        experienceLevel: fullProfile.experienceLevel,
        location: fullProfile.location,
        interests: fullProfile.interests || [],
        lookingFor: fullProfile.lookingFor || [],
        isVerified: fullProfile.isVerified,
        ageRangeMin: fullProfile.ageRangeMin,
        ageRangeMax: fullProfile.ageRangeMax,
        description: null,
        fantasies: null,
        photoUrls: [],
      };
      
      return {
        success: true,
        data: publicProfile,
        restricted: true,
      };
    }

    return {
      success: true,
      data: fullProfile,
      restricted: false,
    };
  } catch (error: any) {
    console.error('getProfileClient error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get current user's verification status (client-side)
 */
export async function getUserVerificationStatusClient(userId: string) {
  try {
    const userDoc = await getDoc(doc(db, 'members', userId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        success: true,
        isVerified: data.status === 'verified',
        status: data.status || 'pending',
      };
    }
    return { success: false, isVerified: false };
  } catch (error: any) {
    console.error('getUserVerificationStatusClient error:', error);
    return { success: false, error: error.message, isVerified: false };
  }
}

export async function updateProfileClient(
  userId: string,
  updates: { description?: string; fantasies?: string }
) {
  try {
    await updateDoc(doc(db, 'members', userId), {
      ...updates,
      updatedAt: new Date(),
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleFavoriteClient(currentUserId: string, targetUserId: string) {
  try {
    const favoriteId = `${currentUserId}_${targetUserId}`;
    const favoriteRef = doc(db, 'favorites', favoriteId);
    const favoriteDoc = await getDoc(favoriteRef);

    if (favoriteDoc.exists()) {
      await deleteDoc(favoriteRef);
      return { success: true, isFavorite: false };
    } else {
      await setDoc(favoriteRef, {
        userId: currentUserId,
        favoriteUserId: targetUserId,
        createdAt: new Date(),
      });
      return { success: true, isFavorite: true };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function checkIsFavoriteClient(currentUserId: string, targetUserId: string) {
  try {
    const favoriteId = `${currentUserId}_${targetUserId}`;
    const favoriteDoc = await getDoc(doc(db, 'favorites', favoriteId));
    return { success: true, isFavorite: favoriteDoc.exists() };
  } catch (error: any) {
    return { success: false, error: error.message, isFavorite: false };
  }
}
