import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface VerificationStatus {
  isLoading: boolean;
  isAuthenticated: boolean;
  isVerified: boolean;
  userId: string | null;
  username: string | null;
}

export function useVerificationGuard(redirectIfUnverified: boolean = true): VerificationStatus {
  const router = useRouter();
  const [status, setStatus] = useState<VerificationStatus>({
    isLoading: true,
    isAuthenticated: false,
    isVerified: false,
    userId: null,
    username: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Not authenticated - redirect to login
        setStatus({
          isLoading: false,
          isAuthenticated: false,
          isVerified: false,
          userId: null,
          username: null,
        });
        router.push('/login');
        return;
      }

      try {
        // Fetch user profile from Firestore
        const userDoc = await getDoc(doc(db, 'members', user.uid));
        
        if (!userDoc.exists()) {
          // No profile found - redirect to registration
          setStatus({
            isLoading: false,
            isAuthenticated: true,
            isVerified: false,
            userId: user.uid,
            username: null,
          });
          router.push('/register');
          return;
        }

        const userData = userDoc.data();
        const isVerified = userData.isVerified === true;
        const isAdmin = userData.role === 'admin';

        // Admins bypass verification check
        if (isAdmin) {
          setStatus({
            isLoading: false,
            isAuthenticated: true,
            isVerified: true,
            userId: user.uid,
            username: userData.username || null,
          });
          return;
        }

        setStatus({
          isLoading: false,
          isAuthenticated: true,
          isVerified,
          userId: user.uid,
          username: userData.username || null,
        });

        // Redirect unverified users to pending approval page
        if (redirectIfUnverified && !isVerified) {
          router.push('/pending-approval');
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
        setStatus({
          isLoading: false,
          isAuthenticated: true,
          isVerified: false,
          userId: user.uid,
          username: null,
        });
      }
    });

    return () => unsubscribe();
  }, [router, redirectIfUnverified]);

  return status;
}

// Function to manually check verification status (for refresh button)
export async function checkVerificationStatus(userId: string): Promise<{
  isVerified: boolean;
  status: string;
}> {
  try {
    const userDoc = await getDoc(doc(db, 'members', userId));
    
    if (!userDoc.exists()) {
      return { isVerified: false, status: 'not_found' };
    }

    const userData = userDoc.data();
    return {
      isVerified: userData.isVerified === true,
      status: userData.status || 'pending',
    };
  } catch (error) {
    console.error('Error checking verification:', error);
    return { isVerified: false, status: 'error' };
  }
}
