'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { toast, Toaster } from 'sonner';
import { useSubscription } from '@/lib/subscription';
import {
  getPublicGroups,
  getUserGroups,
  canCreateGroup,
  canJoinGroup,
  joinGroup,
  type Group,
} from '@/lib/groups';

type TabType = 'discover' | 'my-groups';

export default function GroupsPage() {
  const router = useRouter();
  const { subscription, loading: subLoading } = useSubscription();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('discover');
  const [publicGroups, setPublicGroups] = useState<Group[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [joiningGroup, setJoiningGroup] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      setCurrentUser(user);

      // Get user profile
      const userDoc = await getDoc(doc(db, 'members', user.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
      }

      // Load groups
      const [publicGroupsData, myGroupsData] = await Promise.all([
        getPublicGroups(),
        getUserGroups(user.uid),
      ]);

      setPublicGroups(publicGroupsData);
      setMyGroups(myGroupsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleJoinGroup = async (groupId: string) => {
    if (!currentUser) return;

    // Check if user has at least Basic tier
    if (!canJoinGroup(subscription?.tier || 'free')) {
      toast.error('Upgrade to Basic or Premium to join groups');
      router.push('/pricing');
      return;
    }

    setJoiningGroup(groupId);
    const result = await joinGroup(groupId, currentUser.uid);

    if (result.success) {
      if (result.status === 'pending') {
        toast.success('Join request sent! Waiting for approval.');
      } else {
        toast.success('Successfully joined the group!');
        // Refresh my groups
        const updatedMyGroups = await getUserGroups(currentUser.uid);
        setMyGroups(updatedMyGroups);
      }
    } else {
      toast.error(result.error || 'Failed to join group');
    }

    setJoiningGroup(null);
  };

  const filteredPublicGroups = publicGroups.filter((group) => {
    if (!searchQuery) return true;
    return (
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const isGroupJoined = (groupId: string) => {
    return myGroups.some((g) => g.id === groupId);
  };

  const canUserCreateGroup = canCreateGroup(subscription?.tier || 'free', userProfile?.isFounder);

  if (loading || subLoading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal">
      <Toaster theme="dark" position="top-right" />

      {/* Hero Header */}
      <div className="relative bg-gradient-to-b from-darkBlue to-charcoal py-12 px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gold/5 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <Link href="/feed" className="text-gold/60 hover:text-gold text-sm font-body mb-2 inline-block">
                ← Back to Feed
              </Link>
              <h1 className="text-4xl md:text-5xl font-heading text-gold mb-2">Inner Circles</h1>
              <p className="text-offWhite/60 font-body text-lg">
                Join exclusive communities within the PineapplePlay network
              </p>
            </div>

            {canUserCreateGroup ? (
              <Link
                href="/groups/create"
                className="flex items-center gap-2 px-6 py-3 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all"
                data-testid="create-group-btn"
              >
                <svg className="w-5 h-5" fill="none" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Create Circle
              </Link>
            ) : (
              <div className="text-center md:text-right">
                <p className="text-offWhite/40 text-sm font-body mb-2">Premium or Founder required to create</p>
                <Link
                  href="/pricing"
                  className="text-gold text-sm font-body hover:underline"
                >
                  Upgrade Now →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs & Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Tab Navigation */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setActiveTab('discover')}
            className={`px-6 py-2 rounded-full font-body transition-all ${
              activeTab === 'discover'
                ? 'bg-gold text-charcoal'
                : 'bg-white/5 text-offWhite/60 hover:bg-white/10'
            }`}
            data-testid="tab-discover"
          >
            Discover
          </button>
          <button
            onClick={() => setActiveTab('my-groups')}
            className={`px-6 py-2 rounded-full font-body transition-all ${
              activeTab === 'my-groups'
                ? 'bg-gold text-charcoal'
                : 'bg-white/5 text-offWhite/60 hover:bg-white/10'
            }`}
            data-testid="tab-my-groups"
          >
            My Circles ({myGroups.length})
          </button>
        </div>

        {/* Search (for Discover tab) */}
        {activeTab === 'discover' && (
          <div className="mb-8">
            <div className="relative max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search circles..."
                className="w-full pl-12 pr-4 py-3 bg-darkBlue/50 border border-gold/20 rounded-xl text-offWhite font-body focus:outline-none focus:border-gold"
                data-testid="search-groups"
              />
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-offWhite/40"
                fill="none"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        )}

        {/* Discover Tab */}
        {activeTab === 'discover' && (
          <div>
            {filteredPublicGroups.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-gold" fill="none" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-heading text-gold mb-2">No Circles Found</h2>
                <p className="text-offWhite/60 font-body mb-6">
                  {searchQuery ? 'Try a different search term' : 'Be the first to create a circle!'}
                </p>
                {canUserCreateGroup && (
                  <Link
                    href="/groups/create"
                    className="inline-block px-6 py-3 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all"
                  >
                    Create First Circle
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPublicGroups.map((group, index) => (
                  <motion.div
                    key={group.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group relative bg-darkBlue/40 border border-gold/10 rounded-2xl overflow-hidden hover:border-gold/30 transition-all"
                    data-testid={`group-card-${group.id}`}
                  >
                    {/* Cover Image */}
                    <div className="aspect-[2/1] bg-gradient-to-br from-gold/20 to-charcoal relative">
                      {group.coverImage ? (
                        <img
                          src={group.coverImage}
                          alt={group.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center">
                            <span className="text-3xl font-heading text-gold">
                              {group.name[0]?.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Privacy Badge */}
                      <div className="absolute top-3 right-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-body ${
                          group.privacy === 'public'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {group.privacy === 'public' ? 'Public' : 'Private'}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h3 className="text-xl font-heading text-offWhite mb-2 line-clamp-1">
                        {group.name}
                      </h3>
                      <p className="text-offWhite/50 text-sm font-body mb-4 line-clamp-2">
                        {group.description || 'No description'}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {group.ownerPhoto ? (
                            <img
                              src={group.ownerPhoto}
                              alt={group.ownerUsername}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center">
                              <span className="text-xs text-gold">{group.ownerUsername[0]}</span>
                            </div>
                          )}
                          <span className="text-offWhite/40 text-sm font-body">
                            {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {isGroupJoined(group.id) ? (
                          <Link
                            href={`/groups/${group.id}`}
                            className="px-4 py-2 bg-gold/20 text-gold text-sm font-semibold rounded-full hover:bg-gold/30 transition-colors"
                          >
                            Enter
                          </Link>
                        ) : (
                          <button
                            onClick={() => handleJoinGroup(group.id)}
                            disabled={joiningGroup === group.id}
                            className="px-4 py-2 bg-gold text-charcoal text-sm font-semibold rounded-full hover:shadow-gold-glow transition-all disabled:opacity-50"
                          >
                            {joiningGroup === group.id ? 'Joining...' : 'Join'}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Groups Tab */}
        {activeTab === 'my-groups' && (
          <div>
            {myGroups.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-gold" fill="none" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-heading text-gold mb-2">No Circles Yet</h2>
                <p className="text-offWhite/60 font-body mb-6">
                  Join a circle or create your own to get started
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => setActiveTab('discover')}
                    className="px-6 py-3 border border-gold/30 text-gold rounded-full hover:border-gold/60 transition-colors"
                  >
                    Browse Circles
                  </button>
                  {canUserCreateGroup && (
                    <Link
                      href="/groups/create"
                      className="px-6 py-3 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all"
                    >
                      Create Circle
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myGroups.map((group, index) => (
                  <motion.div
                    key={group.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={`/groups/${group.id}`}
                      className="block group relative bg-darkBlue/40 border border-gold/10 rounded-2xl overflow-hidden hover:border-gold/30 transition-all"
                      data-testid={`my-group-${group.id}`}
                    >
                      {/* Cover Image */}
                      <div className="aspect-[2/1] bg-gradient-to-br from-gold/20 to-charcoal relative">
                        {group.coverImage ? (
                          <img
                            src={group.coverImage}
                            alt={group.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-16 h-16 rounded-full bg-gold/20 flex items-center justify-center">
                              <span className="text-3xl font-heading text-gold">
                                {group.name[0]?.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {/* Owner Badge */}
                        {group.ownerId === currentUser?.uid && (
                          <div className="absolute top-3 left-3">
                            <span className="px-2 py-1 bg-gold text-charcoal text-xs font-semibold rounded-full">
                              Owner
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        <h3 className="text-xl font-heading text-offWhite mb-2 line-clamp-1">
                          {group.name}
                        </h3>
                        <div className="flex items-center justify-between">
                          <span className="text-offWhite/40 text-sm font-body">
                            {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
                          </span>
                          <span className="text-gold text-sm font-body group-hover:translate-x-1 transition-transform">
                            Enter →
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
