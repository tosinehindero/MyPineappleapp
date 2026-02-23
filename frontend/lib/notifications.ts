import {
  collection,
  doc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  getDocs,
  Timestamp,
  limit,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';

export type NotificationType = 
  | 'message'
  | 'purchase'
  | 'sale'
  | 'follow'
  | 'like'
  | 'comment'
  | 'mention'
  | 'verification'
  | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  toUserId: string;
  fromUserId?: string;
  fromUsername?: string;
  fromPhoto?: string;
  read: boolean;
  link?: string;
  metadata?: Record<string, any>;
  createdAt: Timestamp;
}

// Create a new notification
export const createNotification = async (
  toUserId: string,
  type: NotificationType,
  title: string,
  message: string,
  options?: {
    fromUserId?: string;
    fromUsername?: string;
    fromPhoto?: string;
    link?: string;
    metadata?: Record<string, any>;
  }
): Promise<string | null> => {
  try {
    const notificationData = {
      type,
      title,
      message,
      toUserId,
      fromUserId: options?.fromUserId || null,
      fromUsername: options?.fromUsername || null,
      fromPhoto: options?.fromPhoto || null,
      read: false,
      link: options?.link || null,
      metadata: options?.metadata || null,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'notifications'), notificationData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// Subscribe to user's notifications (real-time)
export const subscribeToNotifications = (
  userId: string,
  callback: (notifications: Notification[]) => void,
  limitCount: number = 50
) => {
  const q = query(
    collection(db, 'notifications'),
    where('toUserId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(q, (snapshot) => {
    const notifications: Notification[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Notification));
    callback(notifications);
  });
};

// Mark a notification as read
export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, { read: true });
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = async (userId: string): Promise<boolean> => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('toUserId', '==', userId),
      where('read', '==', false)
    );
    
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { read: true });
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
};

// Mark message notifications as read for a specific conversation
export const markMessageNotificationsAsRead = async (
  userId: string,
  conversationId?: string
): Promise<boolean> => {
  try {
    // Query for unread message notifications for this user
    const q = query(
      collection(db, 'notifications'),
      where('toUserId', '==', userId),
      where('type', '==', 'message'),
      where('read', '==', false)
    );
    
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    
    snapshot.docs.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      // If conversationId is specified, only mark that conversation's notifications
      // Otherwise, mark all message notifications as read
      if (!conversationId || data.metadata?.conversationId === conversationId) {
        batch.update(docSnapshot.ref, { read: true });
      }
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error marking message notifications as read:', error);
    return false;
  }
};

// Get unread notification count
export const getUnreadCount = (notifications: Notification[]): number => {
  return notifications.filter((n) => !n.read).length;
};

// Notification helper functions for specific events
export const notifyNewMessage = async (
  toUserId: string,
  fromUserId: string,
  fromUsername: string,
  fromPhoto?: string,
  conversationId?: string
) => {
  return createNotification(
    toUserId,
    'message',
    'New Message',
    `${fromUsername} sent you a message`,
    {
      fromUserId,
      fromUsername,
      fromPhoto,
      link: '/messages',
      metadata: { conversationId },
    }
  );
};

export const notifyNewPurchase = async (
  sellerId: string,
  buyerUsername: string,
  itemTitle: string,
  amount: number,
  transactionId?: string
) => {
  return createNotification(
    sellerId,
    'sale',
    'New Sale!',
    `${buyerUsername} purchased "${itemTitle}" for $${amount.toFixed(2)}`,
    {
      fromUsername: buyerUsername,
      link: '/marketplace/transactions',
      metadata: { transactionId, amount },
    }
  );
};

export const notifyPurchaseComplete = async (
  buyerId: string,
  itemTitle: string,
  sellerUsername: string
) => {
  return createNotification(
    buyerId,
    'purchase',
    'Purchase Confirmed',
    `Your purchase of "${itemTitle}" from ${sellerUsername} is complete`,
    {
      link: '/marketplace/transactions',
    }
  );
};

export const notifyNewComment = async (
  postAuthorId: string,
  commenterUsername: string,
  commenterPhoto?: string,
  postId?: string
) => {
  return createNotification(
    postAuthorId,
    'comment',
    'New Comment',
    `${commenterUsername} commented on your post`,
    {
      fromUsername: commenterUsername,
      fromPhoto: commenterPhoto,
      link: '/feed',
      metadata: { postId },
    }
  );
};

export const notifyNewLike = async (
  postAuthorId: string,
  likerUsername: string,
  likerPhoto?: string,
  postId?: string
) => {
  return createNotification(
    postAuthorId,
    'like',
    'New Reaction',
    `${likerUsername} reacted to your post`,
    {
      fromUsername: likerUsername,
      fromPhoto: likerPhoto,
      link: '/feed',
      metadata: { postId },
    }
  );
};

export const notifyVerificationApproved = async (userId: string) => {
  return createNotification(
    userId,
    'verification',
    'Verification Approved!',
    'Congratulations! Your profile has been verified.',
    {
      link: '/feed',
    }
  );
};
