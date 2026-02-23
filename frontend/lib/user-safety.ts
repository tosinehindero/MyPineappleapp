'use client';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// Block User Functions
export const blockUser = async (
  currentUserId: string,
  targetUserId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const blockId = `${currentUserId}_${targetUserId}`;
    await setDoc(doc(db, 'blockedUsers', blockId), {
      blockerId: currentUserId,
      blockedUserId: targetUserId,
      createdAt: Timestamp.now(),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error blocking user:', error);
    return { success: false, error: error.message };
  }
};

export const unblockUser = async (
  currentUserId: string,
  targetUserId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const blockId = `${currentUserId}_${targetUserId}`;
    await deleteDoc(doc(db, 'blockedUsers', blockId));
    return { success: true };
  } catch (error: any) {
    console.error('Error unblocking user:', error);
    return { success: false, error: error.message };
  }
};

export const isUserBlocked = async (
  currentUserId: string,
  targetUserId: string
): Promise<boolean> => {
  try {
    const blockId = `${currentUserId}_${targetUserId}`;
    const blockDoc = await getDoc(doc(db, 'blockedUsers', blockId));
    return blockDoc.exists();
  } catch (error) {
    console.error('Error checking block status:', error);
    return false;
  }
};

export const getBlockedUsers = async (
  userId: string
): Promise<string[]> => {
  try {
    const q = query(
      collection(db, 'blockedUsers'),
      where('blockerId', '==', userId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data().blockedUserId);
  } catch (error) {
    console.error('Error getting blocked users:', error);
    return [];
  }
};

// Check if current user is blocked by target user (for hiding profile access)
export const isBlockedByUser = async (
  currentUserId: string,
  targetUserId: string
): Promise<boolean> => {
  try {
    const blockId = `${targetUserId}_${currentUserId}`;
    const blockDoc = await getDoc(doc(db, 'blockedUsers', blockId));
    return blockDoc.exists();
  } catch (error) {
    console.error('Error checking if blocked by user:', error);
    return false;
  }
};

// Report User Functions
export type ReportReason = 
  | 'harassment'
  | 'inappropriate_content'
  | 'spam'
  | 'fake_profile'
  | 'scam'
  | 'other';

export interface UserReport {
  id?: string;
  reporterId: string;
  reportedUserId: string;
  reason: ReportReason;
  details?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: Timestamp;
  reviewedAt?: Timestamp;
  adminNotes?: string;
}

export const reportUser = async (
  reporterId: string,
  reportedUserId: string,
  reason: ReportReason,
  details?: string
): Promise<{ success: boolean; reportId?: string; error?: string }> => {
  try {
    // Check if user already reported this person
    const existingReportQuery = query(
      collection(db, 'userReports'),
      where('reporterId', '==', reporterId),
      where('reportedUserId', '==', reportedUserId),
      where('status', '==', 'pending')
    );
    const existingReports = await getDocs(existingReportQuery);
    
    if (!existingReports.empty) {
      return { success: false, error: 'You have already reported this user. Our team is reviewing it.' };
    }

    const reportData: UserReport = {
      reporterId,
      reportedUserId,
      reason,
      details: details || '',
      status: 'pending',
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'userReports'), reportData);
    return { success: true, reportId: docRef.id };
  } catch (error: any) {
    console.error('Error reporting user:', error);
    return { success: false, error: error.message };
  }
};

export const getReportReasonLabel = (reason: ReportReason): string => {
  const labels: Record<ReportReason, string> = {
    harassment: 'Harassment or Bullying',
    inappropriate_content: 'Inappropriate Content',
    spam: 'Spam',
    fake_profile: 'Fake Profile',
    scam: 'Scam or Fraud',
    other: 'Other',
  };
  return labels[reason] || reason;
};

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'harassment', label: 'Harassment or Bullying' },
  { value: 'inappropriate_content', label: 'Inappropriate Content' },
  { value: 'spam', label: 'Spam' },
  { value: 'fake_profile', label: 'Fake Profile' },
  { value: 'scam', label: 'Scam or Fraud' },
  { value: 'other', label: 'Other' },
];
