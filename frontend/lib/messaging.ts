import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  encryptMessage,
  decryptMessage,
  generateConversationKey,
  encryptKeyForUser,
  decryptKeyForUser,
  generateConversationId,
  deriveUserSecret,
  type EncryptedMessage,
} from './encryption';

// Re-export for convenience
export { deriveUserSecret } from './encryption';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  encryptedContent: string;
  iv: string;
  timestamp: Timestamp;
  readBy: string[];
}

export interface DecryptedMessage extends Omit<Message, 'encryptedContent' | 'iv'> {
  content: string;
  decrypted: boolean;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantNames: { [userId: string]: string };
  participantPhotos: { [userId: string]: string };
  lastMessage?: string;
  lastMessageTime?: Timestamp;
  unreadCount: { [userId: string]: number };
  createdAt: Timestamp;
}

export interface ConversationKey {
  conversationId: string;
  userId: string;
  encryptedKey: string; // Conversation key encrypted with user's secret
  createdAt: Timestamp;
}

/**
 * Initialize a new conversation with encryption
 */
export const initializeConversation = async (
  userId: string,
  otherUserId: string,
  userName: string,
  otherUserName: string,
  userPhoto: string,
  otherUserPhoto: string,
  userSecret: string
): Promise<string> => {
  try {
    const conversationId = generateConversationId(userId, otherUserId);

    // Check if conversation already exists
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);

    if (!conversationSnap.exists()) {
      // Generate a new conversation encryption key
      const conversationKey = generateConversationKey();

      // Create the conversation document
      await setDoc(conversationRef, {
        participants: [userId, otherUserId],
        participantNames: {
          [userId]: userName,
          [otherUserId]: otherUserName,
        },
        participantPhotos: {
          [userId]: userPhoto,
          [otherUserId]: otherUserPhoto,
        },
        unreadCount: {
          [userId]: 0,
          [otherUserId]: 0,
        },
        createdAt: serverTimestamp(),
      });

      // Store encrypted conversation key for both users
      // Each user gets their own encrypted copy of the conversation key
      await Promise.all([
        setDoc(doc(db, 'conversationKeys', `${conversationId}_${userId}`), {
          conversationId,
          userId,
          encryptedKey: encryptKeyForUser(conversationKey, userSecret),
          createdAt: serverTimestamp(),
        }),
        setDoc(doc(db, 'conversationKeys', `${conversationId}_${otherUserId}`), {
          conversationId,
          userId: otherUserId,
          encryptedKey: encryptKeyForUser(
            conversationKey,
            deriveUserSecret(otherUserId)
          ),
          createdAt: serverTimestamp(),
        }),
      ]);
    }

    return conversationId;
  } catch (error) {
    console.error('Error initializing conversation:', error);
    throw error;
  }
};

/**
 * Get conversation encryption key for a user
 */
export const getConversationKey = async (
  conversationId: string,
  userId: string,
  userSecret: string
): Promise<string> => {
  try {
    const keyDoc = await getDoc(
      doc(db, 'conversationKeys', `${conversationId}_${userId}`)
    );

    if (!keyDoc.exists()) {
      throw new Error('Conversation key not found');
    }

    const keyData = keyDoc.data() as ConversationKey;
    const conversationKey = decryptKeyForUser(keyData.encryptedKey, userSecret);

    return conversationKey;
  } catch (error) {
    console.error('Error getting conversation key:', error);
    throw error;
  }
};

/**
 * Send an encrypted message
 */
