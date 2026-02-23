'use client';

import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  increment,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';

export interface Post {
  id: string;
  authorId: string;
  authorUsername: string;
  authorPhoto: string | null;
  authorVerified: boolean;
  content: string;
  images: string[];
  videos: string[];
  privacy: 'all' | 'circle';
  category: 'general' | 'travel' | 'events' | 'marketplace';
  reactions: {
    fire: number;
    pineapple: number;
  };
  commentCount: number;
  createdAt: Date;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorUsername: string;
  authorPhoto: string | null;
  authorVerified: boolean;
  content: string;
  parentId: string | null;
  createdAt: Date;
}

// Create a new post
export async function createPost(
  userId: string,
  content: string,
  images: string[],
  privacy: 'all' | 'circle',
  category: 'general' | 'travel' | 'events' | 'marketplace',
  videos: string[] = []
): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    // Get user profile
    const userDoc = await getDoc(doc(db, 'members', userId));
    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const postId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await setDoc(doc(db, 'posts', postId), {
      authorId: userId,
      authorUsername: userData.username || 'Anonymous',
      authorPhoto: userData.photoUrls?.[0] || null,
      authorVerified: userData.isVerified === true,
      content,
      images,
      videos,
      privacy,
      category,
      reactions: {
        fire: 0,
        pineapple: 0,
      },
      commentCount: 0,
      createdAt: serverTimestamp(),
    });

    return { success: true, postId };
  } catch (error: any) {
    console.error('Error creating post:', error);
    return { success: false, error: error.message };
  }
}

// Get posts with pagination
export async function getPosts(
  userId: string,
  category: string = 'all',
  lastPostTimestamp?: Date,
  pageSize: number = 10
): Promise<{ success: boolean; posts: Post[]; hasMore: boolean; error?: string }> {
  try {
    let postsQuery;

    if (category === 'all') {
      postsQuery = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(pageSize + 1)
      );
    } else {
      postsQuery = query(
        collection(db, 'posts'),
        where('category', '==', category),
        orderBy('createdAt', 'desc'),
        limit(pageSize + 1)
      );
    }

    // Apply pagination if we have a last timestamp
    if (lastPostTimestamp) {
      const lastTimestamp = Timestamp.fromDate(lastPostTimestamp);
      if (category === 'all') {
        postsQuery = query(
          collection(db, 'posts'),
          orderBy('createdAt', 'desc'),
          startAfter(lastTimestamp),
          limit(pageSize + 1)
        );
      } else {
        postsQuery = query(
          collection(db, 'posts'),
          where('category', '==', category),
          orderBy('createdAt', 'desc'),
          startAfter(lastTimestamp),
          limit(pageSize + 1)
        );
      }
    }

    const snapshot = await getDocs(postsQuery);
    const posts: Post[] = [];
    let hasMore = false;

    const docs = snapshot.docs;
    docs.forEach((docSnap, index) => {
      if (index < pageSize) {
        const data = docSnap.data();
        posts.push({
          id: docSnap.id,
          authorId: data.authorId || '',
          authorUsername: data.authorUsername || 'Anonymous',
          authorPhoto: data.authorPhoto || null,
          authorVerified: data.authorVerified || false,
          content: data.content || '',
          images: data.images || [],
          privacy: data.privacy || 'all',
          category: data.category || 'general',
          reactions: data.reactions || { fire: 0, pineapple: 0 },
          commentCount: data.commentCount || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      } else {
        hasMore = true;
      }
    });

    return { success: true, posts, hasMore };
  } catch (error: any) {
    console.error('Error fetching posts:', error);
    return { success: false, posts: [], hasMore: false, error: error.message };
  }
}

// React to a post
export async function reactToPost(
  postId: string,
  reactionType: 'fire' | 'pineapple',
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const reactionId = `${postId}_${userId}_${reactionType}`;
    const reactionRef = doc(db, 'postReactions', reactionId);
    const reactionDoc = await getDoc(reactionRef);

    const postRef = doc(db, 'posts', postId);

    if (reactionDoc.exists()) {
      // Remove reaction
      await deleteDoc(reactionRef);
      await updateDoc(postRef, {
        [`reactions.${reactionType}`]: increment(-1),
      });
    } else {
      // Add reaction
      await setDoc(reactionRef, {
        postId,
        userId,
        reactionType,
        createdAt: serverTimestamp(),
      });
      await updateDoc(postRef, {
        [`reactions.${reactionType}`]: increment(1),
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error reacting to post:', error);
    return { success: false, error: error.message };
  }
}

// Check user's reactions on posts
export async function getUserReactions(
  userId: string,
  postIds: string[]
): Promise<{ [postId: string]: { fire: boolean; pineapple: boolean } }> {
  try {
    const reactions: { [postId: string]: { fire: boolean; pineapple: boolean } } = {};

    // Initialize all posts with no reactions
    postIds.forEach((postId) => {
      reactions[postId] = { fire: false, pineapple: false };
    });

    // Query for user's reactions
    const reactionsQuery = query(
      collection(db, 'postReactions'),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(reactionsQuery);
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (postIds.includes(data.postId)) {
        reactions[data.postId][data.reactionType as 'fire' | 'pineapple'] = true;
      }
    });

    return reactions;
  } catch (error) {
    console.error('Error fetching user reactions:', error);
    return {};
  }
}

// Add a comment
export async function addComment(
  postId: string,
  userId: string,
  content: string,
  parentId: string | null = null
): Promise<{ success: boolean; commentId?: string; error?: string }> {
  try {
    // Get user profile
    const userDoc = await getDoc(doc(db, 'members', userId));
    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await setDoc(doc(db, 'comments', commentId), {
      postId,
      authorId: userId,
      authorUsername: userData.username || 'Anonymous',
      authorPhoto: userData.photoUrls?.[0] || null,
      authorVerified: userData.isVerified === true,
      content,
      parentId,
      createdAt: serverTimestamp(),
    });

    // Update comment count on post
    await updateDoc(doc(db, 'posts', postId), {
      commentCount: increment(1),
    });

    return { success: true, commentId };
  } catch (error: any) {
    console.error('Error adding comment:', error);
    return { success: false, error: error.message };
  }
}

// Get comments for a post
export async function getComments(
  postId: string
): Promise<{ success: boolean; comments: Comment[]; error?: string }> {
  try {
    const commentsQuery = query(
      collection(db, 'comments'),
      where('postId', '==', postId),
      orderBy('createdAt', 'asc')
    );

    const snapshot = await getDocs(commentsQuery);
    const comments: Comment[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      comments.push({
        id: docSnap.id,
        postId: data.postId || '',
        authorId: data.authorId || '',
        authorUsername: data.authorUsername || 'Anonymous',
        authorPhoto: data.authorPhoto || null,
        authorVerified: data.authorVerified || false,
        content: data.content || '',
        parentId: data.parentId || null,
        createdAt: data.createdAt?.toDate() || new Date(),
      });
    });

    return { success: true, comments };
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    return { success: false, comments: [], error: error.message };
  }
}

// Get upcoming events
export async function getUpcomingEvents(): Promise<{
  success: boolean;
  events: Array<{ id: string; title: string; date: Date; location: string }>;
}> {
  try {
    const eventsQuery = query(
      collection(db, 'events'),
      where('status', 'in', ['upcoming', 'ongoing']),
      where('isPrivate', '==', false),
      orderBy('date', 'asc'),
      limit(5)
    );

    const snapshot = await getDocs(eventsQuery);
    const events: Array<{ id: string; title: string; date: Date; location: string }> = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      events.push({
        id: docSnap.id,
        title: data.title,
        date: data.date?.toDate() || new Date(),
        location: data.location,
      });
    });

    // If no events found, return some sample events for demo
    if (events.length === 0) {
      return {
        success: true,
        events: [
          { id: 'demo1', title: 'Luxury Yacht Mixer', date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), location: 'Miami, FL' },
          { id: 'demo2', title: 'Private Wine Tasting', date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), location: 'Napa Valley, CA' },
        ],
      };
    }

    return { success: true, events };
  } catch (error) {
    console.error('Error fetching events:', error);
    // Return demo events on error
    return {
      success: true,
      events: [
        { id: 'demo1', title: 'Luxury Yacht Mixer', date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), location: 'Miami, FL' },
        { id: 'demo2', title: 'Private Wine Tasting', date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), location: 'Napa Valley, CA' },
      ],
    };
  }
}

