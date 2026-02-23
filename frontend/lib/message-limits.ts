'use client';

import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
} from 'firebase/firestore';

// Get today's date string for tracking daily limits
function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Interface for message tracking document
interface MessageTrackingDoc {
  userId: string;
  date: string;
  count: number;
  updatedAt: any;
}

/**
 * Get the number of messages sent today by a user
 */
export async function getMessagesSentToday(userId: string): Promise<number> {
  try {
    const today = getTodayDateString();
    const trackingRef = doc(db, 'messageTracking', `${userId}_${today}`);
    const trackingDoc = await getDoc(trackingRef);
    
    if (trackingDoc.exists()) {
      return trackingDoc.data().count || 0;
    }
    
    return 0;
  } catch (error) {
    console.error('Error getting messages sent today:', error);
    return 0;
  }
}

/**
 * Increment the message count for today
 */
export async function incrementMessageCount(userId: string): Promise<void> {
  try {
    const today = getTodayDateString();
    const trackingRef = doc(db, 'messageTracking', `${userId}_${today}`);
    const trackingDoc = await getDoc(trackingRef);
    
    if (trackingDoc.exists()) {
      await updateDoc(trackingRef, {
        count: increment(1),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(trackingRef, {
        userId,
        date: today,
        count: 1,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error incrementing message count:', error);
  }
}

/**
 * Check if a user can send a message based on their tier
 * Returns: { canSend: boolean, remaining: number, limit: number }
 */
export async function canSendMessage(
  userId: string,
  tier: 'free' | 'basic' | 'premium'
): Promise<{ canSend: boolean; remaining: number; limit: number; reason?: string }> {
  // Free users cannot send messages
  if (tier === 'free') {
    return {
      canSend: false,
      remaining: 0,
      limit: 0,
      reason: 'Upgrade to Basic or Premium to send messages',
    };
  }
  
  // Premium users have unlimited messages
  if (tier === 'premium') {
    return {
      canSend: true,
      remaining: -1, // -1 means unlimited
      limit: -1,
    };
  }
  
  // Basic users have 5 messages per day
  const limit = 5;
  const sentToday = await getMessagesSentToday(userId);
  const remaining = Math.max(0, limit - sentToday);
  
  return {
    canSend: remaining > 0,
    remaining,
    limit,
    reason: remaining <= 0 ? 'Daily message limit reached. Upgrade to Premium for unlimited messages.' : undefined,
  };
}
