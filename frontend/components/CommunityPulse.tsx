'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { getUserVerificationStatus } from '@/app/profile/actions';
import Link from 'next/link';

interface PulseMember {
  id: string;
  username: string;
  photoUrl?: string;
  location?: string;
  isOnline?: boolean;
  accountType?: string;
  createdAt?: Date;
  favoritesCount?: number;
}

interface PulseNotification {
  id: string;
  type: 'message' | 'favorite' | 'profile_view';
  fromUserId?: string;
  fromUsername: string;
  fromPhotoUrl?: string;
  createdAt: Date;
  read?: boolean;
}

type TabType = 'new' | 'online' | 'trending' | 'notifications';

export default function CommunityPulse() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('new');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [newMembers, setNewMembers] = useState<PulseMember[]>([]);
  const [onlineMembers, setOnlineMembers] = useState<PulseMember[]>([]);
  const [trendingMembers, setTrendingMembers] = useState<PulseMember[]>([]);
  const [notifications, setNotifications] = useState<PulseNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Auth and verification check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const result = await getUserVerificationStatus(user.uid);
        setIsVerified(result.isVerified || false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Real-time subscription for new members
  useEffect(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const membersQuery = query(
      collection(db, 'members'),
      where('createdAt', '>=', Timestamp.fromDate(sevenDaysAgo)),
      orderBy('createdAt', 'desc'),
      limit(8)
    );

    const unsubscribe = onSnapshot(membersQuery, (snapshot) => {
      const members: PulseMember[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        members.push({
          id: doc.id,
          username: data.username || 'New Member',
          photoUrl: data.photoUrls?.[0] || null,
          location: data.location,
          accountType: data.accountType,
          createdAt: data.createdAt?.toDate(),
        });
      });
      setNewMembers(members);
    });

    return () => unsubscribe();
  }, []);

  // Real-time subscription for online members (verified only)
  useEffect(() => {
    if (!isVerified) {
      setOnlineMembers([]);
      return;
    }

    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

    const onlineQuery = query(
      collection(db, 'members'),
      where('isOnline', '==', true),
      limit(10)
    );

    const unsubscribe = onSnapshot(onlineQuery, (snapshot) => {
      const members: PulseMember[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        members.push({
          id: doc.id,
          username: data.username || 'Member',
          photoUrl: data.photoUrls?.[0] || null,
          location: data.location,
          isOnline: true,
          accountType: data.accountType,
        });
      });
      setOnlineMembers(members);
    });

    return () => unsubscribe();
  }, [isVerified]);

  // Real-time subscription for trending profiles
  useEffect(() => {
    // Only subscribe if user is authenticated
    if (!currentUser) return;

    const trendingQuery = query(
      collection(db, 'members'),
      orderBy('lastSeen', 'desc'),
      limit(8)
    );

    const unsubscribe = onSnapshot(trendingQuery, (snapshot) => {
      const members: PulseMember[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        members.push({
          id: doc.id,
          username: data.username || 'Member',
          photoUrl: data.photoUrls?.[0] || null,
          location: data.location,
          accountType: data.accountType,
        });
      });
      setTrendingMembers(members);
    }, (error) => {
      console.error('Error fetching trending members:', error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Real-time subscription for notifications
  useEffect(() => {
    if (!currentUser) return;

    const notificationsQuery = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', currentUser.uid),
      orderBy('lastMessageTime', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      let totalUnread = 0;
      const notifs: PulseNotification[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        totalUnread += data.unreadCount?.[currentUser.uid] || 0;
        
        // Get the other participant's name for notification display
        const otherUserId = data.participants?.find((id: string) => id !== currentUser.uid);
        if (otherUserId && data.lastMessage) {
          notifs.push({
            id: doc.id,
            type: 'message',
            fromUsername: data.participantNames?.[otherUserId] || 'Someone',
            fromPhotoUrl: data.participantPhotos?.[otherUserId],
            createdAt: data.lastMessageTime?.toDate(),
          });
        }
      });

      setUnreadCount(totalUnread);
      setNotifications((prev) => {
        // Merge with existing profile view notifications
        const messageNotifs = notifs;
        const viewNotifs = prev.filter(n => n.type === 'profile_view');
        return [...messageNotifs, ...viewNotifs].sort((a, b) => 
          (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
        ).slice(0, 10);
      });
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Real-time subscription for profile view notifications
  useEffect(() => {
    if (!currentUser) return;

    const viewNotificationsQuery = query(
      collection(db, 'notifications'),
      where('toUserId', '==', currentUser.uid),
      where('type', '==', 'profile_view'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(viewNotificationsQuery, (snapshot) => {
      const viewNotifs: PulseNotification[] = [];
      let unreadViewCount = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.read) unreadViewCount++;
        viewNotifs.push({
          id: doc.id,
          type: 'profile_view',
          fromUserId: data.fromUserId,
          fromUsername: data.fromUsername || 'Someone',
          fromPhotoUrl: data.fromPhotoUrl,
          createdAt: data.createdAt?.toDate(),
          read: data.read,
        });
      });

      setNotifications((prev) => {
        // Merge with existing message notifications
        const messageNotifs = prev.filter(n => n.type === 'message');
        return [...messageNotifs, ...viewNotifs].sort((a, b) => 
          (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
        ).slice(0, 10);
      });

      // Update unread count to include view notifications
      setUnreadCount((prev) => {
        const messageUnread = prev;
        return messageUnread + unreadViewCount;
      });
    });

    return () => unsubscribe();
  }, [currentUser]);

  const tabs = [
    { id: 'new' as TabType, label: 'New', icon: '✨' },
    { id: 'online' as TabType, label: 'Online', icon: '🟢' },
    { id: 'trending' as TabType, label: 'Hot', icon: '🔥' },
    { id: 'notifications' as TabType, label: 'Alerts', icon: '🔔', badge: unreadCount },
  ];

  const renderMemberCard = (member: PulseMember, showOnlineIndicator = false) => (
    <Link
      key={member.id}
      href={`/profile/${member.id}`}
      className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gold/10 transition-all group"
    >
      <div className="relative">
        {member.photoUrl ? (
          <img
            src={member.photoUrl}
            alt={member.username}
            className="w-12 h-12 rounded-full object-cover border-2 border-gold/30 group-hover:border-gold transition-colors"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center border-2 border-gold/30 group-hover:border-gold transition-colors">
            <span className="text-gold font-heading text-lg">
              {member.username[0]?.toUpperCase()}
            </span>
          </div>
        )}
        {showOnlineIndicator && member.isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-darkBlue"></span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-offWhite font-body font-medium truncate group-hover:text-gold transition-colors">
          {member.username}
        </p>
        <p className="text-offWhite/50 text-xs font-body truncate">
          {member.location || member.accountType || 'Member'}
        </p>
      </div>
      {member.favoritesCount !== undefined && member.favoritesCount > 0 && (
        <span className="text-gold text-xs">❤️ {member.favoritesCount}</span>
      )}
    </Link>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'new':
        return (
          <div className="space-y-1">
            {newMembers.length > 0 ? (
              newMembers.map((member) => renderMemberCard(member))
            ) : (
              <p className="text-offWhite/50 text-center py-8 font-body">
                No new members this week
              </p>
            )}
          </div>
        );

      case 'online':
        if (!isVerified) {
          return (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gold" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-offWhite/70 font-body mb-2">Verified Members Only</p>
              <p className="text-offWhite/50 text-sm font-body">
                Get verified to see who's online
              </p>
            </div>
          );
        }
        return (
          <div className="space-y-1">
            {onlineMembers.length > 0 ? (
              onlineMembers.map((member) => renderMemberCard(member, true))
            ) : (
              <p className="text-offWhite/50 text-center py-8 font-body">
                No members online right now
              </p>
            )}
          </div>
        );

      case 'trending':
        return (
          <div className="space-y-1">
            {trendingMembers.length > 0 ? (
              trendingMembers.map((member) => renderMemberCard(member))
            ) : (
              <p className="text-offWhite/50 text-center py-8 font-body">
                No trending profiles yet
              </p>
            )}
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-1">
            {notifications.length > 0 ? (
              notifications.map((notif) => {
                const isProfileView = notif.type === 'profile_view';
                const href = isProfileView && notif.fromUserId 
                  ? `/profile/${notif.fromUserId}` 
                  : '/messages';
                
                return (
                  <Link
                    key={notif.id}
                    href={href}
                    className={`flex items-center space-x-3 p-3 rounded-xl hover:bg-gold/10 transition-all ${
                      !notif.read ? 'bg-gold/5 border-l-2 border-gold' : ''
                    }`}
                  >
                    <div className="relative">
                      {notif.fromPhotoUrl ? (
                        <img
                          src={notif.fromPhotoUrl}
                          alt={notif.fromUsername}
                          className="w-10 h-10 rounded-full object-cover border-2 border-gold/30"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center border-2 border-gold/30">
                          <span className="text-gold font-heading">
                            {notif.fromUsername[0]?.toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="absolute -bottom-1 -right-1 text-sm">
                        {isProfileView ? '👁️' : '💬'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-offWhite font-body text-sm">
                        <span className="font-medium text-gold">{notif.fromUsername}</span>
                        {isProfileView ? ' viewed your profile' : ' sent a message'}
                      </p>
                      <p className="text-offWhite/50 text-xs font-body">
                        {notif.createdAt?.toLocaleString([], { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                    {!notif.read && (
                      <span className="w-2 h-2 bg-gold rounded-full flex-shrink-0"></span>
                    )}
                  </Link>
                );
              })
            ) : (
              <p className="text-offWhite/50 text-center py-8 font-body">
                No new notifications
              </p>
            )}
          </div>
        );
    }
  };

  // Show toggle button even for non-logged-in users
  if (loading) return null;

  // Non-authenticated state - show button with login prompt
  if (!currentUser) {
    return (
      <>
        {/* Toggle Button for non-authenticated users */}
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-gold text-charcoal p-3 rounded-l-xl shadow-gold-glow hover:bg-gold-light transition-all"
          whileHover={{ x: -4 }}
          whileTap={{ scale: 0.95 }}
          data-testid="pulse-toggle-btn"
        >
          <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </motion.button>

        {/* Drawer for non-authenticated users */}
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-40"
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-darkBlue border-l border-gold/20 z-50 flex flex-col"
                data-testid="pulse-drawer"
              >
                <div className="p-6 border-b border-gold/20">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-heading text-gold">Community Pulse</h2>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="w-10 h-10 rounded-full hover:bg-gold/10 flex items-center justify-center transition-colors"
                    >
                      <svg className="w-6 h-6 text-offWhite" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-gold/30">
                      <svg className="w-10 h-10 text-gold" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-heading text-gold mb-2">Join the Community</h3>
                    <p className="text-offWhite/70 font-body mb-6">
                      Sign in to see who's online, discover new members, and connect with trending profiles.
                    </p>
                    <Link
                      href="/register"
                      className="inline-block px-8 py-3 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all"
                      onClick={() => setIsOpen(false)}
                    >
                      Join Now
                    </Link>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-gold text-charcoal p-3 rounded-l-xl shadow-gold-glow hover:bg-gold-light transition-all"
        whileHover={{ x: -4 }}
        whileTap={{ scale: 0.95 }}
        data-testid="pulse-toggle-btn"
      >
        <div className="flex flex-col items-center space-y-1">
          <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      </motion.button>

      {/* Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-charcoal/60 backdrop-blur-sm z-40"
            />

            {/* Drawer Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-darkBlue border-l border-gold/20 z-50 flex flex-col"
              data-testid="pulse-drawer"
            >
              {/* Header */}
              <div className="p-6 border-b border-gold/20">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-heading text-gold">Community Pulse</h2>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-10 h-10 rounded-full hover:bg-gold/10 flex items-center justify-center transition-colors"
                    data-testid="pulse-close-btn"
                  >
                    <svg className="w-6 h-6 text-offWhite" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex space-x-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-body transition-all relative ${
                        activeTab === tab.id
                          ? 'bg-gold text-charcoal'
                          : 'bg-gold/10 text-offWhite/70 hover:bg-gold/20'
                      }`}
                      data-testid={`pulse-tab-${tab.id}`}
                    >
                      <span className="mr-1">{tab.icon}</span>
                      <span className="hidden sm:inline">{tab.label}</span>
                      {tab.badge !== undefined && tab.badge > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                          {tab.badge > 9 ? '9+' : tab.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {renderContent()}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gold/20">
                <Link
                  href="/map"
                  className="block w-full py-3 text-center bg-gold/10 text-gold rounded-xl hover:bg-gold/20 transition-colors font-body"
                  onClick={() => setIsOpen(false)}
                >
                  Explore Map View →
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