// Get featured marketplace items
export async function getFeaturedListings(): Promise<{
  success: boolean;
  listings: Array<{ id: string; title: string; price: number; image: string | null }>;
}> {
  try {
    const listingsQuery = query(
      collection(db, 'marketplace_listings'),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc'),
      limit(3)
    );

    const snapshot = await getDocs(listingsQuery);
    const listings: Array<{ id: string; title: string; price: number; image: string | null }> = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      listings.push({
        id: docSnap.id,
        title: data.title,
        price: data.price,
        image: data.images?.[0] || null,
      });
    });

    return { success: true, listings };
  } catch (error) {
    return { success: true, listings: [] };
  }
}

// Real-time posts subscription
export function subscribeToPostsRealtime(
  category: string = 'all',
  callback: (posts: Post[]) => void,
  pageSize: number = 20
): () => void {
  let postsQuery;

  if (category === 'all') {
    postsQuery = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );
  } else {
    postsQuery = query(
      collection(db, 'posts'),
      where('category', '==', category),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );
  }

  const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
    const posts: Post[] = [];
    
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      posts.push({
        id: docSnap.id,
        authorId: data.authorId || '',
        authorUsername: data.authorUsername || 'Anonymous',
        authorPhoto: data.authorPhoto || null,
        authorVerified: data.authorVerified || false,
        content: data.content || '',
        images: data.images || [],
        privacy: data.privacy || 'all',
        category: data.category || 'general',
        reactions: data.reactions || { fire: 0, pineapple: 0 },
        commentCount: data.commentCount || 0,
        createdAt: data.createdAt?.toDate() || new Date(),
      });
    });

    callback(posts);
  }, (error) => {
    console.error('Error in posts subscription:', error);
  });

  return unsubscribe;
}
