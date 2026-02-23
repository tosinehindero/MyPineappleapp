'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  SubscriptionContext,
  getUserSubscription,
  canAccessFeature,
  FREE_TIER_FEATURES,
  type UserSubscription,
  type TierFeatures,
} from '@/lib/subscription';

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const refreshSubscription = useCallback(async () => {
    if (!userId) return;
    
    try {
      const sub = await getUserSubscription(userId);
      setSubscription(sub);
    } catch (error) {
      console.error('Error refreshing subscription:', error);
    }
  }, [userId]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        try {
          const sub = await getUserSubscription(user.uid);
          setSubscription(sub);
        } catch (error) {
          console.error('Error fetching subscription:', error);
          setSubscription({
            tier: 'free',
            status: 'none',
            features: FREE_TIER_FEATURES,
          });
        }
      } else {
        setUserId(null);
        setSubscription(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const canAccess = useCallback(
    (feature: keyof TierFeatures) => canAccessFeature(subscription, feature),
    [subscription]
  );

  const getMessagesRemaining = useCallback(() => {
    if (!subscription) return 0;
    const limit = subscription.features.messages_per_day;
    if (limit === -1) return Infinity;
    // TODO: Track actual messages sent today from Firestore
    return limit;
  }, [subscription]);

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        loading,
        refreshSubscription,
        canAccess,
        getMessagesRemaining,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}