export const sendEncryptedMessage = async (
  conversationId: string,
  senderId: string,
  messageContent: string,
  userSecret: string
): Promise<void> => {
  try {
    // Get the conversation encryption key
    const conversationKey = await getConversationKey(
      conversationId,
      senderId,
      userSecret
    );

    // Encrypt the message
    const encrypted = encryptMessage(messageContent, conversationKey);

    // Store encrypted message in Firestore
    await addDoc(collection(db, 'messages'), {
      conversationId,
      senderId,
      encryptedContent: encrypted.encryptedContent,
      iv: encrypted.iv,
      timestamp: serverTimestamp(),
      readBy: [senderId],
    });

    // Update conversation last message (store encrypted preview)
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      lastMessage: '[Encrypted Message]', // Don't store actual content
      lastMessageTime: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/**
 * Get and decrypt messages for a conversation
 */
export const getDecryptedMessages = async (
  conversationId: string,
  userId: string,
  userSecret: string
): Promise<DecryptedMessage[]> => {
  try {
    // Get the conversation encryption key
    const conversationKey = await getConversationKey(
      conversationId,
      userId,
      userSecret
    );

    // Fetch messages
    const messagesQuery = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'asc')
    );

    const messagesSnap = await getDocs(messagesQuery);

    // Decrypt messages
    const decryptedMessages: DecryptedMessage[] = [];

    messagesSnap.forEach((doc) => {
      const messageData = doc.data() as Message;

      try {
        const decrypted = decryptMessage(
          {
            encryptedContent: messageData.encryptedContent,
            iv: messageData.iv,
            timestamp: messageData.timestamp.toMillis(),
          },
          conversationKey
        );

        decryptedMessages.push({
          id: doc.id,
          conversationId: messageData.conversationId,
          senderId: messageData.senderId,
          content: decrypted,
          timestamp: messageData.timestamp,
          readBy: messageData.readBy || [],
          decrypted: true,
        });
      } catch (error) {
        console.error('Failed to decrypt message:', doc.id, error);
        // Add as undecryptable
        decryptedMessages.push({
          id: doc.id,
          conversationId: messageData.conversationId,
          senderId: messageData.senderId,
          content: '[Message cannot be decrypted]',
          timestamp: messageData.timestamp,
          readBy: messageData.readBy || [],
          decrypted: false,
        });
      }
    });

    return decryptedMessages;
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time encrypted messages
 */
export const subscribeToMessages = (
  conversationId: string,
  userId: string,
  userSecret: string,
  callback: (messages: DecryptedMessage[]) => void
): (() => void) => {
  const messagesQuery = query(
    collection(db, 'messages'),
    where('conversationId', '==', conversationId),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(messagesQuery, async (snapshot) => {
    try {
      const conversationKey = await getConversationKey(
        conversationId,
        userId,
        userSecret
      );

      const decryptedMessages: DecryptedMessage[] = [];

      snapshot.forEach((doc) => {
        const messageData = doc.data() as Message;

        try {
          const decrypted = decryptMessage(
            {
              encryptedContent: messageData.encryptedContent,
              iv: messageData.iv,
              timestamp: messageData.timestamp?.toMillis() || Date.now(),
            },
            conversationKey
          );

          decryptedMessages.push({
            id: doc.id,
            conversationId: messageData.conversationId,
            senderId: messageData.senderId,
            content: decrypted,
            timestamp: messageData.timestamp,
            readBy: messageData.readBy || [],
            decrypted: true,
          });
        } catch (error) {
          console.error('Failed to decrypt message:', doc.id);
          decryptedMessages.push({
            id: doc.id,
            conversationId: messageData.conversationId,
            senderId: messageData.senderId,
            content: '[Message cannot be decrypted]',
            timestamp: messageData.timestamp,
            readBy: messageData.readBy || [],
            decrypted: false,
          });
        }
      });

      callback(decryptedMessages);
    } catch (error) {
      console.error('Error in message subscription:', error);
    }
  });
};

/**
 * Get user's conversations
 */
export const getUserConversations = async (userId: string): Promise<Conversation[]> => {
  try {
    const conversationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId)
    );

    const snapshot = await getDocs(conversationsQuery);
    const conversations: Conversation[] = [];

    snapshot.forEach((doc) => {
      conversations.push({
        id: doc.id,
        ...doc.data(),
      } as Conversation);
    });

    // Sort by last message time
    conversations.sort((a, b) => {
      const aTime = a.lastMessageTime?.toMillis() || 0;
      const bTime = b.lastMessageTime?.toMillis() || 0;
      return bTime - aTime;
    });

    return conversations;
  } catch (error) {
    console.error('Error getting conversations:', error);
    throw error;
  }
};

/**
 * Mark messages as read
 */
export const markMessagesAsRead = async (
  conversationId: string,
  userId: string
): Promise<void> => {
  try {
    const messagesQuery = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId)
    );

    const snapshot = await getDocs(messagesQuery);

    const updatePromises = snapshot.docs.map((doc) => {
      const data = doc.data();
      if (!data.readBy?.includes(userId)) {
        return updateDoc(doc.ref, {
          readBy: [...(data.readBy || []), userId],
        });
      }
      return Promise.resolve();
    });

    await Promise.all(updatePromises);

    // Reset unread count
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      [`unreadCount.${userId}`]: 0,
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
};


// Delete a message (only by sender)
export const deleteMessage = async (
  messageId: string,
  senderId: string,
  currentUserId: string
): Promise<boolean> => {
  try {
    // Verify the current user is the sender
    if (senderId !== currentUserId) {
      console.error('Cannot delete message: not the sender');
      return false;
    }

    const messageRef = doc(db, 'messages', messageId);
    await deleteDoc(messageRef);
    return true;
  } catch (error) {
    console.error('Error deleting message:', error);
    return false;
  }
};
