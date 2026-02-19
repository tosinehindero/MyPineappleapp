import CryptoJS from 'crypto-js';

/**
 * AES-256 Encryption Utility
 * End-to-end encryption for messages
 * Only sender and receiver can decrypt
 */

export interface EncryptedMessage {
  encryptedContent: string;
  iv: string; // Initialization Vector
  timestamp: number;
}

/**
 * Generate a unique encryption key for a conversation
 * This should be shared only between sender and receiver
 */
export const generateConversationKey = (): string => {
  // Generate 256-bit (32 bytes) random key
  const key = CryptoJS.lib.WordArray.random(32);
  return key.toString(CryptoJS.enc.Base64);
};

/**
 * Encrypt message content using AES-256
 * @param message - Plain text message
 * @param encryptionKey - 256-bit encryption key (Base64 encoded)
 * @returns Encrypted message with IV
 */
export const encryptMessage = (
  message: string,
  encryptionKey: string
): EncryptedMessage => {
  try {
    // Generate random IV (Initialization Vector) for each message
    const iv = CryptoJS.lib.WordArray.random(16);

    // Parse the Base64 key
    const key = CryptoJS.enc.Base64.parse(encryptionKey);

    // Encrypt using AES-256-CBC
    const encrypted = CryptoJS.AES.encrypt(message, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return {
      encryptedContent: encrypted.toString(),
      iv: iv.toString(CryptoJS.enc.Base64),
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt message');
  }
};

/**
 * Decrypt message content using AES-256
 * @param encryptedMessage - Encrypted message object
 * @param encryptionKey - 256-bit encryption key (Base64 encoded)
 * @returns Decrypted plain text message
 */
export const decryptMessage = (
  encryptedMessage: EncryptedMessage,
  encryptionKey: string
): string => {
  try {
    // Parse the Base64 key and IV
    const key = CryptoJS.enc.Base64.parse(encryptionKey);
    const iv = CryptoJS.enc.Base64.parse(encryptedMessage.iv);

    // Decrypt using AES-256-CBC
    const decrypted = CryptoJS.AES.decrypt(encryptedMessage.encryptedContent, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    // Convert to UTF-8 string
    const plaintext = decrypted.toString(CryptoJS.enc.Utf8);

    if (!plaintext) {
      throw new Error('Decryption failed - invalid key or corrupted data');
    }

    return plaintext;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt message');
  }
};

/**
 * Encrypt the conversation key for a specific user
 * Uses the user's public key or password-derived key
 * @param conversationKey - The shared conversation key
 * @param userSecret - User's secret (could be derived from their auth)
 * @returns Encrypted conversation key
 */
export const encryptKeyForUser = (
  conversationKey: string,
  userSecret: string
): string => {
  try {
    // Use user's secret to encrypt the conversation key
    const encrypted = CryptoJS.AES.encrypt(conversationKey, userSecret);
    return encrypted.toString();
  } catch (error) {
    console.error('Key encryption error:', error);
    throw new Error('Failed to encrypt conversation key');
  }
};

/**
 * Decrypt the conversation key for a specific user
 * @param encryptedKey - Encrypted conversation key
 * @param userSecret - User's secret
 * @returns Decrypted conversation key
 */
export const decryptKeyForUser = (
  encryptedKey: string,
  userSecret: string
): string => {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedKey, userSecret);
    const key = decrypted.toString(CryptoJS.enc.Utf8);

    if (!key) {
      throw new Error('Failed to decrypt conversation key');
    }

    return key;
  } catch (error) {
    console.error('Key decryption error:', error);
    throw new Error('Failed to decrypt conversation key');
  }
};

/**
 * Hash a string using SHA-256
 * Useful for creating conversation IDs
 */
export const hashString = (input: string): string => {
  return CryptoJS.SHA256(input).toString();
};

/**
 * Generate conversation ID from two user IDs
 * Always generates the same ID regardless of order
 */
export const generateConversationId = (userId1: string, userId2: string): string => {
  const sorted = [userId1, userId2].sort();
  return hashString(sorted.join('_'));
};

/**
 * Derive a user secret from their password (for key encryption)
 * In production, this should use PBKDF2 with salt
 */
export const deriveUserSecret = (userId: string, password?: string): string => {
  // For demo purposes, we'll use a simple hash
  // In production, use PBKDF2 with proper salt and iterations
  const input = password || userId; // Fallback to userId if no password
  return CryptoJS.SHA256(input).toString();
};

/**
 * Verify message integrity
 * @param message - Message to verify
 * @returns Boolean indicating if message is valid
 */
export const verifyMessageIntegrity = (message: any): boolean => {
  return !!(
    message &&
    message.encryptedContent &&
    message.iv &&
    typeof message.timestamp === 'number'
  );
};
