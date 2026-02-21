'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { toast, Toaster } from 'sonner';
import Link from 'next/link';
import VettingGuard from '@/components/VettingGuard';
import {
  createPost,
  getPosts,
  reactToPost,
  getUserReactions,
  addComment,
  getComments,
  getUpcomingEvents,
  getFeaturedListings,
  type Post,
  type Comment,
} from './actions';

type FilterCategory = 'all' | 'travel' | 'events' | 'marketplace';

interface UserProfile {
  uid: string;
  username: string;
  photoUrl: string | null;
  isVerified: boolean;
  accountType: string;
}

export default function FeedPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [userReactions, setUserReactions] = useState<{ [postId: string]: { fire: boolean; pineapple: boolean } }>({});
  
  // Post creation state
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImages, setNewPostImages] = useState<string[]>([]);
  const [newPostPrivacy, setNewPostPrivacy] = useState<'all' | 'circle'>('all');
  const [newPostCategory, setNewPostCategory] = useState<FilterCategory>('all');
  const [posting, setPosting] = useState(false);

  // Sidebar data
  const [upcomingEvents, setUpcomingEvents] = useState<Array<{ id: string; title: string; date: Date; location: string }>>([]);
  const [featuredListings, setFeaturedListings] = useState<Array<{ id: string; title: string; price: number; image: string | null }>>([]);

  // Comments state
  const [expandedComments, setExpandedComments] = useState<{ [postId: string]: boolean }>({});
  const [postComments, setPostComments] = useState<{ [postId: string]: Comment[] }>({});
  const [commentInputs, setCommentInputs] = useState<{ [postId: string]: string }>({});
  const [loadingComments, setLoadingComments] = useState<{ [postId: string]: boolean }>({});

  // Image carousel state
  const [activeImageIndex, setActiveImageIndex] = useState<{ [postId: string]: number }>({});

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Auth and profile loading
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const userDoc = await getDoc(doc(db, 'members', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserProfile({
            uid: user.uid,
            username: data.username || user.email?.split('@')[0] || 'Member',
            photoUrl: data.photoUrls?.[0] || null,
            isVerified: data.isVerified === true,
            accountType: data.accountType || 'Member',
          });
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Load initial posts and sidebar data
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      
      try {
        const [postsResult, eventsResult, listingsResult] = await Promise.all([
          getPosts(currentUser?.uid || '', activeFilter),
          getUpcomingEvents(),
          getFeaturedListings(),
        ]);

        if (postsResult.success) {
          setPosts(postsResult.posts);
          setHasMore(postsResult.hasMore);

          // Load user reactions
          if (currentUser && postsResult.posts.length > 0) {
            const reactions = await getUserReactions(
              currentUser.uid,
              postsResult.posts.map((p) => p.id)
            );
            setUserReactions(reactions);
          }
        }

        if (eventsResult.success) {
          setUpcomingEvents(eventsResult.events);
        }

        if (listingsResult.success) {
          setFeaturedListings(listingsResult.listings);
        }
      } catch (error) {
        console.error('Error loading feed data:', error);
      }

      setLoading(false);
    };

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log('Feed loading timeout - forcing load complete');
        setLoading(false);
      }
    }, 8000);

    if (currentUser !== undefined) {
      loadInitialData();
    } else {
      // If no user after 3 seconds, stop loading
      setTimeout(() => setLoading(false), 3000);
    }

    return () => clearTimeout(timeoutId);
  }, [currentUser, activeFilter]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, posts]);

  const loadMorePosts = async () => {
    if (!hasMore || loadingMore || posts.length === 0) return;

    setLoadingMore(true);
    const lastPost = posts[posts.length - 1];
    
    const result = await getPosts(
      currentUser?.uid || '',
      activeFilter,
      lastPost.createdAt,
      10
    );

    if (result.success) {
      setPosts((prev) => [...prev, ...result.posts]);
      setHasMore(result.hasMore);

      // Load reactions for new posts
      if (currentUser && result.posts.length > 0) {
        const reactions = await getUserReactions(
          currentUser.uid,
          result.posts.map((p) => p.id)
        );
        setUserReactions((prev) => ({ ...prev, ...reactions }));
      }
    }

    setLoadingMore(false);
  };

  const handleCreatePost = async () => {
    if (!currentUser || !newPostContent.trim()) return;

    setPosting(true);
    const result = await createPost(
      currentUser.uid,
      newPostContent,
      newPostImages,
      newPostPrivacy,
      newPostCategory === 'all' ? 'general' : newPostCategory
    );

    if (result.success) {
      toast.success('Whisper posted successfully!');
      setNewPostContent('');
      setNewPostImages([]);
      setNewPostPrivacy('all');
      setNewPostCategory('all');
      
      // Reload posts
      const postsResult = await getPosts(currentUser.uid, activeFilter);
      if (postsResult.success) {
        setPosts(postsResult.posts);
        setHasMore(postsResult.hasMore);
      }
    } else {
      toast.error('Failed to post whisper');
    }
    setPosting(false);
  };

  const handleReaction = async (postId: string, type: 'fire' | 'pineapple') => {
    if (!currentUser) return;

    // Optimistic update
    const wasReacted = userReactions[postId]?.[type] || false;
    setUserReactions((prev) => ({
      ...prev,
      [postId]: { ...prev[postId], [type]: !wasReacted },
    }));

    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              reactions: {
                ...post.reactions,
                [type]: post.reactions[type] + (wasReacted ? -1 : 1),
              },
            }
          : post
      )
    );

    await reactToPost(postId, type, currentUser.uid);
  };

  const toggleComments = async (postId: string) => {
    const isExpanded = expandedComments[postId];
    setExpandedComments((prev) => ({ ...prev, [postId]: !isExpanded }));

    if (!isExpanded && !postComments[postId]) {
      setLoadingComments((prev) => ({ ...prev, [postId]: true }));
      const result = await getComments(postId);
      if (result.success) {
        setPostComments((prev) => ({ ...prev, [postId]: result.comments }));
      }
      setLoadingComments((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!currentUser || !commentInputs[postId]?.trim()) return;

    const result = await addComment(postId, currentUser.uid, commentInputs[postId]);
    if (result.success) {
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
      // Reload comments
      const commentsResult = await getComments(postId);
      if (commentsResult.success) {
        setPostComments((prev) => ({ ...prev, [postId]: commentsResult.comments }));
      }
      // Update comment count
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, commentCount: post.commentCount + 1 }
            : post
        )
      );
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const filterOptions: { key: FilterCategory; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: '🌟' },
    { key: 'travel', label: 'Travel', icon: '✈️' },
    { key: 'events', label: 'Events', icon: '🎭' },
    { key: 'marketplace', label: 'Marketplace', icon: '🛍️' },
  ];

  if (loading && posts.length === 0) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-offWhite/60 font-body">Loading feed...</p>
        </div>
      </div>
    );
  }

  return (
    <VettingGuard>
      <div className="min-h-screen bg-charcoal">
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: '#0F172A',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              color: '#F8FAFC',
            },
          }}
        />

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Sidebar - User Profile Snapshot */}
            <aside className="hidden lg:block lg:col-span-3">
              <div className="sticky top-24 space-y-6">
                {/* User Profile Card */}
                {userProfile && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl shadow-black/20"
                  >
                    <Link href={`/profile/${userProfile.uid}`} className="block">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-full border-2 border-gold overflow-hidden bg-gold/20">
                            {userProfile.photoUrl ? (
                              <img
                                src={userProfile.photoUrl}
                                alt={userProfile.username}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl font-heading text-gold">
                                {userProfile.username[0]?.toUpperCase()}
                              </div>
                            )}
                          </div>
                          {userProfile.isVerified && (
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gold rounded-full flex items-center justify-center text-sm border-2 border-darkBlue">
                              🍍
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="text-offWhite font-heading text-lg flex items-center">
                            {userProfile.username}
                            {userProfile.isVerified && (
                              <span className="ml-2 text-gold text-sm">✓</span>
                            )}
                          </h3>
                          <p className="text-offWhite/50 text-sm font-body">{userProfile.accountType}</p>
                        </div>
                      </div>
                    </Link>

                    <div className="pt-4 border-t border-gold/10 space-y-2">
                      <Link
                        href={`/profile/${userProfile.uid}`}
                        className="flex items-center space-x-2 text-offWhite/70 hover:text-gold transition-colors text-sm font-body"
                      >
                        <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>View Profile</span>
                      </Link>
                      <Link
                        href="/messages"
                        className="flex items-center space-x-2 text-offWhite/70 hover:text-gold transition-colors text-sm font-body"
                      >
                        <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span>Messages</span>
                      </Link>
                      <Link
                        href="/marketplace"
                        className="flex items-center space-x-2 text-offWhite/70 hover:text-gold transition-colors text-sm font-body"
                      >
                        <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        <span>Marketplace</span>
                      </Link>
                    </div>
                  </motion.div>
                )}

                {/* Quick Stats */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl shadow-black/20"
                >
                  <h3 className="text-gold font-heading text-sm mb-4">Your Activity</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-heading text-offWhite">{posts.filter(p => p.authorId === userProfile?.uid).length}</p>
                      <p className="text-offWhite/50 text-xs font-body">Posts</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-heading text-offWhite">-</p>
                      <p className="text-offWhite/50 text-xs font-body">Connections</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </aside>

            {/* Main Feed Column */}
            <main className="lg:col-span-6 space-y-6">
              {/* Filter Chips */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap gap-2"
              >
                {filterOptions.map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setActiveFilter(filter.key)}
                    className={`px-4 py-2 rounded-full text-sm font-body transition-all flex items-center space-x-2 backdrop-blur-md ${
                      activeFilter === filter.key
                        ? 'bg-gold text-charcoal shadow-lg shadow-gold/20'
                        : 'bg-white/5 text-offWhite/70 hover:bg-white/10 hover:text-gold border border-white/10'
                    }`}
                    data-testid={`filter-${filter.key}`}
                  >
                    <span>{filter.icon}</span>
                    <span>{filter.label}</span>
                  </button>
                ))}
              </motion.div>

              {/* Whisper Box - Post Creation */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl shadow-black/20"
                data-testid="whisper-box"
              >
                <div className="flex items-start space-x-4">
                  {userProfile?.photoUrl ? (
                    <img
                      src={userProfile.photoUrl}
                      alt={userProfile.username}
                      className="w-12 h-12 rounded-full border-2 border-gold/40 object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full border-2 border-gold/40 bg-gold/20 flex items-center justify-center text-gold font-heading">
                      {userProfile?.username?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="flex-1">
                    <textarea
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder="Share a whisper with the community..."
                      rows={3}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-offWhite font-body placeholder-offWhite/30 focus:outline-none focus:border-gold/50 focus:bg-white/[0.05] transition-all resize-none"
                      data-testid="whisper-input"
                    />

                    {/* Post Options */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
                      <div className="flex items-center space-x-4">
                        {/* Privacy Toggle */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setNewPostPrivacy('all')}
                            className={`px-3 py-1.5 rounded-full text-xs font-body transition-all backdrop-blur-sm ${
                              newPostPrivacy === 'all'
                                ? 'bg-gold text-charcoal shadow-lg shadow-gold/20'
                                : 'bg-white/[0.03] border border-white/10 text-offWhite/60 hover:text-gold hover:border-gold/30'
                            }`}
                            data-testid="privacy-all"
                          >
                            All Members
                          </button>
                          <button
                            onClick={() => setNewPostPrivacy('circle')}
                            className={`px-3 py-1.5 rounded-full text-xs font-body transition-all backdrop-blur-sm ${
                              newPostPrivacy === 'circle'
                                ? 'bg-gold text-charcoal shadow-lg shadow-gold/20'
                                : 'bg-white/[0.03] border border-white/10 text-offWhite/60 hover:text-gold hover:border-gold/30'
                            }`}
                            data-testid="privacy-circle"
                          >
                            My Circle
                          </button>
                        </div>

                        {/* Category Selector */}
                        <select
                          value={newPostCategory}
                          onChange={(e) => setNewPostCategory(e.target.value as FilterCategory)}
                          className="bg-white/[0.03] border border-white/10 rounded-lg px-3 py-1.5 text-xs font-body text-offWhite/80 focus:outline-none focus:border-gold/50 backdrop-blur-sm cursor-pointer"
                        >
                          <option value="all">General</option>
                          <option value="travel">Travel</option>
                          <option value="events">Events</option>
                          <option value="marketplace">Marketplace</option>
                        </select>
                      </div>

                      <button
                        onClick={handleCreatePost}
                        disabled={posting || !newPostContent.trim()}
                        className="px-6 py-2 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        data-testid="whisper-submit"
                      >
                        {posting ? (
                          <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span>Posting...</span>
                          </>
                        ) : (
                          <>
                            <span>🍍</span>
                            <span>Whisper</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Posts Feed */}
              <div className="space-y-6">
                <AnimatePresence>
                  {posts.map((post, index) => (
                    <motion.article
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-black/20 hover:border-white/20 hover:bg-white/[0.05] transition-all duration-300"
                      data-testid={`post-${post.id}`}
                    >
                      {/* Post Header */}
                      <div className="p-6 pb-4">
                        <div className="flex items-center justify-between">
                          <Link
                            href={`/profile/${post.authorId}`}
                            className="flex items-center space-x-3"
                          >
                            <div className="relative">
                              {post.authorPhoto ? (
                                <img
                                  src={post.authorPhoto}
                                  alt={post.authorUsername}
                                  className="w-12 h-12 rounded-full border-2 border-gold/40 object-cover"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full border-2 border-gold/40 bg-gold/20 flex items-center justify-center text-gold font-heading">
                                  {post.authorUsername[0]?.toUpperCase()}
                                </div>
                              )}
                              {post.authorVerified && (
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gold rounded-full flex items-center justify-center text-xs border-2 border-darkBlue">
                                  🍍
                                </div>
                              )}
                            </div>
                            <div>
                              <h4 className="text-offWhite font-body font-semibold flex items-center">
                                {post.authorUsername}
                                {post.authorVerified && (
                                  <span className="ml-1 text-gold text-sm">✓</span>
                                )}
                              </h4>
                              <p className="text-offWhite/50 text-xs font-body">
                                {formatTimeAgo(post.createdAt)}
                                {post.category !== 'general' && (
                                  <span className="ml-2 px-2 py-0.5 bg-gold/10 text-gold rounded-full text-xs">
                                    {post.category}
                                  </span>
                                )}
                              </p>
                            </div>
                          </Link>
                          <div className="flex items-center space-x-2">
                            {post.privacy === 'circle' && (
                              <span className="text-offWhite/40 text-xs flex items-center space-x-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                                <span>Circle</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Post Content */}
                        <p className="mt-4 text-offWhite/90 font-body leading-relaxed whitespace-pre-wrap">
                          {post.content}
                        </p>
                      </div>

                      {/* Image Carousel */}
                      {post.images.length > 0 && (
                        <div className="relative">
                          <div className="aspect-video bg-charcoal">
                            <img
                              src={post.images[activeImageIndex[post.id] || 0]}
                              alt="Post image"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          {post.images.length > 1 && (
                            <>
                              <button
                                onClick={() =>
                                  setActiveImageIndex((prev) => ({
                                    ...prev,
                                    [post.id]: Math.max(0, (prev[post.id] || 0) - 1),
                                  }))
                                }
                                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-charcoal/80 rounded-full flex items-center justify-center text-offWhite hover:bg-gold hover:text-charcoal transition-colors"
                              >
                                ←
                              </button>
                              <button
                                onClick={() =>
                                  setActiveImageIndex((prev) => ({
                                    ...prev,
                                    [post.id]: Math.min(post.images.length - 1, (prev[post.id] || 0) + 1),
                                  }))
                                }
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-charcoal/80 rounded-full flex items-center justify-center text-offWhite hover:bg-gold hover:text-charcoal transition-colors"
                              >
                                →
                              </button>
                              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                                {post.images.map((_, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() =>
                                      setActiveImageIndex((prev) => ({ ...prev, [post.id]: idx }))
                                    }
                                    className={`w-2 h-2 rounded-full transition-all ${
                                      (activeImageIndex[post.id] || 0) === idx
                                        ? 'bg-gold w-4'
                                        : 'bg-offWhite/50 hover:bg-offWhite'
                                    }`}
                                  />
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Reactions & Comments */}
                      <div className="p-6 pt-4 border-t border-gold/10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            {/* Fire Reaction */}
                            <button
                              onClick={() => handleReaction(post.id, 'fire')}
                              className={`flex items-center space-x-2 px-3 py-1.5 rounded-full transition-all backdrop-blur-sm ${
                                userReactions[post.id]?.fire
                                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                  : 'bg-white/[0.03] text-offWhite/60 hover:bg-orange-500/10 hover:text-orange-400 border border-white/10'
                              }`}
                              data-testid={`reaction-fire-${post.id}`}
                            >
                              <span className="text-lg">🔥</span>
                              <span className="text-sm font-body">{post.reactions.fire}</span>
                            </button>

                            {/* Pineapple Reaction */}
                            <button
                              onClick={() => handleReaction(post.id, 'pineapple')}
                              className={`flex items-center space-x-2 px-3 py-1.5 rounded-full transition-all backdrop-blur-sm ${
                                userReactions[post.id]?.pineapple
                                  ? 'bg-gold/20 text-gold border border-gold/30'
                                  : 'bg-white/[0.03] text-offWhite/60 hover:bg-gold/10 hover:text-gold border border-white/10'
                              }`}
                              data-testid={`reaction-pineapple-${post.id}`}
                            >
                              <span className="text-lg">🍍</span>
                              <span className="text-sm font-body">{post.reactions.pineapple}</span>
                            </button>

                            {/* Comments Toggle */}
                            <button
                              onClick={() => toggleComments(post.id)}
                              className={`flex items-center space-x-2 px-3 py-1.5 rounded-full transition-all backdrop-blur-sm ${
                                expandedComments[post.id]
                                  ? 'bg-gold/20 text-gold border border-gold/30'
                                  : 'bg-white/[0.03] text-offWhite/60 hover:bg-gold/10 hover:text-gold border border-white/10'
                              }`}
                              data-testid={`comments-toggle-${post.id}`}
                            >
                              <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              <span className="text-sm font-body">{post.commentCount}</span>
                            </button>
                          </div>

                          {/* Share */}
                          <button className="text-offWhite/40 hover:text-gold transition-colors">
                            <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                              <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                          </button>
                        </div>

                        {/* Comments Section */}
                        <AnimatePresence>
                          {expandedComments[post.id] && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-4 pt-4 border-t border-gold/10"
                            >
                              {loadingComments[post.id] ? (
                                <div className="text-center py-4">
                                  <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto"></div>
                                </div>
                              ) : (
                                <>
                                  {/* Comment Input */}
                                  <div className="flex items-start space-x-3 mb-4">
                                    {userProfile?.photoUrl ? (
                                      <img
                                        src={userProfile.photoUrl}
                                        alt=""
                                        className="w-8 h-8 rounded-full border border-gold/30 object-cover"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full border border-gold/30 bg-gold/20 flex items-center justify-center text-gold text-sm font-heading">
                                        {userProfile?.username?.[0]?.toUpperCase()}
                                      </div>
                                    )}
                                    <div className="flex-1 flex space-x-2">
                                      <input
                                        type="text"
                                        value={commentInputs[post.id] || ''}
                                        onChange={(e) =>
                                          setCommentInputs((prev) => ({
                                            ...prev,
                                            [post.id]: e.target.value,
                                          }))
                                        }
                                        onKeyPress={(e) => {
                                          if (e.key === 'Enter') {
                                            handleAddComment(post.id);
                                          }
                                        }}
                                        placeholder="Write a comment..."
                                        className="flex-1 bg-white/[0.03] border border-white/10 rounded-full px-4 py-2 text-sm text-offWhite font-body placeholder-offWhite/30 focus:outline-none focus:border-gold/50 focus:bg-white/[0.05] backdrop-blur-sm transition-all"
                                      />
                                      <button
                                        onClick={() => handleAddComment(post.id)}
                                        disabled={!commentInputs[post.id]?.trim()}
                                        className="px-4 py-2 bg-gold text-charcoal rounded-full text-sm font-semibold disabled:opacity-50"
                                      >
                                        Post
                                      </button>
                                    </div>
                                  </div>

                                  {/* Comments List */}
                                  <div className="space-y-3 max-h-80 overflow-y-auto">
                                    {(postComments[post.id] || []).map((comment) => (
                                      <div key={comment.id} className="flex items-start space-x-3">
                                        <Link href={`/profile/${comment.authorId}`}>
                                          {comment.authorPhoto ? (
                                            <img
                                              src={comment.authorPhoto}
                                              alt=""
                                              className="w-8 h-8 rounded-full border border-gold/30 object-cover"
                                            />
                                          ) : (
                                            <div className="w-8 h-8 rounded-full border border-gold/30 bg-gold/20 flex items-center justify-center text-gold text-sm font-heading">
                                              {comment.authorUsername[0]?.toUpperCase()}
                                            </div>
                                          )}
                                        </Link>
                                        <div className="flex-1 bg-white/[0.03] backdrop-blur-sm rounded-xl px-4 py-2 border border-white/5">
                                          <div className="flex items-center space-x-2">
                                            <Link
                                              href={`/profile/${comment.authorId}`}
                                              className="text-offWhite font-body text-sm font-semibold hover:text-gold"
                                            >
                                              {comment.authorUsername}
                                              {comment.authorVerified && (
                                                <span className="ml-1 text-gold text-xs">🍍</span>
                                              )}
                                            </Link>
                                            <span className="text-offWhite/40 text-xs">
                                              {formatTimeAgo(comment.createdAt)}
                                            </span>
                                          </div>
                                          <p className="text-offWhite/80 font-body text-sm mt-1">
                                            {comment.content}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                    {(postComments[post.id] || []).length === 0 && (
                                      <p className="text-offWhite/40 text-sm text-center py-4 font-body">
                                        No comments yet. Be the first to comment!
                                      </p>
                                    )}
                                  </div>
                                </>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.article>
                  ))}
                </AnimatePresence>

                {/* Empty State */}
                {posts.length === 0 && !loading && (
                  <div className="text-center py-16">
                    <span className="text-6xl mb-4 block">🍍</span>
                    <h3 className="text-xl font-heading text-gold mb-2">No whispers yet</h3>
                    <p className="text-offWhite/60 font-body">Be the first to share something with the community!</p>
                  </div>
                )}

                {/* Load More Trigger */}
                <div ref={loadMoreRef} className="py-8">
                  {loadingMore && (
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto"></div>
                    </div>
                  )}
                  {!hasMore && posts.length > 0 && (
                    <p className="text-center text-offWhite/40 font-body text-sm">
                      You've reached the end 🍍
                    </p>
                  )}
                </div>
              </div>
            </main>

            {/* Right Sidebar */}
            <aside className="hidden lg:block lg:col-span-3">
              <div className="sticky top-24 space-y-6">
                {/* Upcoming VIP Events */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl shadow-black/20"
                >
                  <h3 className="text-gold font-heading text-lg mb-4 flex items-center space-x-2">
                    <span>🎭</span>
                    <span>VIP Events</span>
                  </h3>
                  <div className="space-y-4">
                    {upcomingEvents.length > 0 ? (
                      upcomingEvents.map((event) => (
                        <div key={event.id} className="group cursor-pointer">
                          <h4 className="text-offWhite font-body text-sm group-hover:text-gold transition-colors">
                            {event.title}
                          </h4>
                          <div className="flex items-center space-x-2 text-offWhite/50 text-xs font-body mt-1">
                            <span>{event.date.toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{event.location}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-offWhite/50 text-sm font-body">No upcoming events</p>
                    )}
                  </div>
                  <Link
                    href="/events"
                    className="block mt-4 text-gold text-sm font-body hover:underline"
                  >
                    View all events →
                  </Link>
                </motion.div>

                {/* Featured Marketplace Items */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl shadow-black/20"
                >
                  <h3 className="text-gold font-heading text-lg mb-4 flex items-center space-x-2">
                    <span>🛍️</span>
                    <span>Featured Items</span>
                  </h3>
                  <div className="space-y-4">
                    {featuredListings.length > 0 ? (
                      featuredListings.map((listing) => (
                        <Link
                          key={listing.id}
                          href={`/marketplace?listing=${listing.id}`}
                          className="flex items-center space-x-3 group"
                        >
                          <div className="w-12 h-12 rounded-lg bg-charcoal overflow-hidden flex-shrink-0">
                            {listing.image ? (
                              <img
                                src={listing.image}
                                alt={listing.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gold/40">
                                🛍️
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-offWhite font-body text-sm truncate group-hover:text-gold transition-colors">
                              {listing.title}
                            </h4>
                            <p className="text-gold text-sm font-semibold">
                              ${listing.price.toLocaleString()}
                            </p>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <p className="text-offWhite/50 text-sm font-body">No featured items</p>
                    )}
                  </div>
                  <Link
                    href="/marketplace"
                    className="block mt-4 text-gold text-sm font-body hover:underline"
                  >
                    Browse marketplace →
                  </Link>
                </motion.div>

                {/* Community Stats */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-gold/[0.08] to-gold/[0.02] backdrop-blur-xl rounded-2xl border border-gold/20 p-6 text-center shadow-2xl shadow-black/20"
                >
                  <span className="text-4xl block mb-2">🍍</span>
                  <h3 className="text-gold font-heading text-sm">Premium Community</h3>
                  <p className="text-offWhite/60 text-xs font-body mt-1">
                    Exclusive • Elite • Elevated
                  </p>
                </motion.div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </VettingGuard>
  );
}
