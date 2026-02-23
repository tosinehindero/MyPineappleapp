'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSubscription, type SubscriptionTier } from '@/lib/subscription';

interface FeatureGateProps {
  children: React.ReactNode;
  requiredTier: 'basic' | 'premium';
  feature: string;
  description?: string;
}

/**
 * Full-page feature gate that redirects or shows upgrade prompt
 * Use this to protect entire pages/routes
 */
export function FeatureGate({ children, requiredTier, feature, description }: FeatureGateProps) {
  const router = useRouter();
  const { subscription, loading } = useSubscription();

  const tierHierarchy: Record<SubscriptionTier, number> = { 
    free: 0, 
    basic: 1, 
    premium: 2 
  };

  const currentTierLevel = tierHierarchy[subscription?.tier || 'free'];
  const requiredTierLevel = tierHierarchy[requiredTier];
  const hasAccess = currentTierLevel >= requiredTierLevel;

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin"></div>
      </div>
    );
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  // Show upgrade prompt
  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center"
      >
        <div className="w-24 h-24 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-gold" fill="none" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-heading text-gold mb-4">
          {requiredTier === 'premium' ? 'Premium Feature' : 'Upgrade Required'}
        </h1>
        
        <p className="text-offWhite/70 font-body mb-2">
          <span className="text-gold font-semibold">{feature}</span> requires a {requiredTier} membership or higher.
        </p>
        
        {description && (
          <p className="text-offWhite/50 text-sm font-body mb-8">
            {description}
          </p>
        )}

        {subscription?.tier === 'free' && (
          <p className="text-offWhite/40 text-sm font-body mb-6">
            You're currently on the Free plan
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/pricing"
            className="px-8 py-4 bg-gold text-charcoal font-semibold rounded-full hover:shadow-gold-glow transition-all"
            data-testid="upgrade-btn"
          >
            Upgrade to {requiredTier === 'premium' ? 'Premium' : 'Basic'}
          </Link>
          <Link
            href="/feed"
            className="px-8 py-4 border border-gold/30 text-gold rounded-full hover:border-gold/60 transition-colors"
          >
            Back to Feed
          </Link>
        </div>

        {/* Feature preview */}
        <div className="mt-12 p-6 bg-darkBlue/30 border border-gold/10 rounded-xl text-left">
          <h3 className="text-gold font-heading mb-4">{requiredTier === 'premium' ? 'Premium' : 'Basic'} includes:</h3>
          <ul className="space-y-2 text-offWhite/70 text-sm font-body">
            {requiredTier === 'basic' ? (
              <>
                <li className="flex items-center"><span className="text-gold mr-2">✓</span> 5 messages per day</li>
                <li className="flex items-center"><span className="text-gold mr-2">✓</span> See online status</li>
                <li className="flex items-center"><span className="text-gold mr-2">✓</span> Event previews (1hr)</li>
              </>
            ) : (
              <>
                <li className="flex items-center"><span className="text-gold mr-2">✓</span> Unlimited messages</li>
                <li className="flex items-center"><span className="text-gold mr-2">✓</span> Full event access</li>
                <li className="flex items-center"><span className="text-gold mr-2">✓</span> Marketplace access</li>
                <li className="flex items-center"><span className="text-gold mr-2">✓</span> See who viewed your profile</li>
                <li className="flex items-center"><span className="text-gold mr-2">✓</span> Add to Circle</li>
                <li className="flex items-center"><span className="text-gold mr-2">✓</span> Sasha AI Travel Agent</li>
              </>
            )}
          </ul>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Hook to check tier access and optionally redirect
 */
export function useTierAccess(requiredTier: 'basic' | 'premium') {
  const { subscription, loading } = useSubscription();
  
  const tierHierarchy: Record<SubscriptionTier, number> = { 
    free: 0, 
    basic: 1, 
    premium: 2 
  };
  
  const currentTierLevel = tierHierarchy[subscription?.tier || 'free'];
  const requiredTierLevel = tierHierarchy[requiredTier];
  const hasAccess = currentTierLevel >= requiredTierLevel;
  
  return {
    hasAccess,
    loading,
    currentTier: subscription?.tier || 'free',
    isPremium: subscription?.tier === 'premium',
    isBasicOrAbove: currentTierLevel >= 1,
  };
}
