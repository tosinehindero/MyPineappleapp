'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import { toast, Toaster } from 'sonner';
import Link from 'next/link';
import VettingGuard from '@/components/VettingGuard';
import NotificationDropdown from '@/components/NotificationDropdown';
import SearchDropdown from '@/components/SearchDropdown';
import { getBlockedUsers } from '@/lib/user-safety';
import { getUsersWhoHaveMeInCircle, getCircleMembers, type CircleMember } from '@/lib/circle';
import { useSubscription } from '@/lib/subscription';
import {
  createPost,
  getPosts,
  reactToPost,
  getUserReactions,
  addComment,
  getComments,
  getUpcomingEvents,
  getFeaturedListings,
  subscribeToPostsRealtime,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [usersWhoHaveMeInCircle, setUsersWhoHaveMeInCircle] = useState<string[]>([]);
  const [circleMembers, setCircleMembers] = useState<CircleMember[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Post creation state
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImages, setNewPostImages] = useState<string[]>([]);
  const [newPostVideos, setNewPostVideos] = useState<string[]>([]);
  const [newPostPrivacy, setNewPostPrivacy] = useState<'all' | 'circle'>('all');
  const [newPostCategory, setNewPostCategory] = useState<FilterCategory>('all');
  const [posting, setPosting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingVideos, setUploadingVideos] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const postImageInputRef = useRef<HTMLInputElement>(null);
  const postVideoInputRef = useRef<HTMLInputElement>(null);

  // Subscription state
  const { subscription, canAccess } = useSubscription();

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
  
  // Full-screen image modal state
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullScreenImage) {
        setFullScreenImage(null);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [fullScreenImage]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (fullScreenImage) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [fullScreenImage]);

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
          // Check if user is admin
          setIsAdmin(data.role === 'admin');
        }
        
        // Load all user-specific data in parallel with error handling
        const loadUserData = async () => {
          const results = await Promise.allSettled([
            getBlockedUsers(user.uid),
            getUsersWhoHaveMeInCircle(user.uid),
            getCircleMembers(user.uid),
          ]);
          
          // Handle results individually
          if (results[0].status === 'fulfilled') {
            setBlockedUserIds(results[0].value);
          }
          if (results[1].status === 'fulfilled') {
            setUsersWhoHaveMeInCircle(results[1].value);
          }
          if (results[2].status === 'fulfilled') {
            setCircleMembers(results[2].value);
          }
        };
        
        // Don't block auth state on data loading
        loadUserData();
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time posts subscription
  useEffect(() => {
    // Don't load if user auth state is not yet determined or user is not logged in
    if (!currentUser) {
      return;
    }

    setLoading(true);
    
    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
    }, 8000); // 8 second max loading time

    // Load sidebar data (events and listings) - one time, with timeout
    const loadSidebarData = async () => {
      try {
        const [eventsResult, listingsResult] = await Promise.allSettled([
          getUpcomingEvents(),
          getFeaturedListings(),
        ]);

        if (eventsResult.status === 'fulfilled' && eventsResult.value.success) {
          setUpcomingEvents(eventsResult.value.events);
        }

        if (listingsResult.status === 'fulfilled' && listingsResult.value.success) {
          setFeaturedListings(listingsResult.value.listings);
        }
      } catch (error) {
        console.error('Error loading sidebar data:', error);
      }
    };

    loadSidebarData();

    // Subscribe to real-time posts updates
    const unsubscribePosts = subscribeToPostsRealtime(
      activeFilter,
      async (newPosts) => {
        // Filter out posts from blocked users and circle-only posts from users who don't have me in their circle
        const filteredPosts = newPosts.filter(post => {
          // Filter blocked users
          if (blockedUserIds.includes(post.authorId)) return false;
          
          // For circle-only posts, only show if:
          // 1. It's the current user's own post, OR
          // 2. The post author has the current user in their circle
          if (post.privacy === 'circle') {
            const isOwnPost = post.authorId === currentUser?.uid;
            const authorHasMeInCircle = usersWhoHaveMeInCircle.includes(post.authorId);
            return isOwnPost || authorHasMeInCircle;
          }
          
          return true;
        });
        setPosts(filteredPosts);
        setHasMore(filteredPosts.length >= 20);
        setLoading(false);

        // Load user reactions for the posts
        if (newPosts.length > 0 && currentUser) {
          try {
            const reactions = await getUserReactions(
              currentUser.uid,
              newPosts.map((p) => p.id)
            );
            setUserReactions(reactions);
          } catch (error) {
            console.error('Error loading reactions:', error);
          }
        }
      },
      20
    );

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log('Feed loading timeout - forcing load complete');
        setLoading(false);
      }
    }, 8000);

    return () => {
      unsubscribePosts();
      clearTimeout(timeoutId);
    };
  }, [currentUser, activeFilter, blockedUserIds, usersWhoHaveMeInCircle]);

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
    if (!hasMore || loadingMore || posts.length === 0 || !currentUser) return;

    setLoadingMore(true);
    const lastPost = posts[posts.length - 1];
    
    const result = await getPosts(
      currentUser.uid,
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

  // Handle post image upload
  const handlePostImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !currentUser) return;
    
    // Limit to 4 images per post
    if (newPostImages.length + files.length > 4) {
      toast.error('Maximum 4 images per post');
      return;
    }
    
    setUploadingImages(true);
    const uploadedUrls: string[] = [];
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error('Only image files are allowed');
          continue;
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error('Image size must be under 5MB');
          continue;
        }
        
        const timestamp = Date.now();
        const fileName = `post_${currentUser.uid}_${timestamp}_${i}.${file.name.split('.').pop()}`;
        const storageRef = ref(storage, `posts/${currentUser.uid}/${fileName}`);
        
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);
        uploadedUrls.push(downloadUrl);
      }
      
      if (uploadedUrls.length > 0) {
        setNewPostImages(prev => [...prev, ...uploadedUrls]);
        toast.success(`${uploadedUrls.length} image(s) added`);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload image(s)');
    } finally {
      setUploadingImages(false);
      // Reset the input
      if (postImageInputRef.current) {
        postImageInputRef.current.value = '';
      }
    }
  };
  
  // Remove post image
  const removePostImage = (index: number) => {
    setNewPostImages(prev => prev.filter((_, i) => i !== index));
  };

  // Handle post video upload
  const handlePostVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !currentUser) return;
    
    // Limit to 2 videos per post
    if (newPostVideos.length + files.length > 2) {
      toast.error('Maximum 2 videos per post');
      return;
    }
    
    setUploadingVideos(true);
    setVideoUploadProgress(0);
    const uploadedUrls: string[] = [];
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('video/')) {
          toast.error('Only video files are allowed');
          continue;
        }
        
        // Validate file size (max 100MB for videos)
        if (file.size > 100 * 1024 * 1024) {
          toast.error('Video size must be under 100MB');
          continue;
        }
        
        setVideoUploadProgress(Math.round((i / files.length) * 50));
        
        const timestamp = Date.now();
        const fileName = `video_${currentUser.uid}_${timestamp}_${i}.${file.name.split('.').pop()}`;
        const storageRef = ref(storage, `posts/${currentUser.uid}/videos/${fileName}`);
        
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);
        uploadedUrls.push(downloadUrl);
        
        setVideoUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }
      
      if (uploadedUrls.length > 0) {
        setNewPostVideos(prev => [...prev, ...uploadedUrls]);
        toast.success(`${uploadedUrls.length} video(s) added`);
      }
    } catch (error) {
      console.error('Error uploading videos:', error);
      toast.error('Failed to upload video(s)');
    } finally {
      setUploadingVideos(false);
      setVideoUploadProgress(0);
      if (postVideoInputRef.current) {
        postVideoInputRef.current.value = '';
      }
    }
  };
  
  // Remove post video
  const removePostVideo = (index: number) => {
    setNewPostVideos(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreatePost = async () => {
    if (!currentUser || !newPostContent.trim()) return;

    setPosting(true);
    const result = await createPost(
      currentUser.uid,
      newPostContent,
      newPostImages,
      newPostPrivacy,
      newPostCategory === 'all' ? 'general' : newPostCategory,
      newPostVideos
    );

    if (result.success) {
      toast.success('Whisper posted successfully!');
      setNewPostContent('');
      setNewPostImages([]);
      setNewPostVideos([]);
      setNewPostPrivacy('all');
      setNewPostCategory('all');
      // Real-time subscription will automatically update the posts
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

  const handleCreateWelcomePost = async () => {
    if (!currentUser || !userProfile) return;
    
    setPosting(true);
    const result = await createPost(
      currentUser.uid,
      'Welcome to the Inner Circle! This is the first post in our exclusive community. Share your experiences, connect with like-minded individuals, and explore the lifestyle together.',
      [],
      'all',
      'general'
    );

    if (result.success) {
      toast.success('Welcome post created!');
      // Reload posts
      const postsResult = await getPosts(currentUser.uid, activeFilter);
      if (postsResult.success) {
        setPosts(postsResult.posts);
        setHasMore(postsResult.hasMore);
      }
    }
    setPosting(false);
  };

  const filterOptions: { key: FilterCategory; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: '🌟' },
    { key: 'travel', label: 'Travel', icon: '✈️' },
    { key: 'events', label: 'Events', icon: '🎭' },
    { key: 'marketplace', label: 'Marketplace', icon: '🛍️' },
  ];

  // Show loading only for first 5 seconds max
  if (loading && posts.length === 0) {
    return (
      <VettingGuard>
        <div className="min-h-screen bg-charcoal flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-offWhite/60 font-body">Loading feed...</p>
            <p className="text-offWhite/40 font-body text-sm mt-2">This should only take a moment</p>
          </div>
        </div>
      </VettingGuard>
    );
  }

  return (
    <VettingGuard>
      <div className="min-h-screen bg-charcoal">
        {/* Top Navigation Bar */}
        <nav className="sticky top-0 z-50 bg-darkBlue/95 backdrop-blur-md border-b border-gold/20">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <Link href="/feed" className="flex items-center space-x-2">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden border border-gold/30">
                  <img
                    src="https://customer-assets.emergentagent.com/job_39fcce0e-8a43-4eb6-8e28-bbef7a6f13d0/artifacts/9covy5o5_699c0962-7918-40f8-96bc-0b8c0e41e321.png"
                    alt="PineapplePlay Logo"
                    className="w-full h-full object-cover"
                    data-testid="feed-navbar-pineapple-logo"
                  />
                </div>
                <span className="text-xl md:text-2xl font-heading text-gold">PineapplePlay</span>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-6">
                {/* Search */}
                {userProfile && (
                  <SearchDropdown userId={userProfile.uid} blockedUserIds={blockedUserIds} />
                )}
                <Link href="/feed" className="text-offWhite/80 hover:text-gold transition-colors font-body text-sm">
                  Feed
                </Link>
                <Link href="/messages" className="text-offWhite/80 hover:text-gold transition-colors font-body text-sm">
                  Messages
                </Link>
                <Link href="/travel" className="text-offWhite/80 hover:text-gold transition-colors font-body text-sm">
                  Travel
                </Link>
                <Link href="/marketplace" className="text-offWhite/80 hover:text-gold transition-colors font-body text-sm">
                  Marketplace
                </Link>
                <Link href="/about" className="text-offWhite/80 hover:text-gold transition-colors font-body text-sm">
                  About
                </Link>
                {userProfile && (
                  <Link href={`/profile/${userProfile.uid}`} className="text-offWhite/80 hover:text-gold transition-colors font-body text-sm">
                    Profile
                  </Link>
                )}
                {/* Notification Bell */}
                {userProfile && (
                  <NotificationDropdown userId={userProfile.uid} />
                )}
                {/* Settings Icon */}
                {userProfile && (
                  <Link
                    href="/settings"
                    className="p-2 text-offWhite/70 hover:text-gold transition-colors rounded-full hover:bg-white/5"
                    title="Settings"
                    data-testid="settings-icon-desktop"
                  >
                    <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </Link>
                )}
                <button
                  onClick={async () => {
                    try {
                      const { signOut } = await import('firebase/auth');
                      await signOut(auth);
                      window.location.href = '/';
                    } catch (error) {
                      console.error('Sign out error:', error);
                    }
                  }}
                  className="px-4 py-2 bg-gold/20 text-gold rounded-full hover:bg-gold/30 transition-colors font-body text-sm"
                  data-testid="logout-btn-desktop"
                >
                  Log Out
                </button>
              </div>

              {/* Mobile Navigation - Hamburger Menu */}
              <div className="flex md:hidden items-center space-x-2">
                {/* Notification Bell - Mobile */}
                {userProfile && (
                  <NotificationDropdown userId={userProfile.uid} />
                )}
                <Link href="/messages" className="p-2 text-offWhite/80 hover:text-gold transition-colors">
                  <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </Link>
                {userProfile && (
                  <Link href={`/profile/${userProfile.uid}`} className="p-2 text-offWhite/80 hover:text-gold transition-colors">
                    <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </Link>
                )}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 text-offWhite/80 hover:text-gold transition-colors"
                  data-testid="mobile-menu-btn"
                >
                  {mobileMenuOpen ? (
                    <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
              <div className="md:hidden bg-darkBlue/95 border-t border-gold/20 py-2">
                <Link
                  href="/feed"
                  className="flex items-center space-x-3 px-4 py-3 text-gold hover:bg-gold/10 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                  <span className="font-body">Feed</span>
                </Link>
                <Link
                  href="/messages"
                  className="flex items-center space-x-3 px-4 py-3 text-offWhite/80 hover:text-gold hover:bg-gold/10 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="font-body">Messages</span>
                </Link>
                {userProfile && (
                  <Link
                    href={`/profile/${userProfile.uid}`}
                    className="flex items-center space-x-3 px-4 py-3 text-offWhite/80 hover:text-gold hover:bg-gold/10 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="font-body">Profile</span>
                  </Link>
                )}
                <Link
                  href="/travel"
                  className="flex items-center space-x-3 px-4 py-3 text-offWhite/80 hover:text-gold hover:bg-gold/10 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                  </svg>
                  <span className="font-body">Travel</span>
                </Link>
                <Link
                  href="/events"
                  className="flex items-center space-x-3 px-4 py-3 text-offWhite/80 hover:text-gold hover:bg-gold/10 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-body">Events</span>
                </Link>
                <Link
                  href="/marketplace"
                  className="flex items-center space-x-3 px-4 py-3 text-offWhite/80 hover:text-gold hover:bg-gold/10 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <span className="font-body">Marketplace</span>
                </Link>
                <Link
                  href="/groups"
                  className="flex items-center space-x-3 px-4 py-3 text-offWhite/80 hover:text-gold hover:bg-gold/10 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="font-body">Circles</span>
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center space-x-3 px-4 py-3 text-offWhite/80 hover:text-gold hover:bg-gold/10 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-body">Settings</span>
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin/vetting"
                    className="flex items-center space-x-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="font-body">Admin Dashboard</span>
                  </Link>
                )}
                <div className="border-t border-gold/10 mt-2 pt-2">
                  <button
                    onClick={async () => {
                      try {
                        const { signOut } = await import('firebase/auth');
                        await signOut(auth);
                        window.location.href = '/';
                      } catch (error) {
                        console.error('Sign out error:', error);
                      }
                    }}
                    className="flex items-center space-x-3 px-4 py-3 text-red-400 hover:bg-red-500/10 transition-colors w-full"
                    data-testid="logout-btn-mobile"
                  >
                    <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="font-body">Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>

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
          {/* Mobile Circle Row - Stories Style */}
          {currentUser && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:hidden mb-6 -mx-4 px-4"
            >
              <div className="flex items-center space-x-4 overflow-x-auto pb-3 scrollbar-hide">
                {/* Add to Circle CTA */}
                <Link
                  href="/search"
                  className="flex flex-col items-center space-y-1 flex-shrink-0"
                >
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-gold/40 flex items-center justify-center bg-gold/5 hover:bg-gold/10 transition-colors">
                    <svg className="w-6 h-6 text-gold/60" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="text-offWhite/50 text-xs font-body">Add</span>
                </Link>
                
                {/* Circle Members */}
                {circleMembers.length > 0 ? (
                  circleMembers.map((member) => (
                    <Link
                      key={member.memberId}
                      href={`/profile/${member.memberId}`}
                      className="flex flex-col items-center space-y-1 flex-shrink-0 group"
                    >
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full border-2 border-green-500/50 p-0.5 group-hover:border-gold transition-colors">
                          {member.photoUrl ? (
                            <img
                              src={member.photoUrl}
                              alt={member.username}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full rounded-full bg-green-500/10 flex items-center justify-center text-green-400 font-heading group-hover:text-gold transition-colors">
                              {member.username[0]?.toUpperCase() || '?'}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-offWhite/70 text-xs font-body max-w-[64px] truncate group-hover:text-gold transition-colors">
                        {member.username}
                      </span>
                    </Link>
                  ))
                ) : (
                  <div className="flex items-center space-x-3 px-4 py-2 bg-white/[0.02] rounded-full border border-white/5">
                    <svg className="w-4 h-4 text-offWhite/30" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-offWhite/40 text-xs font-body">Find friends to add to your circle</span>
                  </div>
                )}
                
                {/* View All Link */}
                {circleMembers.length > 0 && (
                  <Link
                    href="/settings?tab=circle"
                    className="flex flex-col items-center space-y-1 flex-shrink-0"
                  >
                    <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
                      <span className="text-offWhite/60 text-xs font-body">All</span>
                    </div>
                    <span className="text-offWhite/50 text-xs font-body">{circleMembers.length}</span>
                  </Link>
                )}
              </div>
            </motion.div>
          )}

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
                                {(userProfile?.username || '?')[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                          </div>
                          {userProfile?.isVerified && (
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full overflow-hidden border-2 border-darkBlue">
                              <img 
                                src="https://customer-assets.emergentagent.com/job_39fcce0e-8a43-4eb6-8e28-bbef7a6f13d0/artifacts/9covy5o5_699c0962-7918-40f8-96bc-0b8c0e41e321.png"
                                alt="Verified"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="text-offWhite font-heading text-lg flex items-center">
                            {userProfile?.username || 'Member'}
                            {userProfile.isVerified && (
                              <img 
                                src="https://customer-assets.emergentagent.com/job_39fcce0e-8a43-4eb6-8e28-bbef7a6f13d0/artifacts/9covy5o5_699c0962-7918-40f8-96bc-0b8c0e41e321.png"
                                alt="Verified"
                                className="ml-2 w-4 h-4 rounded-full"
                              />
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
                      <Link
                        href="/groups"
                        className="flex items-center space-x-2 text-offWhite/70 hover:text-gold transition-colors text-sm font-body"
                        data-testid="circles-link-desktop"
                      >
                        <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>Circles</span>
                      </Link>
                      <Link
                        href="/settings"
                        className="flex items-center space-x-2 text-offWhite/70 hover:text-gold transition-colors text-sm font-body"
                        data-testid="settings-link-desktop"
                      >
                        <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Settings</span>
                      </Link>
                      {isAdmin && (
                        <Link
                          href="/admin/vetting"
                          className="flex items-center space-x-2 text-red-400 hover:text-red-300 transition-colors text-sm font-body"
                          data-testid="admin-dashboard-link"
                        >
                          <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          <span>Admin Dashboard</span>
                        </Link>
                      )}
                    </div>
                  </motion.div>
                )}
                
                {/* Membership Status */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 }}
                  className={`backdrop-blur-xl rounded-2xl border p-4 shadow-2xl shadow-black/20 ${
                    subscription?.tier === 'premium' 
                      ? 'bg-gradient-to-br from-gold/10 to-gold/5 border-gold/30' 
                      : subscription?.tier === 'basic'
                        ? 'bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/30'
                        : 'bg-white/[0.03] border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        subscription?.tier === 'premium' 
                          ? 'bg-gold/20' 
                          : subscription?.tier === 'basic'
                            ? 'bg-blue-500/20'
                            : 'bg-white/10'
                      }`}>
                        {subscription?.tier === 'premium' ? (
                          <svg className="w-5 h-5 text-gold" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                          </svg>
                        ) : subscription?.tier === 'basic' ? (
                          <svg className="w-5 h-5 text-blue-400" fill="none" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-offWhite/50" fill="none" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className={`font-heading text-sm ${
                          subscription?.tier === 'premium' 
                            ? 'text-gold' 
                            : subscription?.tier === 'basic'
                              ? 'text-blue-400'
                              : 'text-offWhite/70'
                        }`}>
                          {subscription?.tier === 'premium' ? 'Premium' : subscription?.tier === 'basic' ? 'Basic' : 'Free'} Member
                        </p>
                        <p className="text-offWhite/40 text-xs font-body">
                          {subscription?.tier === 'premium' 
                            ? 'Full access' 
                            : subscription?.tier === 'basic'
                              ? 'Limited access'
                              : 'Upgrade for more'}
                        </p>
                      </div>
                    </div>
                    {subscription?.tier !== 'premium' && (
                      <Link
                        href="/pricing"
                        className="px-3 py-1.5 bg-gold/20 text-gold text-xs font-body rounded-full hover:bg-gold/30 transition-colors"
                      >
                        Upgrade
                      </Link>
                    )}
                  </div>
                </motion.div>

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
                      <p className="text-2xl font-heading text-offWhite">{circleMembers.length}</p>
                      <p className="text-offWhite/50 text-xs font-body">Circle</p>
                    </div>
                  </div>
                  
                  {/* Who Viewed My Profile - Premium Only */}
                  {subscription?.tier === 'premium' && (
                    <Link
                      href="/profile-views"
                      className="mt-4 flex items-center justify-between p-3 bg-gold/10 border border-gold/20 rounded-xl hover:bg-gold/20 transition-colors group"
                      data-testid="profile-views-link"
                    >
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-gold" fill="none" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span className="text-gold text-sm font-body">Who viewed you</span>
                      </div>
                      <svg className="w-4 h-4 text-gold/60 group-hover:translate-x-1 transition-transform" fill="none" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  )}
                </motion.div>
                
                {/* My Circle */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10 p-6 shadow-2xl shadow-black/20"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gold font-heading text-sm flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>My Circle</span>
                    </h3>
                    <Link 
                      href="/settings?tab=circle"
                      className="text-offWhite/40 hover:text-gold transition-colors"
                      title="Manage Circle"
                    >
                      <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </Link>
                  </div>
                  
                  {circleMembers.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-offWhite/40 text-xs font-body mb-2">Your circle is empty</p>
                      <p className="text-offWhite/30 text-xs font-body">Visit profiles to add friends</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {circleMembers.slice(0, 5).map((member) => (
                        <Link
                          key={member.memberId}
                          href={`/profile/${member.memberId}`}
                          className="flex items-center space-x-3 group"
                        >
                          {member.photoUrl ? (
                            <img
                              src={member.photoUrl}
                              alt={member.username}
                              className="w-8 h-8 rounded-full border border-green-500/30 object-cover group-hover:border-gold transition-colors"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full border border-green-500/30 bg-green-500/10 flex items-center justify-center text-green-400 text-xs font-heading group-hover:border-gold group-hover:text-gold transition-colors">
                              {member.username[0]?.toUpperCase() || '?'}
                            </div>
                          )}
                          <span className="text-offWhite/70 text-sm font-body group-hover:text-gold transition-colors truncate">
                            {member.username}
                          </span>
                        </Link>
                      ))}
                      
                      {circleMembers.length > 5 && (
                        <Link
                          href="/settings?tab=circle"
                          className="block text-center text-gold/70 hover:text-gold text-xs font-body pt-2 border-t border-white/5"
                        >
                          View all {circleMembers.length} members →
                        </Link>
                      )}
                    </div>
                  )}
                </motion.div>
                
                {/* Upgrade Banner - Show for free users */}
                {subscription?.tier === 'free' && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gradient-to-br from-gold/10 to-transparent border border-gold/20 rounded-2xl p-5 shadow-2xl shadow-black/20"
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-gold/20 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-gold" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                          <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-gold font-heading text-sm">Upgrade to Premium</h3>
                        <p className="text-offWhite/50 text-xs font-body">Unlock all features</p>
                      </div>
                    </div>
                    <ul className="space-y-1.5 mb-4 text-xs font-body text-offWhite/70">
                      <li className="flex items-center space-x-2">
                        <span className="text-gold">✓</span>
                        <span>Unlimited messages</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span className="text-gold">✓</span>
                        <span>Marketplace access</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span className="text-gold">✓</span>
                        <span>Sasha AI Travel</span>
                      </li>
                    </ul>
                    <Link
                      href="/pricing"
                      className="block w-full py-2 bg-gold text-charcoal text-center rounded-full text-sm font-body font-semibold hover:shadow-gold-glow transition-all"
                    >
                      View Plans
                    </Link>
                  </motion.div>
                )}
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
                className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10 p-4 sm:p-6 shadow-2xl shadow-black/20"
                data-testid="whisper-box"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {userProfile?.photoUrl ? (
                    <img
                      src={userProfile.photoUrl}
                      alt={userProfile.username}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-gold/40 object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-gold/40 bg-gold/20 flex items-center justify-center text-gold font-heading flex-shrink-0">
                      {userProfile?.username?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="flex-1 w-full">
                    <textarea
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder="Share a whisper with the community..."
                      rows={3}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-3 text-offWhite font-body placeholder-offWhite/30 focus:outline-none focus:border-gold/50 focus:bg-white/[0.05] transition-all resize-none text-sm sm:text-base"
                      data-testid="whisper-input"
                    />

                    {/* Post Options */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mt-4">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                        {/* Privacy Toggle */}
                        <div className="flex items-center gap-1 sm:gap-2">
                          <button
                            onClick={() => setNewPostPrivacy('all')}
                            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-body transition-all backdrop-blur-sm ${
                              newPostPrivacy === 'all'
                                ? 'bg-gold text-charcoal shadow-lg shadow-gold/20'
                                : 'bg-white/[0.03] border border-white/10 text-offWhite/60 hover:text-gold hover:border-gold/30'
                            }`}
                            data-testid="privacy-all"
                          >
                            All
                          </button>
                          <button
                            onClick={() => setNewPostPrivacy('circle')}
                            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-body transition-all backdrop-blur-sm ${
                              newPostPrivacy === 'circle'
                                ? 'bg-gold text-charcoal shadow-lg shadow-gold/20'
                                : 'bg-white/[0.03] border border-white/10 text-offWhite/60 hover:text-gold hover:border-gold/30'
                            }`}
                            data-testid="privacy-circle"
                          >
                            Circle
                          </button>
                        </div>

                        {/* Category Selector */}
                        <select
                          value={newPostCategory}
                          onChange={(e) => setNewPostCategory(e.target.value as FilterCategory)}
                          className="bg-white/[0.03] border border-white/10 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-body text-offWhite/80 focus:outline-none focus:border-gold/50 backdrop-blur-sm cursor-pointer"
                        >
                          <option value="all">General</option>
                          <option value="travel">Travel</option>
                          <option value="events">Events</option>
                          <option value="marketplace">Marketplace</option>
                        </select>
                        
                        {/* Image Upload Button */}
                        <button
                          type="button"
                          onClick={() => postImageInputRef.current?.click()}
                          disabled={uploadingImages || newPostImages.length >= 4}
                          className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-body bg-white/[0.03] border border-white/10 text-offWhite/60 hover:text-gold hover:border-gold/30 transition-all disabled:opacity-50"
                          data-testid="add-image-btn"
                        >
                          {uploadingImages ? (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                              <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                          <span className="hidden sm:inline">{newPostImages.length}/4</span>
                        </button>
                        
                        {/* Video Upload Button */}
                        <button
                          type="button"
                          onClick={() => postVideoInputRef.current?.click()}
                          disabled={uploadingVideos || newPostVideos.length >= 2}
                          className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-body bg-white/[0.03] border border-white/10 text-offWhite/60 hover:text-gold hover:border-gold/30 transition-all disabled:opacity-50"
                          data-testid="add-video-btn"
                        >
                          {uploadingVideos ? (
                            <div className="flex items-center gap-1">
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              <span className="hidden sm:inline">{videoUploadProgress}%</span>
                            </div>
                          ) : (
                            <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                          <span className="hidden sm:inline">{newPostVideos.length}/2</span>
                        </button>
                      </div>

                      <button
                        onClick={handleCreatePost}
                        disabled={posting || uploadingImages || uploadingVideos || !newPostContent.trim()}
                        className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
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
                            <span>Whisper</span>
                          </>
                        )}
                      </button>
                    </div>
                    
                    {/* Image Preview */}
                    {newPostImages.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {newPostImages.map((imageUrl, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={imageUrl}
                              alt={`Upload ${index + 1}`}
                              className="w-20 h-20 object-cover rounded-lg border border-white/10"
                            />
                            <button
                              onClick={() => removePostImage(index)}
                              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              data-testid={`remove-image-${index}`}
                            >
                              <svg className="w-3 h-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Video Preview */}
                    {newPostVideos.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {newPostVideos.map((videoUrl, index) => (
                          <div key={index} className="relative group">
                            <video
                              src={videoUrl}
                              className="w-32 h-20 object-cover rounded-lg border border-white/10"
                              muted
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-8 h-8 bg-charcoal/80 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-gold" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>
                            <button
                              onClick={() => removePostVideo(index)}
                              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              data-testid={`remove-video-${index}`}
                            >
                              <svg className="w-3 h-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Hidden File Inputs */}
                <input
                  ref={postImageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePostImageUpload}
                  className="hidden"
                  data-testid="post-image-input"
                />
                <input
                  ref={postVideoInputRef}
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={handlePostVideoUpload}
                  className="hidden"
                  data-testid="post-video-input"
                />
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
                                  alt={post.authorUsername || 'Member'}
                                  className="w-12 h-12 rounded-full border-2 border-gold/40 object-cover"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full border-2 border-gold/40 bg-gold/20 flex items-center justify-center text-gold font-heading">
                                  {(post.authorUsername || '?')[0]?.toUpperCase() || '?'}
                                </div>
                              )}
                              {post.authorVerified && (
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full overflow-hidden border-2 border-darkBlue">
                                  <img 
                                    src="https://customer-assets.emergentagent.com/job_39fcce0e-8a43-4eb6-8e28-bbef7a6f13d0/artifacts/9covy5o5_699c0962-7918-40f8-96bc-0b8c0e41e321.png"
                                    alt="Verified"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                            </div>
                            <div>
                              <h4 className="text-offWhite font-body font-semibold flex items-center">
                                {post.authorUsername || 'Anonymous'}
                                {post.authorVerified && (
                                  <img 
                                    src="https://customer-assets.emergentagent.com/job_39fcce0e-8a43-4eb6-8e28-bbef7a6f13d0/artifacts/9covy5o5_699c0962-7918-40f8-96bc-0b8c0e41e321.png"
                                    alt="Verified"
                                    className="ml-1 w-4 h-4 rounded-full"
                                  />
                                )}
                              </h4>
                              <p className="text-offWhite/50 text-xs font-body">
                                {formatTimeAgo(post.createdAt)}
                                {post.category && post.category !== 'general' && (
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
                              className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFullScreenImage(post.images[activeImageIndex[post.id] || 0]);
                              }}
                              data-testid={`post-image-${post.id}`}
                            />
                          </div>
                          {post.images.length > 1 && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveImageIndex((prev) => ({
                                    ...prev,
                                    [post.id]: Math.max(0, (prev[post.id] || 0) - 1),
                                  }));
                                }}
                                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-charcoal/80 rounded-full flex items-center justify-center text-offWhite hover:bg-gold hover:text-charcoal transition-colors"
                              >
                                ←
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveImageIndex((prev) => ({
                                    ...prev,
                                    [post.id]: Math.min(post.images.length - 1, (prev[post.id] || 0) + 1),
                                  }));
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-charcoal/80 rounded-full flex items-center justify-center text-offWhite hover:bg-gold hover:text-charcoal transition-colors"
                              >
                                →
                              </button>
                              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                                {post.images.map((_, idx) => (
                                  <button
                                    key={idx}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveImageIndex((prev) => ({ ...prev, [post.id]: idx }));
                                    }}
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

                      {/* Video Player */}
                      {post.videos && post.videos.length > 0 && (
                        <div className="space-y-2">
                          {post.videos.map((videoUrl, idx) => (
                            <div key={idx} className="relative bg-charcoal">
                              <video
                                src={videoUrl}
                                controls
                                className="w-full max-h-[500px] object-contain"
                                preload="metadata"
                                data-testid={`post-video-${post.id}-${idx}`}
                              >
                                Your browser does not support video playback.
                              </video>
                            </div>
                          ))}
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
                              <span className="text-lg">👍</span>
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
                                        <Link href={`/profile/${comment.authorId || ''}`}>
                                          {comment.authorPhoto ? (
                                            <img
                                              src={comment.authorPhoto}
                                              alt=""
                                              className="w-8 h-8 rounded-full border border-gold/30 object-cover"
                                            />
                                          ) : (
                                            <div className="w-8 h-8 rounded-full border border-gold/30 bg-gold/20 flex items-center justify-center text-gold text-sm font-heading">
                                              {(comment.authorUsername || '?')[0]?.toUpperCase() || '?'}
                                            </div>
                                          )}
                                        </Link>
                                        <div className="flex-1 bg-white/[0.03] backdrop-blur-sm rounded-xl px-4 py-2 border border-white/5">
                                          <div className="flex items-center space-x-2">
                                            <Link
                                              href={`/profile/${comment.authorId || ''}`}
                                              className="text-offWhite font-body text-sm font-semibold hover:text-gold"
                                            >
                                              {comment.authorUsername || 'Anonymous'}
                                              {comment.authorVerified && (
                                                <img 
                                                  src="https://customer-assets.emergentagent.com/job_39fcce0e-8a43-4eb6-8e28-bbef7a6f13d0/artifacts/9covy5o5_699c0962-7918-40f8-96bc-0b8c0e41e321.png"
                                                  alt="Verified"
                                                  className="ml-1 w-3 h-3 rounded-full inline-block"
                                                />
                                              )}
                                            </Link>
                                            <span className="text-offWhite/40 text-xs">
                                              {formatTimeAgo(comment.createdAt)}
                                            </span>
                                          </div>
                                          <p className="text-offWhite/80 font-body text-sm mt-1">
                                            {comment.content || ''}
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
                  <div className="text-center py-16 bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10">
                    <div className="w-12 h-12 mx-auto mb-4 bg-gold/20 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-gold" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-heading text-gold mb-2">No whispers yet</h3>
                    <p className="text-offWhite/60 font-body mb-6">Be the first to share something with the community!</p>
                    <button
                      onClick={handleCreateWelcomePost}
                      disabled={posting}
                      className="px-6 py-3 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all disabled:opacity-50 inline-flex items-center space-x-2"
                    >
                      {posting ? (
                        <>
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <span>Create Welcome Post</span>
                        </>
                      )}
                    </button>
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
                      You've reached the end
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
                        <Link 
                          key={event.id} 
                          href={event.id.startsWith('demo') ? '/events' : `/events?view=${event.id}`}
                          className="block group cursor-pointer"
                        >
                          <h4 className="text-offWhite font-body text-sm group-hover:text-gold transition-colors">
                            {event.title}
                          </h4>
                          <div className="flex items-center space-x-2 text-offWhite/50 text-xs font-body mt-1">
                            <span>{event.date.toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{event.location}</span>
                          </div>
                        </Link>
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
                  <div className="w-10 h-10 mx-auto mb-2 bg-gold/20 rounded-full flex items-center justify-center">
                    <span className="text-gold font-heading text-lg">PP</span>
                  </div>
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
      
      {/* Full-Screen Image Modal */}
      <AnimatePresence>
        {fullScreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-[#0a0a0a]/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8"
            onClick={() => setFullScreenImage(null)}
            data-testid="fullscreen-image-modal"
          >
            {/* Close Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFullScreenImage(null);
              }}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 w-12 h-12 bg-charcoal/60 hover:bg-charcoal border-2 border-gold/40 hover:border-gold rounded-full flex items-center justify-center text-gold transition-all group"
              data-testid="close-fullscreen-btn"
            >
              <svg 
                className="w-6 h-6 transform group-hover:rotate-90 transition-transform duration-200" 
                fill="none" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Hint Text */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-offWhite/40 text-xs font-body">
              Press ESC or click outside to close
            </div>
            
            {/* Image Container */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ 
                type: "spring",
                stiffness: 300,
                damping: 25,
                duration: 0.3 
              }}
              className="relative max-w-[95vw] max-h-[90vh] sm:max-w-[90vw] sm:max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={fullScreenImage}
                alt="Full size image"
                className="max-w-full max-h-[90vh] sm:max-h-[85vh] w-auto h-auto object-contain rounded-lg sm:rounded-xl shadow-2xl shadow-black/50"
                style={{ 
                  boxShadow: '0 0 60px rgba(212, 175, 55, 0.15), 0 25px 50px -12px rgba(0, 0, 0, 0.8)' 
                }}
              />
              
              {/* Subtle Gold Border Glow */}
              <div 
                className="absolute inset-0 rounded-lg sm:rounded-xl pointer-events-none"
                style={{
                  boxShadow: 'inset 0 0 0 1px rgba(212, 175, 55, 0.2)'
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </VettingGuard>
  );
}
