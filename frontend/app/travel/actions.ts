'use server';

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';

export interface SavedDestination {
  id: string;
  userId: string;
  name: string;
  location: string;
  type: string;
  description: string;
  highlights: string[];
  priceRange: string;
  imageQuery: string;
  savedAt: Date;
  notes?: string;
}

/**
 * Save a destination to user's favorites
 */
export async function saveDestination(
  userId: string,
  destination: {
    name: string;
    location: string;
    type: string;
    description: string;
    highlights: string[];
    priceRange: string;
    imageQuery: string;
  },
  notes?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Create a unique ID based on user and destination name
    const destinationId = `${userId}_${destination.name.replace(/\s+/g, '_').toLowerCase()}`;
    
    await setDoc(doc(db, 'savedDestinations', destinationId), {
      userId,
      ...destination,
      notes: notes || '',
      savedAt: serverTimestamp(),
    });

    return { success: true, id: destinationId };
  } catch (error: any) {
    console.error('Error saving destination:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove a saved destination
 */
export async function unsaveDestination(
  destinationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, 'savedDestinations', destinationId));
    return { success: true };
  } catch (error: any) {
    console.error('Error removing destination:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all saved destinations for a user
 */
export async function getSavedDestinations(
  userId: string
): Promise<{ success: boolean; data: SavedDestination[]; error?: string }> {
  try {
    const q = query(
      collection(db, 'savedDestinations'),
      where('userId', '==', userId),
      orderBy('savedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const destinations: SavedDestination[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      destinations.push({
        id: doc.id,
        userId: data.userId,
        name: data.name,
        location: data.location,
        type: data.type,
        description: data.description,
        highlights: data.highlights || [],
        priceRange: data.priceRange,
        imageQuery: data.imageQuery,
        savedAt: data.savedAt?.toDate(),
        notes: data.notes,
      });
    });

    return { success: true, data: destinations };
  } catch (error: any) {
    console.error('Error fetching saved destinations:', error);
    return { success: false, data: [], error: error.message };
  }
}

/**
 * Check if a destination is saved
 */
export async function isDestinationSaved(
  userId: string,
  destinationName: string
): Promise<boolean> {
  try {
    const destinationId = `${userId}_${destinationName.replace(/\s+/g, '_').toLowerCase()}`;
    const docRef = doc(db, 'savedDestinations', destinationId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch (error) {
    console.error('Error checking saved status:', error);
    return false;
  }
}

/**
 * Update notes for a saved destination
 */
export async function updateDestinationNotes(
  destinationId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { updateDoc } = await import('firebase/firestore');
    await updateDoc(doc(db, 'savedDestinations', destinationId), {
      notes,
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error updating notes:', error);
    return { success: false, error: error.message };
  }
}
