'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useSubscription } from '@/lib/subscription';
import { toast, Toaster } from 'sonner';

interface ProfileViewer {
  id: string;
  viewerId: string;
  viewerUsername: string;
  viewerPhotoUrl?: string;
  viewedAt: Date;
}

export default function ProfileViewsPage() {
  const router = useRouter();
  const { subscription, loading: subLoading } = useSubscription();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [viewers, setViewers] = useState<ProfileViewer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      setCurrentUser(user);
      await loadProfileViews(user.uid);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Redirect free/basic users to pricing
  useEffect(() => {
    if (!subLoading && subscription) {
      if (subscription.tier !== 'premium') {
        toast.error('Premium feature - Upgrade to see who viewed your profile');
        router.push('/pricing');
      }
    }
  }, [subscription, subLoading, router]);

  const loadProfileViews = async (userId: string) => {
    try {
      const viewsQuery = query(
        collection(db, 'profileViews'),
        where('viewedUserId', '==', userId),
        orderBy('viewedAt', 'desc'),
        limit(50)
      );

      const snapshot = await getDocs(viewsQuery);
      const viewersList: ProfileViewer[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        viewersList.push({
          id: doc.id,
          viewerId: data.viewerId,
          viewerUsername: data.viewerUsername || 'Anonymous',
          viewerPhotoUrl: data.viewerPhotoUrl,
          viewedAt: data.viewedAt?.toDate() || new Date(),
        });
      });

      // Remove duplicates, keeping only the most recent view per user
      const uniqueViewers = viewersList.reduce((acc, viewer) => {
        const existing = acc.find(v => v.viewerId === viewer.viewerId);
        if (!existing) {
          acc.push(viewer);
        }
        return acc;
      }, [] as ProfileViewer[]);

      setViewers(uniqueViewers);
    } catch (error) {
      console.error('Error loading profile views:', error);
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading || subLoading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin"></div>
      </div>
    );
  }

  // Don't render content for non-premium users (they'll be redirected)
  if (subscription?.tier !== 'premium') {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal">
      <Toaster theme="dark" position="top-right" />

      {/* Header */}
      <div className="bg-darkBlue/50 border-b border-gold/20">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <Link href="/feed" className="text-gold/60 hover:text-gold text-sm font-body mb-2 inline-block">
            ← Back to Feed
          </Link>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gold/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gold" fill="none" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-heading text-gold">Who Viewed Your Profile</h1>
              <p className="text-offWhite/60 text-sm font-body">See who's been checking you out</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {viewers.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-gold/60" fill="none" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-heading text-gold mb-2">No Profile Views Yet</h2>
            <p className="text-offWhite/60 font-body max-w-md mx-auto">
              When other members view your profile, they'll appear here. Make sure your profile is complete to attract more views!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-offWhite/60 text-sm font-body mb-4">
              {viewers.length} {viewers.length === 1 ? 'person has' : 'people have'} viewed your profile
            </p>
            
            {viewers.map((viewer, index) => (
              <motion.div
                key={viewer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  href={`/profile/${viewer.viewerUsername}`}
                  className="flex items-center justify-between p-4 bg-darkBlue/30 border border-gold/10 rounded-xl hover:border-gold/30 transition-colors"
                  data-testid={`viewer-${viewer.viewerId}`}
                >
                  <div className="flex items-center space-x-4">
                    {viewer.viewerPhotoUrl ? (
                      <img
                        src={viewer.viewerPhotoUrl}
                        alt={viewer.viewerUsername}
                        className="w-12 h-12 rounded-full object-cover border-2 border-gold/20"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gold/20 flex items-center justify-center">
                        <span className="text-gold font-heading text-lg">
                          {viewer.viewerUsername[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-offWhite font-body font-medium">{viewer.viewerUsername}</p>
                      <p className="text-offWhite/40 text-sm">{formatTimeAgo(viewer.viewedAt)}</p>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gold/40" fill="none" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
