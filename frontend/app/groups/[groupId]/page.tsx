'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '@/lib/firebase';
import { toast, Toaster } from 'sonner';
import { useSubscription } from '@/lib/subscription';
import {
  getGroup,
  getGroupMembership,
  getGroupMembers,
  subscribeToGroupPosts,
  createGroupPost,
  reactToGroupPost,
  deleteGroupPost,
  getGroupMedia,
  leaveGroup,
  approveMember,
  rejectMember,
  removeMember,
  updateMemberRole,
  type Group,
  type GroupMember,
  type GroupPost,
  type GroupMedia,
} from '@/lib/groups';

type TabType = 'feed' | 'members' | 'media' | 'settings';

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;
  const { subscription } = useSubscription();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<Group | null>(null);
  const [membership, setMembership] = useState<GroupMember | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [pendingMembers, setPendingMembers] = useState<GroupMember[]>([]);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [media, setMedia] = useState<GroupMedia[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('feed');

  // Post creation state
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImages, setNewPostImages] = useState<string[]>([]);
  const [newPostVideos, setNewPostVideos] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // User reactions
  const [userReactions, setUserReactions] = useState<{ [postId: string]: { fire: boolean; pineapple: boolean } }>({});

  // Media filter
  const [mediaFilter, setMediaFilter] = useState<'all' | 'image' | 'video'>('all');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      setCurrentUser(user);

      const userDoc = await getDoc(doc(db, 'members', user.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
      }

      // Load group data
      const groupData = await getGroup(groupId);
      if (!groupData) {
        toast.error('Group not found');
        router.push('/groups');
        return;
      }
      setGroup(groupData);

      // Check membership
      const membershipData = await getGroupMembership(groupId, user.uid);
      setMembership(membershipData);

      // If not a member and group is secret, deny access
      if (!membershipData && groupData.privacy === 'secret') {
        toast.error('This is a secret circle. You need an invitation.');
        router.push('/groups');
        return;
      }

      // Load members
      const [approvedMembers, pending] = await Promise.all([
        getGroupMembers(groupId, 'approved'),
        getGroupMembers(groupId, 'pending'),
      ]);
      setMembers(approvedMembers);
      setPendingMembers(pending);

      setLoading(false);
    });

    return () => unsubscribe();
  }, [groupId, router]);

  // Subscribe to posts
  useEffect(() => {
    if (!membership || membership.status !== 'approved') return;

    const unsubscribe = subscribeToGroupPosts(groupId, (newPosts) => {
      setPosts(newPosts);
    });

    return () => unsubscribe();
  }, [groupId, membership]);

  // Load media when switching to media tab
  useEffect(() => {
    if (activeTab === 'media' && membership?.status === 'approved') {
      loadMedia();
    }
  }, [activeTab, membership]);

  const loadMedia = async () => {
    const mediaData = await getGroupMedia(
      groupId,
      mediaFilter === 'all' ? undefined : mediaFilter
    );
    setMedia(mediaData);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !currentUser) return;

    if (newPostImages.length + files.length > 4) {
      toast.error('Maximum 4 images per post');
      return;
    }

    setUploadingMedia(true);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 10 * 1024 * 1024) {
          toast.error('Image must be under 10MB');
          continue;
        }

        setUploadProgress(Math.round((i / files.length) * 100));

        const fileName = `img_${currentUser.uid}_${Date.now()}_${i}.${file.name.split('.').pop()}`;
        const storageRef = ref(storage, `groups/${groupId}/posts/${fileName}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        uploadedUrls.push(url);
      }

      setNewPostImages((prev) => [...prev, ...uploadedUrls]);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingMedia(false);
      setUploadProgress(0);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !currentUser) return;

    if (newPostVideos.length + files.length > 2) {
      toast.error('Maximum 2 videos per post');
      return;
    }

    setUploadingMedia(true);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 100 * 1024 * 1024) {
          toast.error('Video must be under 100MB');
          continue;
        }

        setUploadProgress(Math.round(((i + 0.5) / files.length) * 100));

        const fileName = `vid_${currentUser.uid}_${Date.now()}_${i}.${file.name.split('.').pop()}`;
        const storageRef = ref(storage, `groups/${groupId}/posts/${fileName}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        uploadedUrls.push(url);

        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }

      setNewPostVideos((prev) => [...prev, ...uploadedUrls]);
      toast.success('Video uploaded!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload video');
    } finally {
      setUploadingMedia(false);
      setUploadProgress(0);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleCreatePost = async () => {
    if (!currentUser || !newPostContent.trim()) return;

    setPosting(true);

    const result = await createGroupPost(
      groupId,
      currentUser.uid,
      newPostContent.trim(),
      newPostImages,
      newPostVideos
    );

    if (result.success) {
      toast.success('Posted to circle!');
      setNewPostContent('');
      setNewPostImages([]);
      setNewPostVideos([]);
    } else {
      toast.error(result.error || 'Failed to post');
    }

    setPosting(false);
  };

  const handleReaction = async (postId: string, type: 'fire' | 'pineapple') => {
    if (!currentUser) return;

    const result = await reactToGroupPost(postId, type, currentUser.uid);
    if (result.success) {
      setUserReactions((prev) => ({
        ...prev,
        [postId]: {
          ...prev[postId],
          [type]: result.added,
        },
      }));
    }
  };

  const handleLeaveGroup = async () => {
    if (!currentUser || !window.confirm('Are you sure you want to leave this circle?')) return;

    const result = await leaveGroup(groupId, currentUser.uid);
    if (result.success) {
      toast.success('Left the circle');
      router.push('/groups');
    } else {
      toast.error(result.error || 'Failed to leave');
    }
  };

  const handleApproveMember = async (memberId: string) => {
    const result = await approveMember(groupId, memberId);
    if (result.success) {
      toast.success('Member approved!');
      setPendingMembers((prev) => prev.filter((m) => m.memberId !== memberId));
      const approved = await getGroupMembers(groupId, 'approved');
      setMembers(approved);
    }
  };

  const handleRejectMember = async (memberId: string) => {
    const result = await rejectMember(groupId, memberId);
    if (result.success) {
      toast.success('Request rejected');
      setPendingMembers((prev) => prev.filter((m) => m.memberId !== memberId));
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('Remove this member from the circle?')) return;

    const result = await removeMember(groupId, memberId);
    if (result.success) {
      toast.success('Member removed');
      setMembers((prev) => prev.filter((m) => m.memberId !== memberId));
    }
  };

  const handlePromoteToAdmin = async (memberId: string) => {
    const result = await updateMemberRole(groupId, memberId, 'admin');
    if (result.success) {
      toast.success('Promoted to admin!');
      setMembers((prev) =>
        prev.map((m) => (m.memberId === memberId ? { ...m, role: 'admin' } : m))
      );
    }
  };

  const isOwnerOrAdmin = membership?.role === 'owner' || membership?.role === 'admin';
  const isOwner = membership?.role === 'owner';

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="min-h-screen bg-charcoal">
      <Toaster theme="dark" position="top-right" />

      {/* Hero Section with Glassmorphic Nav */}
      <div className="relative">
        {/* Cover Image */}
        <div className="h-64 md:h-80 bg-gradient-to-br from-gold/30 via-darkBlue to-charcoal relative overflow-hidden">
          {group.coverImage ? (
            <img
              src={group.coverImage}
              alt={group.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-gold/20 backdrop-blur-xl flex items-center justify-center border border-gold/30">
                <span className="text-6xl font-heading text-gold">{group.name[0]}</span>
              </div>
            </div>
          )}
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/50 to-transparent"></div>
        </div>

        {/* Glassmorphic Navigation Bar */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="max-w-6xl mx-auto px-6">
            <div className="bg-charcoal/80 backdrop-blur-xl border border-gold/20 rounded-t-2xl p-6">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                {/* Group Info */}
                <div>
                  <Link href="/groups" className="text-gold/60 hover:text-gold text-sm font-body mb-2 inline-block">
                    ← All Circles
                  </Link>
                  <h1 className="text-3xl md:text-4xl font-heading text-gold">{group.name}</h1>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-offWhite/60 text-sm font-body">
                      {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-body ${
                      group.privacy === 'public'
                        ? 'bg-green-500/20 text-green-400'
                        : group.privacy === 'private'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-purple-500/20 text-purple-400'
                    }`}>
                      {group.privacy.charAt(0).toUpperCase() + group.privacy.slice(1)}
                    </span>
                    {membership?.role === 'owner' && (
                      <span className="px-2 py-0.5 bg-gold text-charcoal text-xs font-semibold rounded-full">
                        Owner
                      </span>
                    )}
                    {membership?.role === 'admin' && (
                      <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-semibold rounded-full">
                        Admin
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                {membership?.status === 'approved' && (
                  <div className="flex items-center gap-3">
                    {!isOwner && (
                      <button
                        onClick={handleLeaveGroup}
                        className="px-4 py-2 border border-red-500/30 text-red-400 text-sm rounded-full hover:bg-red-500/10 transition-colors"
                      >
                        Leave Circle
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Tab Navigation */}
              <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-2">
                {['feed', 'members', 'media'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as TabType)}
                    className={`px-5 py-2 rounded-full font-body text-sm whitespace-nowrap transition-all ${
                      activeTab === tab
                        ? 'bg-gold text-charcoal'
                        : 'bg-white/5 text-offWhite/60 hover:bg-white/10'
                    }`}
                    data-testid={`tab-${tab}`}
                  >
                    {tab === 'feed' && 'Feed'}
                    {tab === 'members' && `Members (${members.length})`}
                    {tab === 'media' && 'Media Vault'}
                  </button>
                ))}
                {pendingMembers.length > 0 && isOwnerOrAdmin && (
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-5 py-2 rounded-full font-body text-sm whitespace-nowrap transition-all ${
                      activeTab === 'settings'
                        ? 'bg-gold text-charcoal'
                        : 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                    }`}
                  >
                    Pending ({pendingMembers.length})
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Not a member message */}
        {(!membership || membership.status === 'pending') && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gold" fill="none" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-heading text-gold mb-2">
              {membership?.status === 'pending' ? 'Membership Pending' : 'Members Only'}
            </h2>
            <p className="text-offWhite/60 font-body">
              {membership?.status === 'pending'
                ? 'Your join request is awaiting approval'
                : 'You need to be a member to view this circle'}
            </p>
          </div>
        )}

        {/* Feed Tab */}
        {activeTab === 'feed' && membership?.status === 'approved' && (
          <div className="max-w-2xl mx-auto">
            {/* Create Post */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-darkBlue/40 border border-gold/10 rounded-2xl p-6 mb-8"
            >
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Share something with the circle..."
                rows={3}
                className="w-full bg-transparent text-offWhite font-body resize-none focus:outline-none"
                data-testid="group-post-input"
              />

              {/* Media Previews */}
              {(newPostImages.length > 0 || newPostVideos.length > 0) && (
                <div className="flex flex-wrap gap-2 mt-4 mb-4">
                  {newPostImages.map((url, idx) => (
                    <div key={`img-${idx}`} className="relative group">
                      <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg" />
                      <button
                        onClick={() => setNewPostImages((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {newPostVideos.map((url, idx) => (
                    <div key={`vid-${idx}`} className="relative group">
                      <div className="w-24 h-20 bg-charcoal rounded-lg flex items-center justify-center relative overflow-hidden">
                        <video src={url} className="w-full h-full object-cover" muted />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <svg className="w-8 h-8 text-gold" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                      <button
                        onClick={() => setNewPostVideos((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Progress */}
              {uploadingMedia && (
                <div className="mb-4">
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gold transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-offWhite/40 text-xs mt-1 font-body">Uploading... {uploadProgress}%</p>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-gold/10 pt-4 mt-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadingMedia || newPostImages.length >= 4}
                    className="p-2 rounded-lg bg-white/5 text-offWhite/60 hover:text-gold hover:bg-gold/10 transition-colors disabled:opacity-50"
                    title="Add Image"
                  >
                    <svg className="w-5 h-5" fill="none" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => videoInputRef.current?.click()}
                    disabled={uploadingMedia || newPostVideos.length >= 2}
                    className="p-2 rounded-lg bg-white/5 text-offWhite/60 hover:text-gold hover:bg-gold/10 transition-colors disabled:opacity-50"
                    title="Add Video"
                  >
                    <svg className="w-5 h-5" fill="none" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>

                <button
                  onClick={handleCreatePost}
                  disabled={posting || uploadingMedia || !newPostContent.trim()}
                  className="px-6 py-2 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all disabled:opacity-50"
                  data-testid="group-post-submit"
                >
                  {posting ? 'Posting...' : 'Post'}
                </button>
              </div>

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/mov"
                multiple
                onChange={handleVideoUpload}
                className="hidden"
              />
            </motion.div>

            {/* Posts */}
            <div className="space-y-6">
              {posts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-offWhite/40 font-body">No posts yet. Be the first to share!</p>
                </div>
              ) : (
                posts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-darkBlue/40 border border-gold/10 rounded-2xl overflow-hidden"
                    data-testid={`group-post-${post.id}`}
                  >
                    {/* Post Header */}
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {post.authorPhoto ? (
                          <img
                            src={post.authorPhoto}
                            alt={post.authorUsername}
                            className="w-10 h-10 rounded-full object-cover border border-gold/20"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                            <span className="text-gold font-heading">{post.authorUsername[0]}</span>
                          </div>
                        )}
                        <div>
                          <p className="text-offWhite font-body font-semibold">{post.authorUsername}</p>
                          <p className="text-offWhite/40 text-xs">
                            {post.createdAt.toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {(post.authorId === currentUser?.uid || isOwnerOrAdmin) && (
                        <button
                          onClick={() => {
                            if (window.confirm('Delete this post?')) {
                              deleteGroupPost(post.id, currentUser.uid, groupId);
                            }
                          }}
                          className="p-2 text-offWhite/40 hover:text-red-400 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Post Content */}
                    <div className="px-4 pb-4">
                      <p className="text-offWhite font-body whitespace-pre-wrap">{post.content}</p>
                    </div>

                    {/* Images */}
                    {post.images.length > 0 && (
                      <div className={`grid gap-1 ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {post.images.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt=""
                            className="w-full aspect-square object-cover"
                          />
                        ))}
                      </div>
                    )}

                    {/* Videos - Premium Player UI */}
                    {post.videos.length > 0 && (
                      <div className="space-y-2">
                        {post.videos.map((url, idx) => (
                          <div key={idx} className="relative bg-black">
                            <video
                              src={url}
                              controls
                              className="w-full max-h-[500px]"
                              preload="metadata"
                              poster=""
                            />
                            {/* Premium badge */}
                            <div className="absolute top-3 right-3 px-2 py-1 bg-gold/90 text-charcoal text-xs font-semibold rounded-full">
                              HD
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reactions */}
                    <div className="p-4 border-t border-gold/10 flex items-center gap-4">
                      <button
                        onClick={() => handleReaction(post.id, 'fire')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
                          userReactions[post.id]?.fire
                            ? 'bg-orange-500/20 text-orange-400'
                            : 'bg-white/5 text-offWhite/60 hover:bg-orange-500/10'
                        }`}
                      >
                        <span>🔥</span>
                        <span className="text-sm">{post.reactions.fire}</span>
                      </button>
                      <button
                        onClick={() => handleReaction(post.id, 'pineapple')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
                          userReactions[post.id]?.pineapple
                            ? 'bg-gold/20 text-gold'
                            : 'bg-white/5 text-offWhite/60 hover:bg-gold/10'
                        }`}
                      >
                        <span>🍍</span>
                        <span className="text-sm">{post.reactions.pineapple}</span>
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && membership?.status === 'approved' && (
          <div className="max-w-2xl mx-auto">
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-darkBlue/40 border border-gold/10 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    {member.photoUrl ? (
                      <img
                        src={member.photoUrl}
                        alt={member.username}
                        className="w-12 h-12 rounded-full object-cover border border-gold/20"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center">
                        <span className="text-gold font-heading">{member.username[0]}</span>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-offWhite font-body font-semibold">{member.username}</p>
                        {member.role === 'owner' && (
                          <span className="px-2 py-0.5 bg-gold text-charcoal text-xs font-semibold rounded-full">
                            Owner
                          </span>
                        )}
                        {member.role === 'admin' && (
                          <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-semibold rounded-full">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-offWhite/40 text-xs">
                        Joined {member.joinedAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {isOwner && member.role !== 'owner' && (
                    <div className="flex items-center gap-2">
                      {member.role !== 'admin' && (
                        <button
                          onClick={() => handlePromoteToAdmin(member.memberId)}
                          className="px-3 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-full hover:bg-blue-500/30"
                        >
                          Make Admin
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveMember(member.memberId)}
                        className="px-3 py-1 text-xs bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/30"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Media Vault Tab */}
        {activeTab === 'media' && membership?.status === 'approved' && (
          <div>
            {/* Filter */}
            <div className="flex items-center gap-2 mb-6">
              {['all', 'image', 'video'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    setMediaFilter(filter as any);
                    loadMedia();
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-body transition-all ${
                    mediaFilter === filter
                      ? 'bg-gold text-charcoal'
                      : 'bg-white/5 text-offWhite/60 hover:bg-white/10'
                  }`}
                >
                  {filter === 'all' ? 'All Media' : filter === 'image' ? 'Photos' : 'Videos'}
                </button>
              ))}
            </div>

            {media.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-gold" fill="none" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-heading text-gold mb-2">No Media Yet</h2>
                <p className="text-offWhite/60 font-body">
                  Photos and videos shared in the circle will appear here
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {media.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="aspect-square bg-darkBlue/40 rounded-xl overflow-hidden group cursor-pointer relative"
                  >
                    {item.type === 'image' ? (
                      <img
                        src={item.url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="relative w-full h-full">
                        <video
                          src={item.url}
                          className="w-full h-full object-cover"
                          muted
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <div className="w-12 h-12 rounded-full bg-gold/90 flex items-center justify-center">
                            <svg className="w-6 h-6 text-charcoal ml-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-charcoal/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <p className="text-offWhite text-sm font-body truncate">
                        By {item.authorUsername}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pending Members Tab (Admin/Owner only) */}
        {activeTab === 'settings' && isOwnerOrAdmin && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-heading text-gold mb-6">Pending Requests</h2>
            
            {pendingMembers.length === 0 ? (
              <p className="text-offWhite/60 font-body text-center py-8">
                No pending membership requests
              </p>
            ) : (
              <div className="space-y-3">
                {pendingMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-darkBlue/40 border border-yellow-500/20 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      {member.photoUrl ? (
                        <img
                          src={member.photoUrl}
                          alt={member.username}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center">
                          <span className="text-gold font-heading">{member.username[0]}</span>
                        </div>
                      )}
                      <p className="text-offWhite font-body font-semibold">{member.username}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApproveMember(member.memberId)}
                        className="px-4 py-2 bg-green-500/20 text-green-400 text-sm rounded-full hover:bg-green-500/30 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectMember(member.memberId)}
                        className="px-4 py-2 bg-red-500/20 text-red-400 text-sm rounded-full hover:bg-red-500/30 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
