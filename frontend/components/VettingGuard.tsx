'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface VettingGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export default function VettingGuard({ children, fallback }: VettingGuardProps) {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'verified' | 'unverified' | 'unauthenticated'>('loading');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStatus('unauthenticated');
        router.push('/login');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'members', user.uid));
        
        if (!userDoc.exists()) {
          setStatus('unverified');
          router.push('/register');
          return;
        }

        const userData = userDoc.data();
        
        // Admins bypass verification check
        if (userData.role === 'admin') {
          setStatus('verified');
          return;
        }

        if (userData.isVerified === true) {
          setStatus('verified');
        } else {
          setStatus('unverified');
          router.push('/pending-approval');
        }
      } catch (error) {
        console.error('Error checking verification:', error);
        setStatus('unverified');
        router.push('/pending-approval');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Show loading state
  if (status === 'loading') {
    return fallback || (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-offWhite/60 font-body">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Only render children if verified
  if (status === 'verified') {
    return <>{children}</>;
  }

  // For other states (redirecting), show loading
  return fallback || (
    <div className="min-h-screen bg-charcoal flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-offWhite/60 font-body">Redirecting...</p>
      </div>
    </div>
  );
}
