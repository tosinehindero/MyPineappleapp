'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { unblockUser } from '@/lib/user-safety';

interface BlockedUser {
  id: string;
  blockedUserId: string;
  username: string;
  photoUrl: string | null;
  blockedAt: Date;
}

export default function BlockedUsersPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        await loadBlockedUsers(user.uid);
      } else {
        setCurrentUser(null);
        setBlockedUsers([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loadBlockedUsers = async (userId: string) => {
    try {
      const q = query(
        collection(db, 'blockedUsers'),
        where('blockerId', '==', userId)
      );
      const snapshot = await getDocs(q);
      
      const blocked: BlockedUser[] = [];
      
      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        const blockedUserId = data.blockedUserId;
        
        // Get the blocked user's profile info
        const userDoc = await getDoc(doc(db, 'members', blockedUserId));
        const userData = userDoc.exists() ? userDoc.data() : null;
        
        blocked.push({
          id: docSnapshot.id,
          blockedUserId,
          username: userData?.username || 'Unknown User',
          photoUrl: userData?.photoUrls?.[0] || null,
          blockedAt: data.createdAt?.toDate() || new Date(),
        });
      }
      
      // Sort by most recently blocked
      blocked.sort((a, b) => b.blockedAt.getTime() - a.blockedAt.getTime());
      setBlockedUsers(blocked);
    } catch (error) {
      console.error('Error loading blocked users:', error);
    }
  };

  const handleUnblock = async (blockedUserId: string) => {
    if (!currentUser) return;
    
    setUnblocking(blockedUserId);
    try {
      const result = await unblockUser(currentUser.uid, blockedUserId);
      if (result.success) {
        setBlockedUsers(prev => prev.filter(u => u.blockedUserId !== blockedUserId));
      }
    } catch (error) {
      console.error('Error unblocking user:', error);
    } finally {
      setUnblocking(null);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-heading text-gold mb-4">Please Sign In</h2>
          <Link
            href="/login"
            className="px-6 py-2 bg-gold text-charcoal rounded-full font-semibold hover:shadow-gold-glow transition-all"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-darkBlue/95 backdrop-blur-md border-b border-gold/20">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/feed" className="text-offWhite/60 hover:text-gold transition-colors">
              <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-heading text-gold">Blocked Users</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Info Banner */}
        <div className="mb-6 p-4 bg-white/[0.03] border border-white/10 rounded-xl">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-offWhite/80 text-sm font-body">
                Blocked users cannot see your profile, message you, or find you in search results. 
                Their posts will be hidden from your feed.
              </p>
            </div>
          </div>
        </div>

        {/* Blocked Users List */}
        {blockedUsers.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-white/[0.03] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-offWhite/20" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <h3 className="text-lg font-heading text-offWhite/60 mb-2">No Blocked Users</h3>
            <p className="text-offWhite/40 text-sm font-body">
              You haven't blocked anyone yet. You can block users from their profile page.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-offWhite/60 text-sm font-body mb-4">
              {blockedUsers.length} blocked user{blockedUsers.length !== 1 ? 's' : ''}
            </p>
            
            <AnimatePresence>
              {blockedUsers.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex items-center justify-between"
                  data-testid={`blocked-user-${user.blockedUserId}`}
                >
                  <div className="flex items-center space-x-4">
                    {/* Avatar */}
                    <Link href={`/profile/${user.blockedUserId}`}>
                      {user.photoUrl ? (
                        <img
                          src={user.photoUrl}
                          alt={user.username}
                          className="w-12 h-12 rounded-full border-2 border-red-500/30 object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full border-2 border-red-500/30 bg-red-500/10 flex items-center justify-center text-red-400 font-heading">
                          {user.username[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </Link>
                    
                    {/* Info */}
                    <div>
                      <Link 
                        href={`/profile/${user.blockedUserId}`}
                        className="text-offWhite font-body font-semibold hover:text-gold transition-colors"
                      >
                        {user.username}
                      </Link>
                      <p className="text-offWhite/40 text-xs font-body">
                        Blocked on {formatDate(user.blockedAt)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Unblock Button */}
                  <button
                    onClick={() => handleUnblock(user.blockedUserId)}
                    disabled={unblocking === user.blockedUserId}
                    className="px-4 py-2 bg-white/[0.05] border border-white/10 rounded-full text-sm font-body text-offWhite/80 hover:border-gold/30 hover:text-gold transition-all disabled:opacity-50"
                    data-testid={`unblock-btn-${user.blockedUserId}`}
                  >
                    {unblocking === user.blockedUserId ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Unblocking...
                      </span>
                    ) : (
                      'Unblock'
                    )}
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
