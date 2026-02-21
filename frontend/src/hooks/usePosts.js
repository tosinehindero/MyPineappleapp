import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc,
  limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Hook to fetch and manage posts from the 'posts' collection
 * @returns {Object} - { posts, loading, error, createPost }
 */
export const usePosts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    try {
      const postsRef = collection(db, 'posts');
      const q = query(postsRef, orderBy('createdAt', 'desc'), limit(50));

      const unsubscribe = onSnapshot(
        q,
        async (snapshot) => {
          try {
            const postsData = [];
            
            for (const docSnap of snapshot.docs) {
              const postData = { id: docSnap.id, ...docSnap.data() };
              
              // Fetch author info from members collection if authorId exists and no embedded profile
              if (postData.authorId && !postData.authorProfile) {
                try {
                  const memberRef = doc(db, 'members', postData.authorId);
                  const memberSnap = await getDoc(memberRef);
                  if (memberSnap.exists()) {
                    postData.authorProfile = memberSnap.data();
                  }
                } catch (err) {
                  console.error('Error fetching author profile:', err);
                }
              }
              
              postsData.push(postData);
            }
            
            setPosts(postsData);
            setLoading(false);
          } catch (err) {
            console.error('Error processing posts:', err);
            setError(err);
            setLoading(false);
          }
        },
        (err) => {
          console.error('Error fetching posts:', err);
          setError(err);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up posts listener:', err);
      setError(err);
      setLoading(false);
    }
  }, []);

  const createPost = useCallback(async (content, authorId, authorProfile) => {
    try {
      const postsRef = collection(db, 'posts');
      const newPost = {
        content,
        authorId,
        authorProfile: {
          displayName: authorProfile?.displayName || 'Anonymous',
          photoURL: authorProfile?.photoURL || null,
          isVerified: authorProfile?.isVerified || false,
        },
        createdAt: serverTimestamp(),
        likes: 0,
        comments: [],
      };
      
      console.log('Creating post:', newPost);
      const docRef = await addDoc(postsRef, newPost);
      console.log('Post created with ID:', docRef.id);
      return { id: docRef.id, ...newPost };
    } catch (err) {
      console.error('Error creating post:', err);
      throw err;
    }
  }, []);

  return { posts, loading, error, createPost };
};

export default usePosts;
