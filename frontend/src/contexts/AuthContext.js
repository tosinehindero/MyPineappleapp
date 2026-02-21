import { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, ADMIN_UID } from '@/lib/firebase';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if current user is admin
  const isAdmin = () => {
    return user?.uid === ADMIN_UID;
  };

  // Fetch user profile from members collection
  const fetchProfile = async (uid) => {
    try {
      const memberRef = doc(db, 'members', uid);
      const memberSnap = await getDoc(memberRef);
      
      if (memberSnap.exists()) {
        const profileData = { id: memberSnap.id, ...memberSnap.data() };
        setProfile(profileData);
        return profileData;
      }
      return null;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  // Create or update member profile in Firestore
  const createOrUpdateProfile = async (uid, data) => {
    try {
      const memberRef = doc(db, 'members', uid);
      const memberSnap = await getDoc(memberRef);
      
      const isAdminUser = uid === ADMIN_UID;
      
      if (!memberSnap.exists()) {
        // Create new member document
        await setDoc(memberRef, {
          ...data,
          role: isAdminUser ? 'admin' : 'member',
          isVerified: isAdminUser ? true : false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        // Update existing member
        await setDoc(memberRef, {
          ...memberSnap.data(),
          ...data,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
      
      return await fetchProfile(uid);
    } catch (error) {
      console.error('Error creating/updating profile:', error);
      throw error;
    }
  };

  // Sign in with email/password
  const signIn = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await fetchProfile(result.user.uid);
      return result;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  // Sign up with email/password
  const signUp = async (email, password, displayName) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update Firebase Auth display name
      await updateProfile(result.user, { displayName });
      
      // Create member profile in Firestore
      await createOrUpdateProfile(result.user.uid, {
        email,
        displayName,
        photoURL: null,
      });
      
      return result;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await fetchProfile(firebaseUser.uid);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    profile,
    loading,
    isAdmin,
    signIn,
    signUp,
    signOut,
    fetchProfile,
    createOrUpdateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
