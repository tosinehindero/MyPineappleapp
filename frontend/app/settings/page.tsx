'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { unblockUser } from '@/lib/user-safety';
import { getCircleMembers, removeFromCircle, type CircleMember } from '@/lib/circle';
import { toast, Toaster } from 'sonner';

interface BlockedUser {
  id: string;
  blockedUserId: string;
  username: string;
  photoUrl: string | null;
  blockedAt: Date;
}

interface PrivacySettings {
  profileVisibility: 'public' | 'members' | 'connections';
  showOnlineStatus: boolean;
  allowMessages: 'everyone' | 'connections' | 'none';
  showLastActive: boolean;
}

interface NotificationSettings {
  messages: boolean;
  likes: boolean;
  comments: boolean;
  follows: boolean;
  marketplace: boolean;
  emailDigest: 'daily' | 'weekly' | 'never';
}

export default function SettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'privacy' | 'notifications' | 'circle' | 'blocked'>('privacy');
  
  // Blocked users
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [unblocking, setUnblocking] = useState<string | null>(null);
  
  // Circle members
  const [circleMembers, setCircleMembers] = useState<CircleMember[]>([]);
  const [loadingCircle, setLoadingCircle] = useState(false);
  const [removingFromCircle, setRemovingFromCircle] = useState<string | null>(null);
  
  // Privacy settings
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    profileVisibility: 'members',
    showOnlineStatus: true,
    allowMessages: 'everyone',
    showLastActive: true,
  });
  
  // Notification settings
  const [notifications, setNotifications] = useState<NotificationSettings>({
    messages: true,
    likes: true,
    comments: true,
    follows: true,
    marketplace: true,
    emailDigest: 'weekly',
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        await loadSettings(user.uid);
        await loadBlockedUsers(user.uid);
        await loadCircleMembers(user.uid);
      } else {
        router.push('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const loadSettings = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'members', userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.privacySettings) {
          setPrivacy(prev => ({ ...prev, ...data.privacySettings }));
        }
        if (data.notificationSettings) {
          setNotifications(prev => ({ ...prev, ...data.notificationSettings }));
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadBlockedUsers = async (userId: string) => {
    setLoadingBlocked(true);
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
      
      blocked.sort((a, b) => b.blockedAt.getTime() - a.blockedAt.getTime());
      setBlockedUsers(blocked);
    } catch (error) {
      console.error('Error loading blocked users:', error);
    } finally {
      setLoadingBlocked(false);
    }
  };

  const loadCircleMembers = async (userId: string) => {
    setLoadingCircle(true);
    try {
      const members = await getCircleMembers(userId);
      setCircleMembers(members);
    } catch (error) {
      console.error('Error loading circle members:', error);
    } finally {
      setLoadingCircle(false);
    }
  };

  const handleRemoveFromCircle = async (memberId: string) => {
    if (!currentUser) return;
    
    setRemovingFromCircle(memberId);
    try {
      const result = await removeFromCircle(currentUser.uid, memberId);
      if (result.success) {
        setCircleMembers(prev => prev.filter(m => m.memberId !== memberId));
        toast.success('Removed from your circle');
      } else {
        toast.error(result.error || 'Failed to remove from circle');
      }
    } catch (error) {
      console.error('Error removing from circle:', error);
      toast.error('Failed to remove from circle');
    } finally {
      setRemovingFromCircle(null);
    }
  };

  const handleSaveSettings = async () => {
    if (!currentUser) return;
    
    setSaving(true);
    try {
      await updateDoc(doc(db, 'members', currentUser.uid), {
        privacySettings: privacy,
        notificationSettings: notifications,
      });
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleUnblock = async (blockedUserId: string) => {
    if (!currentUser) return;
    
    setUnblocking(blockedUserId);
    try {
      const result = await unblockUser(currentUser.uid, blockedUserId);
      if (result.success) {
        setBlockedUsers(prev => prev.filter(u => u.blockedUserId !== blockedUserId));
        toast.success('User unblocked');
      }
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast.error('Failed to unblock user');
    } finally {
      setUnblocking(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal">
      <Toaster theme="dark" position="top-right" />
      
      {/* Header */}
      <div className="sticky top-0 z-40 bg-darkBlue/95 backdrop-blur-md border-b border-gold/20">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/feed" className="text-offWhite/60 hover:text-gold transition-colors">
                <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-2xl font-heading text-gold">Settings</h1>
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-4 py-2 bg-gold text-charcoal rounded-full font-semibold hover:shadow-gold-glow transition-all disabled:opacity-50 text-sm"
              data-testid="save-settings-btn"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-white/[0.03] rounded-xl p-1">
          {[
            { key: 'privacy', label: 'Privacy', icon: '🔒' },
            { key: 'notifications', label: 'Notifications', icon: '🔔' },
            { key: 'blocked', label: 'Blocked Users', icon: '🚫' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-body transition-all ${
                activeTab === tab.key
                  ? 'bg-gold/20 text-gold'
                  : 'text-offWhite/60 hover:text-gold'
              }`}
              data-testid={`tab-${tab.key}`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Privacy Settings */}
        {activeTab === 'privacy' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Profile Visibility */}
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-heading text-gold mb-4">Profile Visibility</h3>
              <p className="text-offWhite/60 text-sm font-body mb-4">
                Control who can see your profile and photos
              </p>
              <div className="space-y-3">
                {[
                  { value: 'public', label: 'Public', desc: 'Anyone can view your profile' },
                  { value: 'members', label: 'Members Only', desc: 'Only registered members can view' },
                  { value: 'connections', label: 'Connections Only', desc: 'Only your connections can view' },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center p-4 rounded-lg cursor-pointer transition-all ${
                      privacy.profileVisibility === option.value
                        ? 'bg-gold/10 border border-gold/30'
                        : 'bg-white/[0.02] border border-white/5 hover:border-gold/20'
                    }`}
                  >
                    <input
                      type="radio"
                      name="profileVisibility"
                      value={option.value}
                      checked={privacy.profileVisibility === option.value}
                      onChange={(e) => setPrivacy(prev => ({ ...prev, profileVisibility: e.target.value as any }))}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${
                      privacy.profileVisibility === option.value ? 'border-gold' : 'border-offWhite/30'
                    }`}>
                      {privacy.profileVisibility === option.value && (
                        <div className="w-2.5 h-2.5 rounded-full bg-gold" />
                      )}
                    </div>
                    <div>
                      <p className="text-offWhite font-body font-medium">{option.label}</p>
                      <p className="text-offWhite/50 text-xs">{option.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Message Permissions */}
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-heading text-gold mb-4">Who Can Message You</h3>
              <div className="space-y-3">
                {[
                  { value: 'everyone', label: 'Everyone', desc: 'Any member can send you messages' },
                  { value: 'connections', label: 'Connections Only', desc: 'Only people you follow' },
                  { value: 'none', label: 'No One', desc: 'Disable all incoming messages' },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center p-4 rounded-lg cursor-pointer transition-all ${
                      privacy.allowMessages === option.value
                        ? 'bg-gold/10 border border-gold/30'
                        : 'bg-white/[0.02] border border-white/5 hover:border-gold/20'
                    }`}
                  >
                    <input
                      type="radio"
                      name="allowMessages"
                      value={option.value}
                      checked={privacy.allowMessages === option.value}
                      onChange={(e) => setPrivacy(prev => ({ ...prev, allowMessages: e.target.value as any }))}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${
                      privacy.allowMessages === option.value ? 'border-gold' : 'border-offWhite/30'
                    }`}>
                      {privacy.allowMessages === option.value && (
                        <div className="w-2.5 h-2.5 rounded-full bg-gold" />
                      )}
                    </div>
                    <div>
                      <p className="text-offWhite font-body font-medium">{option.label}</p>
                      <p className="text-offWhite/50 text-xs">{option.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Activity Status */}
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-heading text-gold mb-4">Activity Status</h3>
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-white/[0.02] rounded-lg cursor-pointer">
                  <div>
                    <p className="text-offWhite font-body font-medium">Show Online Status</p>
                    <p className="text-offWhite/50 text-xs">Let others see when you're online</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrivacy(prev => ({ ...prev, showOnlineStatus: !prev.showOnlineStatus }))}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      privacy.showOnlineStatus ? 'bg-gold' : 'bg-white/20'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                      privacy.showOnlineStatus ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </label>
                
                <label className="flex items-center justify-between p-4 bg-white/[0.02] rounded-lg cursor-pointer">
                  <div>
                    <p className="text-offWhite font-body font-medium">Show Last Active</p>
                    <p className="text-offWhite/50 text-xs">Display when you were last online</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrivacy(prev => ({ ...prev, showLastActive: !prev.showLastActive }))}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      privacy.showLastActive ? 'bg-gold' : 'bg-white/20'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                      privacy.showLastActive ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </label>
              </div>
            </div>
          </motion.div>
        )}

        {/* Notification Settings */}
        {activeTab === 'notifications' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Push Notifications */}
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-heading text-gold mb-4">Push Notifications</h3>
              <p className="text-offWhite/60 text-sm font-body mb-4">
                Choose which notifications you'd like to receive
              </p>
              <div className="space-y-3">
                {[
                  { key: 'messages', label: 'New Messages', desc: 'When someone sends you a message' },
                  { key: 'likes', label: 'Likes & Reactions', desc: 'When someone reacts to your posts' },
                  { key: 'comments', label: 'Comments', desc: 'When someone comments on your posts' },
                  { key: 'follows', label: 'New Followers', desc: 'When someone starts following you' },
                  { key: 'marketplace', label: 'Marketplace', desc: 'Sales, purchases, and listing updates' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between p-4 bg-white/[0.02] rounded-lg cursor-pointer"
                  >
                    <div>
                      <p className="text-offWhite font-body font-medium">{item.label}</p>
                      <p className="text-offWhite/50 text-xs">{item.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key as keyof NotificationSettings] }))}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        notifications[item.key as keyof NotificationSettings] ? 'bg-gold' : 'bg-white/20'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                        notifications[item.key as keyof NotificationSettings] ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </label>
                ))}
              </div>
            </div>

            {/* Email Digest */}
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-heading text-gold mb-4">Email Digest</h3>
              <p className="text-offWhite/60 text-sm font-body mb-4">
                Receive a summary of your activity via email
              </p>
              <div className="space-y-3">
                {[
                  { value: 'daily', label: 'Daily', desc: 'Get updates every day' },
                  { value: 'weekly', label: 'Weekly', desc: 'Get a weekly summary' },
                  { value: 'never', label: 'Never', desc: 'Don\'t send email digests' },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center p-4 rounded-lg cursor-pointer transition-all ${
                      notifications.emailDigest === option.value
                        ? 'bg-gold/10 border border-gold/30'
                        : 'bg-white/[0.02] border border-white/5 hover:border-gold/20'
                    }`}
                  >
                    <input
                      type="radio"
                      name="emailDigest"
                      value={option.value}
                      checked={notifications.emailDigest === option.value}
                      onChange={(e) => setNotifications(prev => ({ ...prev, emailDigest: e.target.value as any }))}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${
                      notifications.emailDigest === option.value ? 'border-gold' : 'border-offWhite/30'
                    }`}>
                      {notifications.emailDigest === option.value && (
                        <div className="w-2.5 h-2.5 rounded-full bg-gold" />
                      )}
                    </div>
                    <div>
                      <p className="text-offWhite font-body font-medium">{option.label}</p>
                      <p className="text-offWhite/50 text-xs">{option.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Blocked Users */}
        {activeTab === 'blocked' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Info Banner */}
            <div className="p-4 bg-white/[0.03] border border-white/10 rounded-xl">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-offWhite/80 text-sm font-body">
                  Blocked users cannot see your profile, message you, or find you in search results. 
                  Their posts will be hidden from your feed.
                </p>
              </div>
            </div>

            {/* Blocked Users List */}
            {loadingBlocked ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto"></div>
              </div>
            ) : blockedUsers.length === 0 ? (
              <div className="text-center py-12 bg-white/[0.03] border border-white/10 rounded-xl">
                <div className="w-16 h-16 bg-white/[0.03] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-offWhite/20" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
                <h3 className="text-lg font-heading text-offWhite/60 mb-2">No Blocked Users</h3>
                <p className="text-offWhite/40 text-sm font-body">
                  You haven't blocked anyone yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-offWhite/60 text-sm font-body">
                  {blockedUsers.length} blocked user{blockedUsers.length !== 1 ? 's' : ''}
                </p>
                
                {blockedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex items-center justify-between"
                    data-testid={`blocked-user-${user.blockedUserId}`}
                  >
                    <div className="flex items-center space-x-4">
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
                      <div>
                        <Link 
                          href={`/profile/${user.blockedUserId}`}
                          className="text-offWhite font-body font-semibold hover:text-gold transition-colors"
                        >
                          {user.username}
                        </Link>
                        <p className="text-offWhite/40 text-xs font-body">
                          Blocked {user.blockedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleUnblock(user.blockedUserId)}
                      disabled={unblocking === user.blockedUserId}
                      className="px-4 py-2 bg-white/[0.05] border border-white/10 rounded-full text-sm font-body text-offWhite/80 hover:border-gold/30 hover:text-gold transition-all disabled:opacity-50"
                      data-testid={`unblock-btn-${user.blockedUserId}`}
                    >
                      {unblocking === user.blockedUserId ? 'Unblocking...' : 'Unblock'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Account Actions */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <h3 className="text-lg font-heading text-gold mb-4">Account</h3>
          <div className="space-y-3">
            <Link
              href="/faq"
              className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/10 rounded-xl hover:border-gold/20 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-offWhite/60" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-offWhite font-body">Help & FAQ</span>
              </div>
              <svg className="w-5 h-5 text-offWhite/40" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            
            <button
              onClick={async () => {
                try {
                  const { signOut } = await import('firebase/auth');
                  await signOut(auth);
                  router.push('/');
                } catch (error) {
                  console.error('Sign out error:', error);
                }
              }}
              className="flex items-center justify-between w-full p-4 bg-red-500/10 border border-red-500/20 rounded-xl hover:border-red-500/40 transition-colors"
              data-testid="logout-btn"
            >
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-red-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="text-red-400 font-body">Sign Out</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
