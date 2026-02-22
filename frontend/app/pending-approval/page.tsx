'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Link from 'next/link';

export default function PendingApprovalPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');
  const [status, setStatus] = useState<string>('pending');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }

      setUserId(user.uid);

      // Fetch current status
      try {
        const userDoc = await getDoc(doc(db, 'members', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUsername(data.username || user.email?.split('@')[0] || 'Member');
          setStatus(data.status || 'pending');

          // If already verified, redirect to home
          if (data.isVerified === true || data.role === 'admin') {
            router.push('/');
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleRefreshStatus = async () => {
    if (!userId || checking) return;

    setChecking(true);
    setLastChecked(new Date());

    try {
      const userDoc = await getDoc(doc(db, 'members', userId));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        setStatus(data.status || 'pending');

        if (data.isVerified === true) {
          // User has been verified! Redirect with celebration
          router.push('/?verified=true');
        }
      }
    } catch (error) {
      console.error('Error refreshing status:', error);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center p-6 overflow-hidden">
      {/* Background Decorations */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Radial gradient */}
        <div className="absolute inset-0 bg-gradient-radial from-gold/5 via-transparent to-transparent"></div>
        
        {/* Animated circles */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-gold/5 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-gold/5 blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 max-w-xl w-full text-center"
      >
        {/* Pulsing Pineapple Icon */}
        <motion.div
          className="mb-10"
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="relative inline-block">
            {/* Outer glow rings */}
            <motion.div
              className="absolute inset-0 rounded-full bg-gold/20"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{ width: '160px', height: '160px', left: '-20px', top: '-20px' }}
            />
            <motion.div
              className="absolute inset-0 rounded-full bg-gold/10"
              animate={{
                scale: [1, 2, 1],
                opacity: [0.3, 0, 0.3],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5,
              }}
              style={{ width: '160px', height: '160px', left: '-20px', top: '-20px' }}
            />
            
            {/* Main pineapple container */}
            <div className="w-32 h-32 bg-gradient-to-br from-gold/30 to-gold/10 rounded-full flex items-center justify-center border-2 border-gold/40 shadow-2xl">
              <motion.span
                className="text-gold font-heading text-4xl"
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                PP
              </motion.span>
            </div>
          </div>
        </motion.div>

        {/* Welcome Message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-4xl md:text-5xl font-heading text-gold mb-4">
            Welcome to PineapplePlay
          </h1>
          
          {username && (
            <p className="text-offWhite/80 font-body text-lg mb-2">
              Hello, <span className="text-gold">{username}</span>
            </p>
          )}
        </motion.div>

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-darkBlue/60 backdrop-blur-xl rounded-2xl border border-gold/20 p-8 mt-8 mb-8"
        >
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse"></div>
            <span className="text-yellow-400 font-body text-sm uppercase tracking-wider">
              {status === 'rejected' ? 'Action Required' : 'Review In Progress'}
            </span>
          </div>

          <p className="text-offWhite/90 font-body text-lg leading-relaxed mb-6">
            {status === 'rejected' ? (
              <>
                Your profile needs additional information. Please check your email or contact our support team for details on how to complete your verification.
              </>
            ) : (
              <>
                Our team is currently reviewing your profile to ensure the community remains <span className="text-gold">curated</span> and <span className="text-gold">secure</span>.
              </>
            )}
          </p>

          <p className="text-offWhite/60 font-body text-sm">
            This typically takes 24-48 hours. We appreciate your patience.
          </p>
        </motion.div>

        {/* Refresh Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="space-y-4"
        >
          <button
            onClick={handleRefreshStatus}
            disabled={checking}
            className="px-8 py-4 bg-gradient-to-r from-gold to-gold-light text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 mx-auto"
            data-testid="refresh-status-btn"
          >
            {checking ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Checking Status...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh Status</span>
              </>
            )}
          </button>

          {lastChecked && (
            <p className="text-offWhite/40 text-sm font-body">
              Last checked: {lastChecked.toLocaleTimeString()}
            </p>
          )}
        </motion.div>

        {/* Footer Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-12 pt-8 border-t border-gold/10"
        >
          <div className="flex items-center justify-center space-x-6 text-sm font-body">
            <Link
              href="/"
              className="text-offWhite/60 hover:text-gold transition-colors"
            >
              Return Home
            </Link>
            <span className="text-offWhite/20">•</span>
            <Link
              href="/messages"
              className="text-offWhite/60 hover:text-gold transition-colors"
            >
              Contact Support
            </Link>
            <span className="text-offWhite/20">•</span>
            <button
              onClick={() => auth.signOut()}
              className="text-offWhite/60 hover:text-red-400 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </motion.div>

        {/* Decorative Bottom Element */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="mt-12"
        >
          <div className="flex items-center justify-center space-x-2 text-offWhite/30 text-xs font-body">
            <span>Exclusive • Elite • Elevated</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
