'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  getUserConversations,
  subscribeToMessages,
  sendEncryptedMessage,
  initializeConversation,
  markMessagesAsRead,
  deriveUserSecret,
  type Conversation,
  type DecryptedMessage,
} from '@/lib/messaging';
import PrivacyProtection from './PrivacyProtection';

export default function SecureMessaging() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(
    null
  );
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userSecret, setUserSecret] = useState('');
  const [viewerUsername, setViewerUsername] = useState('');

  // Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        // Derive user secret (in production, this should be more secure)
        const secret = deriveUserSecret(user.uid);
        setUserSecret(secret);
        
        // Load conversations
        try {
          const convos = await getUserConversations(user.uid);
          setConversations(convos);
        } catch (error) {
          console.error('Error loading conversations:', error);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to messages when conversation is selected
  useEffect(() => {
    if (!selectedConversation || !currentUser || !userSecret) return;

    const unsubscribe = subscribeToMessages(
      selectedConversation.id,
      currentUser.uid,
      userSecret,
      (decryptedMessages) => {
        setMessages(decryptedMessages);
        scrollToBottom();
      }
    );

    // Mark as read
    markMessagesAsRead(selectedConversation.id, currentUser.uid);

    return () => unsubscribe();
  }, [selectedConversation, currentUser, userSecret]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversation || !currentUser || !userSecret) {
      return;
    }

    setSending(true);
    try {
      await sendEncryptedMessage(
        selectedConversation.id,
        currentUser.uid,
        messageInput,
        userSecret
      );
      setMessageInput('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-offWhite font-body">Loading secure messages...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-gold/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-gold"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-heading text-gold mb-2">Secure Messaging</h2>
          <p className="text-offWhite/70 font-body mb-6">
            Please sign in to access your encrypted messages
          </p>
          <a
            href="/register"
            className="inline-block px-6 py-3 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  const getOtherParticipant = (conversation: Conversation) => {
    const otherUserId = conversation.participants.find((id) => id !== currentUser.uid);
    return {
      id: otherUserId,
      name: otherUserId ? conversation.participantNames[otherUserId] : 'Unknown',
      photo: otherUserId ? conversation.participantPhotos[otherUserId] : '',
    };
  };

  return (
    <div className="h-screen bg-charcoal flex">
      {/* Conversations Sidebar */}
      <div className="w-full md:w-96 bg-darkBlue border-r border-gold/20 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gold/20">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-heading text-gold">Messages</h1>
            <div className="w-10 h-10 bg-gold/20 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-gold"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          <p className="text-offWhite/60 text-sm font-body">
            🔒 End-to-end encrypted with AES-256
          </p>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-offWhite/60 font-body">No conversations yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gold/10">
              {conversations.map((conversation) => {
                const other = getOtherParticipant(conversation);
                const isSelected = selectedConversation?.id === conversation.id;

                return (
                  <motion.button
                    key={conversation.id}
                    whileHover={{ backgroundColor: 'rgba(212, 175, 55, 0.05)' }}
                    onClick={() => setSelectedConversation(conversation)}
                    className={`w-full p-4 text-left transition-colors ${
                      isSelected ? 'bg-gold/10' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {other.photo ? (
                        <img
                          src={other.photo}
                          alt={other.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-gold"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gold flex items-center justify-center text-charcoal font-heading text-lg">
                          {other.name[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-heading text-gold truncate">
                            {other.name}
                          </h3>
                          {conversation.unreadCount?.[currentUser.uid] > 0 && (
                            <span className="px-2 py-1 bg-gold text-charcoal text-xs font-bold rounded-full">
                              {conversation.unreadCount[currentUser.uid]}
                            </span>
                          )}
                        </div>
                        <p className="text-offWhite/60 text-sm truncate">
                          {conversation.lastMessage || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-6 bg-darkBlue border-b border-gold/20">
              <div className="flex items-center space-x-3">
                {(() => {
                  const other = getOtherParticipant(selectedConversation);
                  return (
                    <>
                      {other.photo ? (
                        <img
                          src={other.photo}
                          alt={other.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-gold"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gold flex items-center justify-center text-charcoal font-heading text-xl">
                          {other.name[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h2 className="font-heading text-xl text-gold">{other.name}</h2>
                        <p className="text-offWhite/60 text-sm flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          Encrypted
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <AnimatePresence>
                {messages.map((message, index) => {
                  const isOwn = message.senderId === currentUser.uid;
                  const showAvatar =
                    index === 0 || messages[index - 1].senderId !== message.senderId;

                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`flex items-end space-x-2 max-w-md ${
                          isOwn ? 'flex-row-reverse space-x-reverse' : ''
                        }`}
                      >
                        {showAvatar && !isOwn && (
                          <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-charcoal text-sm font-heading flex-shrink-0">
                            {getOtherParticipant(selectedConversation)
                              .name[0]?.toUpperCase()}
                          </div>
                        )}
                        {showAvatar && isOwn && (
                          <div className="w-8 h-8 rounded-full bg-gold-light flex items-center justify-center text-charcoal text-sm font-heading flex-shrink-0">
                            You
                          </div>
                        )}
                        <div
                          className={`px-4 py-3 rounded-2xl ${
                            isOwn
                              ? 'bg-gold text-charcoal'
                              : 'glass-morphism text-offWhite'
                          }`}
                        >
                          <p className="font-body break-words">{message.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isOwn ? 'text-charcoal/60' : 'text-offWhite/60'
                            }`}
                          >
                            {message.timestamp?.toDate().toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {!message.decrypted && ' 🔒'}
                          </p>
                        </div>
                        {!showAvatar && <div className="w-8"></div>}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form
              onSubmit={handleSendMessage}
              className="p-6 bg-darkBlue border-t border-gold/20"
            >
              <div className="flex items-end space-x-3">
                <div className="flex-1">
                  <textarea
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                    placeholder="Type an encrypted message..."
                    className="w-full px-4 py-3 bg-charcoal border border-gold/20 rounded-lg text-offWhite focus:border-gold focus:outline-none transition-colors font-body resize-none"
                    rows={1}
                    disabled={sending}
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={sending || !messageInput.trim()}
                  className="px-6 py-3 bg-gold text-charcoal font-semibold rounded-lg hover:shadow-gold-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    'Send 🔒'
                  )}
                </motion.button>
              </div>
              <p className="text-offWhite/40 text-xs mt-2 font-body">
                🔒 Messages are encrypted with AES-256 before sending
              </p>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-12 h-12 text-gold"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-heading text-gold mb-2">
                Select a conversation
              </h3>
              <p className="text-offWhite/60 font-body">
                Choose a conversation to start messaging securely
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
