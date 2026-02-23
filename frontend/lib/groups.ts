'use client';

import { db, storage } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  increment,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// ============================================
// TYPES
// ============================================

export type GroupPrivacy = 'public' | 'private' | 'secret';
export type MemberRole = 'owner' | 'admin' | 'member';
export type MemberStatus = 'approved' | 'pending';

export interface Group {
  id: string;
  name: string;
  description: string;
  coverImage: string | null;
  privacy: GroupPrivacy;
  vettingRequired: boolean;
  ownerId: string;
  ownerUsername: string;
  ownerPhoto: string | null;
  memberCount: number;
  createdAt: Date;
}

export interface GroupMember {
  id: string;
  groupId: string;
  memberId: string;
  username: string;
  photoUrl: string | null;
  role: MemberRole;
  status: MemberStatus;
  joinedAt: Date;
}

export interface GroupPost {
  id: string;
  groupId: string;
  authorId: string;
  authorUsername: string;
  authorPhoto: string | null;
  content: string;
  images: string[];
  videos: string[];
  reactions: {
    fire: number;
    pineapple: number;
  };
  commentCount: number;
  createdAt: Date;
}

export interface GroupMedia {
  id: string;
  postId: string;
  groupId: string;
  type: 'image' | 'video';
  url: string;
  authorId: string;
  authorUsername: string;
  createdAt: Date;
}

// ============================================
// ACCESS CONTROL
// ============================================

/**
 * Check if user can create groups (Premium or Founder only)
 */
export function canCreateGroup(tier: string, isFounder: boolean): boolean {
  return tier === 'premium' || isFounder === true;
}

/**
 * Check if user can join groups (Basic tier or above)
 */
export function canJoinGroup(tier: string): boolean {
  return tier === 'basic' || tier === 'premium';
}

// ============================================
// GROUP CRUD
// ============================================

/**
 * Create a new group
 */
