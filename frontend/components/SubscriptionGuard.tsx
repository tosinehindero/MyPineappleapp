'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSubscription, type TierFeatures } from '@/lib/subscription';

interface SubscriptionGuardProps {
  children: ReactNode;
  feature: keyof TierFeatures;
  fallback?: 'redirect' | 'blur' | 'overlay' | 'hide';
  message?: string;
  requiredTier?: 'basic' | 'premium';
}

export function SubscriptionGuard({
  children,
  feature,
  fallback = 'overlay',
  message,
  requiredTier = 'premium',
}: SubscriptionGuardProps) {
  const router = useRouter();
  const { subscription, loading, canAccess } = useSubscription();

  // While loading, show a subtle loading state
  if (loading) {
    return (
      <div className="animate-pulse">
        {children}
      </div>
    );
  }

  // Check if user has access to this feature
  const hasAccess = canAccess(feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  // Handle different fallback behaviors
  switch (fallback) {
    case 'redirect':
      router.push('/pricing');
      return null;

    case 'hide':
      return null;

    case 'blur':
      return (
        <div className="relative">
          <div className="blur-md pointer-events-none select-none">
            {children}
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-charcoal/60 backdrop-blur-sm rounded-xl">
            <Link
              href="/pricing"
              className="px-6 py-3 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all"
            >
              Upgrade to View
            </Link>
          </div>
        </div>
      );

    case 'overlay':
    default:
      return (
        <div className="relative">
          {children}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-charcoal/90 backdrop-blur-md rounded-xl p-6 text-center"
          >
            <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-gold"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-heading text-gold mb-2">
              {requiredTier === 'premium' ? 'Premium Feature' : 'Basic Feature'}
            </h3>
            <p className="text-offWhite/70 text-sm font-body mb-4 max-w-xs">
              {message || `Upgrade to ${requiredTier} to unlock this feature`}
            </p>
            <Link
              href="/pricing"
              className="px-6 py-2 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all text-sm"
            >
              View Plans
            </Link>
          </motion.div>
        </div>
      );
  }
}

// Convenience components for common use cases
export function PremiumOnly({ children, fallback = 'overlay' }: { children: ReactNode; fallback?: 'redirect' | 'blur' | 'overlay' | 'hide' }) {
  return (
    <SubscriptionGuard feature="marketplace" fallback={fallback} requiredTier="premium">
      {children}
    </SubscriptionGuard>
  );
}

export function BasicOrAbove({ children, fallback = 'overlay' }: { children: ReactNode; fallback?: 'redirect' | 'blur' | 'overlay' | 'hide' }) {
  return (
    <SubscriptionGuard feature="online_now_list" fallback={fallback} requiredTier="basic">
      {children}
    </SubscriptionGuard>
  );
}

// Hook to check subscription tier
export function useRequireSubscription(
  requiredTier: 'basic' | 'premium',
  redirectOnFail: boolean = false
) {
  const router = useRouter();
  const { subscription, loading } = useSubscription();

  const tierHierarchy = { free: 0, basic: 1, premium: 2 };
  const currentTierLevel = tierHierarchy[subscription?.tier || 'free'];
  const requiredTierLevel = tierHierarchy[requiredTier];
  const hasAccess = currentTierLevel >= requiredTierLevel;

  if (!loading && !hasAccess && redirectOnFail) {
    router.push('/pricing');
  }

  return { hasAccess, loading, currentTier: subscription?.tier || 'free' };
}
