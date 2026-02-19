'use server';

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

export async function getProfile(userId: string) {
  try {
    const profileDoc = await getDoc(doc(db, 'members', userId));
    if (profileDoc.exists()) {
      return {
        success: true,
        data: { id: profileDoc.id, ...profileDoc.data() },
      };
    }
    return { success: false, error: 'Profile not found' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateProfile(
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

export async function toggleFavorite(currentUserId: string, targetUserId: string) {
  try {
    const favoriteId = `${currentUserId}_${targetUserId}`;
    const favoriteRef = doc(db, 'favorites', favoriteId);
    const favoriteDoc = await getDoc(favoriteRef);

    if (favoriteDoc.exists()) {
      // Remove from favorites
      await deleteDoc(favoriteRef);
      return { success: true, isFavorite: false };
    } else {
      // Add to favorites
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

export async function checkIsFavorite(currentUserId: string, targetUserId: string) {
  try {
    const favoriteId = `${currentUserId}_${targetUserId}`;
    const favoriteDoc = await getDoc(doc(db, 'favorites', favoriteId));
    return { success: true, isFavorite: favoriteDoc.exists() };
  } catch (error: any) {
    return { success: false, error: error.message, isFavorite: false };
  }
}

export async function getUserFavorites(userId: string) {
  try {
    const favoritesQuery = query(
      collection(db, 'favorites'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(favoritesQuery);
    const favorites = snapshot.docs.map((doc) => doc.data());
    return { success: true, data: favorites };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