export async function createGroup(
  userId: string,
  name: string,
  description: string,
  privacy: GroupPrivacy,
  vettingRequired: boolean,
  coverImageFile?: File
): Promise<{ success: boolean; groupId?: string; error?: string }> {
  try {
    // Get user profile
    const userDoc = await getDoc(doc(db, 'members', userId));
    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Upload cover image if provided
    let coverImageUrl: string | null = null;
    if (coverImageFile) {
      const fileName = `cover_${groupId}.${coverImageFile.name.split('.').pop()}`;
      const storageRef = ref(storage, `groups/${groupId}/${fileName}`);
      await uploadBytes(storageRef, coverImageFile);
      coverImageUrl = await getDownloadURL(storageRef);
    }

    // Create group document
    await setDoc(doc(db, 'groups', groupId), {
      name,
      description,
      coverImage: coverImageUrl,
      privacy,
      vettingRequired,
      ownerId: userId,
      ownerUsername: userData.username || 'Anonymous',
      ownerPhoto: userData.photoUrls?.[0] || null,
      memberCount: 1,
      createdAt: serverTimestamp(),
    });

    // Add owner as first member
    await setDoc(doc(db, 'groupMembers', `${groupId}_${userId}`), {
      groupId,
      memberId: userId,
      username: userData.username || 'Anonymous',
      photoUrl: userData.photoUrls?.[0] || null,
      role: 'owner',
      status: 'approved',
      joinedAt: serverTimestamp(),
    });

    return { success: true, groupId };
  } catch (error: any) {
    console.error('Error creating group:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get a single group by ID
 */
export async function getGroup(groupId: string): Promise<Group | null> {
  try {
    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    if (!groupDoc.exists()) return null;

    const data = groupDoc.data();
    return {
      id: groupDoc.id,
      name: data.name || '',
      description: data.description || '',
      coverImage: data.coverImage || null,
      privacy: data.privacy || 'public',
      vettingRequired: data.vettingRequired || false,
      ownerId: data.ownerId || '',
      ownerUsername: data.ownerUsername || 'Anonymous',
      ownerPhoto: data.ownerPhoto || null,
      memberCount: data.memberCount || 0,
      createdAt: data.createdAt?.toDate() || new Date(),
    };
  } catch (error) {
    console.error('Error fetching group:', error);
    return null;
  }
}

/**
 * Get all public groups
 */
export async function getPublicGroups(): Promise<Group[]> {
  try {
    const groupsQuery = query(
      collection(db, 'groups'),
      where('privacy', 'in', ['public', 'private']),
      orderBy('memberCount', 'desc'),
      limit(50)
    );

    const snapshot = await getDocs(groupsQuery);
    const groups: Group[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      groups.push({
        id: docSnap.id,
        name: data.name || '',
        description: data.description || '',
        coverImage: data.coverImage || null,
        privacy: data.privacy || 'public',
        vettingRequired: data.vettingRequired || false,
        ownerId: data.ownerId || '',
        ownerUsername: data.ownerUsername || 'Anonymous',
        ownerPhoto: data.ownerPhoto || null,
        memberCount: data.memberCount || 0,
        createdAt: data.createdAt?.toDate() || new Date(),
      });
    });

    return groups;
  } catch (error) {
    console.error('Error fetching public groups:', error);
    return [];
  }
}

/**
 * Get groups user is a member of
 */
export async function getUserGroups(userId: string): Promise<Group[]> {
  try {
    // Get all memberships
    const membershipsQuery = query(
      collection(db, 'groupMembers'),
      where('memberId', '==', userId),
      where('status', '==', 'approved')
    );

    const membershipSnap = await getDocs(membershipsQuery);
    const groupIds: string[] = [];

    membershipSnap.forEach((docSnap) => {
      groupIds.push(docSnap.data().groupId);
    });

    if (groupIds.length === 0) return [];

    // Fetch group details
    const groups: Group[] = [];
    for (const groupId of groupIds) {
      const group = await getGroup(groupId);
      if (group) groups.push(group);
    }

    return groups;
  } catch (error) {
    console.error('Error fetching user groups:', error);
    return [];
  }
}

/**
 * Update group details
 */
export async function updateGroup(
  groupId: string,
  updates: Partial<Pick<Group, 'name' | 'description' | 'privacy' | 'vettingRequired'>>,
  coverImageFile?: File
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = { ...updates };

    // Upload new cover image if provided
    if (coverImageFile) {
      const fileName = `cover_${groupId}_${Date.now()}.${coverImageFile.name.split('.').pop()}`;
      const storageRef = ref(storage, `groups/${groupId}/${fileName}`);
      await uploadBytes(storageRef, coverImageFile);
      updateData.coverImage = await getDownloadURL(storageRef);
    }

    await updateDoc(doc(db, 'groups', groupId), updateData);
    return { success: true };
  } catch (error: any) {
    console.error('Error updating group:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a group
 */
export async function deleteGroup(groupId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete all members
    const membersQuery = query(collection(db, 'groupMembers'), where('groupId', '==', groupId));
    const membersSnap = await getDocs(membersQuery);
    for (const memberDoc of membersSnap.docs) {
      await deleteDoc(memberDoc.ref);
    }

    // Delete all posts
    const postsQuery = query(collection(db, 'groupPosts'), where('groupId', '==', groupId));
    const postsSnap = await getDocs(postsQuery);
    for (const postDoc of postsSnap.docs) {
      await deleteDoc(postDoc.ref);
    }

    // Delete group
    await deleteDoc(doc(db, 'groups', groupId));

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting group:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// MEMBERSHIP
// ============================================

/**
 * Get user's membership in a group
 */
export async function getGroupMembership(
  groupId: string,
  userId: string
): Promise<GroupMember | null> {
  try {
    const memberDoc = await getDoc(doc(db, 'groupMembers', `${groupId}_${userId}`));
    if (!memberDoc.exists()) return null;

    const data = memberDoc.data();
    return {
      id: memberDoc.id,
      groupId: data.groupId,
      memberId: data.memberId,
      username: data.username || 'Anonymous',
      photoUrl: data.photoUrl || null,
      role: data.role || 'member',
      status: data.status || 'pending',
      joinedAt: data.joinedAt?.toDate() || new Date(),
    };
  } catch (error) {
    console.error('Error fetching membership:', error);
    return null;
  }
}

/**
 * Join a group
 */
export async function joinGroup(
  groupId: string,
  userId: string
): Promise<{ success: boolean; status: MemberStatus; error?: string }> {
  try {
    // Get user profile
    const userDoc = await getDoc(doc(db, 'members', userId));
    if (!userDoc.exists()) {
      return { success: false, status: 'pending', error: 'User not found' };
    }

    // Get group details
    const group = await getGroup(groupId);
    if (!group) {
      return { success: false, status: 'pending', error: 'Group not found' };
    }

    const userData = userDoc.data();
    const status: MemberStatus = group.vettingRequired ? 'pending' : 'approved';

    // Create membership
    await setDoc(doc(db, 'groupMembers', `${groupId}_${userId}`), {
      groupId,
      memberId: userId,
      username: userData.username || 'Anonymous',
      photoUrl: userData.photoUrls?.[0] || null,
      role: 'member',
      status,
      joinedAt: serverTimestamp(),
    });

    // Increment member count if approved
    if (status === 'approved') {
      await updateDoc(doc(db, 'groups', groupId), {
        memberCount: increment(1),
      });
    }

    return { success: true, status };
  } catch (error: any) {
    console.error('Error joining group:', error);
    return { success: false, status: 'pending', error: error.message };
  }
}

/**
 * Leave a group
 */
export async function leaveGroup(
  groupId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const membership = await getGroupMembership(groupId, userId);
    if (!membership) {
      return { success: false, error: 'Not a member' };
    }

    // Owner cannot leave
    if (membership.role === 'owner') {
      return { success: false, error: 'Owner cannot leave. Transfer ownership or delete the group.' };
    }

    // Delete membership
    await deleteDoc(doc(db, 'groupMembers', `${groupId}_${userId}`));

    // Decrement member count if was approved
    if (membership.status === 'approved') {
      await updateDoc(doc(db, 'groups', groupId), {
        memberCount: increment(-1),
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error leaving group:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all members of a group
 */
export async function getGroupMembers(
  groupId: string,
  statusFilter?: MemberStatus
): Promise<GroupMember[]> {
  try {
    let membersQuery;
    if (statusFilter) {
      membersQuery = query(
        collection(db, 'groupMembers'),
        where('groupId', '==', groupId),
        where('status', '==', statusFilter)
      );
    } else {
      membersQuery = query(
        collection(db, 'groupMembers'),
        where('groupId', '==', groupId)
      );
    }

    const snapshot = await getDocs(membersQuery);
    const members: GroupMember[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      members.push({
        id: docSnap.id,
        groupId: data.groupId,
        memberId: data.memberId,
        username: data.username || 'Anonymous',
        photoUrl: data.photoUrl || null,
        role: data.role || 'member',
        status: data.status || 'pending',
        joinedAt: data.joinedAt?.toDate() || new Date(),
      });
    });

    // Sort: owner first, then admins, then members
    const roleOrder = { owner: 0, admin: 1, member: 2 };
    members.sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);

    return members;
  } catch (error) {
    console.error('Error fetching group members:', error);
    return [];
  }
}

/**
 * Approve a pending member
 */
export async function approveMember(
  groupId: string,
  memberId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc(doc(db, 'groupMembers', `${groupId}_${memberId}`), {
      status: 'approved',
    });

    await updateDoc(doc(db, 'groups', groupId), {
      memberCount: increment(1),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error approving member:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reject a pending member
 */
export async function rejectMember(
  groupId: string,
  memberId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, 'groupMembers', `${groupId}_${memberId}`));
    return { success: true };
  } catch (error: any) {
    console.error('Error rejecting member:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove a member from group
 */
export async function removeMember(
  groupId: string,
  memberId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const membership = await getGroupMembership(groupId, memberId);
    if (!membership) {
      return { success: false, error: 'Member not found' };
    }

    if (membership.role === 'owner') {
      return { success: false, error: 'Cannot remove the owner' };
    }

    await deleteDoc(doc(db, 'groupMembers', `${groupId}_${memberId}`));

    if (membership.status === 'approved') {
      await updateDoc(doc(db, 'groups', groupId), {
        memberCount: increment(-1),
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error removing member:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update member role (promote to admin or demote to member)
 */
export async function updateMemberRole(
  groupId: string,
  memberId: string,
  newRole: 'admin' | 'member'
): Promise<{ success: boolean; error?: string }> {
  try {
    const membership = await getGroupMembership(groupId, memberId);
    if (!membership) {
      return { success: false, error: 'Member not found' };
    }

    if (membership.role === 'owner') {
      return { success: false, error: 'Cannot change owner role' };
    }

    await updateDoc(doc(db, 'groupMembers', `${groupId}_${memberId}`), {
      role: newRole,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error updating member role:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Invite user to a secret group
 */
export async function inviteToGroup(
  groupId: string,
  inviterId: string,
  inviteeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if inviter has permission
    const inviterMembership = await getGroupMembership(groupId, inviterId);
    if (!inviterMembership || !['owner', 'admin'].includes(inviterMembership.role)) {
      return { success: false, error: 'No permission to invite' };
    }

    // Check if invitee is already a member
    const existingMembership = await getGroupMembership(groupId, inviteeId);
    if (existingMembership) {
      return { success: false, error: 'User is already a member or has a pending invitation' };
    }

    // Get invitee profile
    const inviteeDoc = await getDoc(doc(db, 'members', inviteeId));
    if (!inviteeDoc.exists()) {
      return { success: false, error: 'User not found' };
    }

    const inviteeData = inviteeDoc.data();

    // Create membership as approved (invited users skip vetting)
    await setDoc(doc(db, 'groupMembers', `${groupId}_${inviteeId}`), {
      groupId,
      memberId: inviteeId,
      username: inviteeData.username || 'Anonymous',
      photoUrl: inviteeData.photoUrls?.[0] || null,
      role: 'member',
      status: 'approved',
      invitedBy: inviterId,
      joinedAt: serverTimestamp(),
    });

    await updateDoc(doc(db, 'groups', groupId), {
      memberCount: increment(1),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error inviting to group:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// GROUP POSTS
// ============================================

/**
 * Create a post in a group
 */
export async function createGroupPost(
  groupId: string,
  userId: string,
  content: string,
  images: string[] = [],
  videos: string[] = []
): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    // Verify membership
    const membership = await getGroupMembership(groupId, userId);
    if (!membership || membership.status !== 'approved') {
      return { success: false, error: 'Not a member of this group' };
    }

    // Get user profile
    const userDoc = await getDoc(doc(db, 'members', userId));
    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const postId = `gpost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await setDoc(doc(db, 'groupPosts', postId), {
      groupId,
      authorId: userId,
      authorUsername: userData.username || 'Anonymous',
      authorPhoto: userData.photoUrls?.[0] || null,
      content,
      images,
      videos,
      reactions: { fire: 0, pineapple: 0 },
      commentCount: 0,
      createdAt: serverTimestamp(),
    });

    return { success: true, postId };
  } catch (error: any) {
    console.error('Error creating group post:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get posts from a group
 */
export async function getGroupPosts(
  groupId: string,
  lastPostTimestamp?: Date,
  pageSize: number = 20
): Promise<{ posts: GroupPost[]; hasMore: boolean }> {
  try {
    let postsQuery;

    if (lastPostTimestamp) {
      const lastTimestamp = Timestamp.fromDate(lastPostTimestamp);
      postsQuery = query(
        collection(db, 'groupPosts'),
        where('groupId', '==', groupId),
        orderBy('createdAt', 'desc'),
        startAfter(lastTimestamp),
        limit(pageSize + 1)
      );
    } else {
      postsQuery = query(
        collection(db, 'groupPosts'),
        where('groupId', '==', groupId),
        orderBy('createdAt', 'desc'),
        limit(pageSize + 1)
      );
    }

    const snapshot = await getDocs(postsQuery);
    const posts: GroupPost[] = [];
    let hasMore = false;

    snapshot.docs.forEach((docSnap, index) => {
      if (index < pageSize) {
        const data = docSnap.data();
        posts.push({
          id: docSnap.id,
          groupId: data.groupId,
          authorId: data.authorId,
          authorUsername: data.authorUsername || 'Anonymous',
          authorPhoto: data.authorPhoto || null,
          content: data.content || '',
          images: data.images || [],
          videos: data.videos || [],
          reactions: data.reactions || { fire: 0, pineapple: 0 },
          commentCount: data.commentCount || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      } else {
        hasMore = true;
      }
    });

    return { posts, hasMore };
  } catch (error) {
    console.error('Error fetching group posts:', error);
    return { posts: [], hasMore: false };
  }
}

/**
 * React to a group post
 */
export async function reactToGroupPost(
  postId: string,
  reactionType: 'fire' | 'pineapple',
  userId: string
): Promise<{ success: boolean; added: boolean }> {
  try {
    const reactionId = `${postId}_${userId}_${reactionType}`;
    const reactionRef = doc(db, 'groupPostReactions', reactionId);
    const reactionDoc = await getDoc(reactionRef);

    const postRef = doc(db, 'groupPosts', postId);

    if (reactionDoc.exists()) {
      await deleteDoc(reactionRef);
      await updateDoc(postRef, {
        [`reactions.${reactionType}`]: increment(-1),
      });
      return { success: true, added: false };
    } else {
      await setDoc(reactionRef, {
        postId,
        userId,
        reactionType,
        createdAt: serverTimestamp(),
      });
      await updateDoc(postRef, {
        [`reactions.${reactionType}`]: increment(1),
      });
      return { success: true, added: true };
    }
  } catch (error) {
    console.error('Error reacting to group post:', error);
    return { success: false, added: false };
  }
}

/**
 * Delete a group post
 */
export async function deleteGroupPost(
  postId: string,
  userId: string,
  groupId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if user is author or has admin/owner role
    const postDoc = await getDoc(doc(db, 'groupPosts', postId));
    if (!postDoc.exists()) {
      return { success: false, error: 'Post not found' };
    }

    const postData = postDoc.data();
    const membership = await getGroupMembership(groupId, userId);

    const isAuthor = postData.authorId === userId;
    const isAdminOrOwner = membership && ['owner', 'admin'].includes(membership.role);

    if (!isAuthor && !isAdminOrOwner) {
      return { success: false, error: 'No permission to delete this post' };
    }

    await deleteDoc(doc(db, 'groupPosts', postId));
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting group post:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// MEDIA VAULT
// ============================================

/**
 * Get all media from a group (for Media Vault)
 */
export async function getGroupMedia(
  groupId: string,
  mediaType?: 'image' | 'video'
): Promise<GroupMedia[]> {
  try {
    const postsQuery = query(
      collection(db, 'groupPosts'),
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(postsQuery);
    const media: GroupMedia[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const postId = docSnap.id;
      const createdAt = data.createdAt?.toDate() || new Date();

      // Add images
      if (!mediaType || mediaType === 'image') {
        (data.images || []).forEach((url: string, idx: number) => {
          media.push({
            id: `${postId}_img_${idx}`,
            postId,
            groupId,
            type: 'image',
            url,
            authorId: data.authorId,
            authorUsername: data.authorUsername,
            createdAt,
          });
        });
      }

      // Add videos
      if (!mediaType || mediaType === 'video') {
        (data.videos || []).forEach((url: string, idx: number) => {
          media.push({
            id: `${postId}_vid_${idx}`,
            postId,
            groupId,
            type: 'video',
            url,
            authorId: data.authorId,
            authorUsername: data.authorUsername,
            createdAt,
          });
        });
      }
    });

    return media;
  } catch (error) {
    console.error('Error fetching group media:', error);
    return [];
  }
}

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

/**
 * Subscribe to group posts in real-time
 */
export function subscribeToGroupPosts(
  groupId: string,
  callback: (posts: GroupPost[]) => void,
  pageSize: number = 20
): () => void {
  const postsQuery = query(
    collection(db, 'groupPosts'),
    where('groupId', '==', groupId),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );

  const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
    const posts: GroupPost[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      posts.push({
        id: docSnap.id,
        groupId: data.groupId,
        authorId: data.authorId,
        authorUsername: data.authorUsername || 'Anonymous',
        authorPhoto: data.authorPhoto || null,
        content: data.content || '',
        images: data.images || [],
        videos: data.videos || [],
        reactions: data.reactions || { fire: 0, pineapple: 0 },
        commentCount: data.commentCount || 0,
        createdAt: data.createdAt?.toDate() || new Date(),
      });
    });

    callback(posts);
  });

  return unsubscribe;
}
