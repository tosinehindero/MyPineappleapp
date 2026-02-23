'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { checkPaymentStatus } from '@/lib/subscription';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [planName, setPlanName] = useState<string>('');
  const [tier, setTier] = useState<string>('');
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      setStatus('error');
      return;
    }

    const pollStatus = async () => {
      try {
        const result = await checkPaymentStatus(sessionId);

        if (result.payment_status === 'paid') {
          setStatus('success');
          setPlanName(result.plan_name || '');
          setTier(result.tier || '');
        } else if (pollCount < 10) {
          // Continue polling (max 10 attempts = 20 seconds)
          setTimeout(() => setPollCount((c) => c + 1), 2000);
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        if (pollCount < 10) {
          setTimeout(() => setPollCount((c) => c + 1), 2000);
        } else {
          setStatus('error');
        }
      }
    };

    pollStatus();
  }, [searchParams, pollCount]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-xl font-heading text-gold mb-2">Processing your payment...</h2>
          <p className="text-offWhite/60 font-body">Please wait while we confirm your subscription</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-red-400"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-heading text-red-400 mb-2">Payment Issue</h2>
          <p className="text-offWhite/60 font-body mb-6">
            We couldn't confirm your payment. If you were charged, please contact support.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/pricing"
              className="px-6 py-3 bg-white/10 border border-white/20 text-offWhite rounded-full font-body hover:bg-white/20 transition-all"
            >
              Try Again
            </Link>
            <Link
              href="/feed"
              className="px-6 py-3 bg-gold text-charcoal rounded-full font-body font-semibold hover:shadow-gold-glow transition-all"
            >
              Go to Feed
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md"
      >
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <motion.svg
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-12 h-12 text-green-400"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M5 13l4 4L19 7" />
          </motion.svg>
        </motion.div>

        <h1 className="text-3xl font-heading text-gold mb-2">Welcome to {tier}!</h1>
        <p className="text-offWhite/70 font-body mb-2">
          Your subscription to <span className="text-gold font-semibold">{planName}</span> is now active.
        </p>
        <p className="text-offWhite/50 font-body text-sm mb-8">
          You now have access to all {tier} features.
        </p>

        {/* Feature Highlights */}
        <div className="bg-white/[0.03] border border-gold/20 rounded-xl p-6 mb-8 text-left">
          <h3 className="text-sm font-body text-gold mb-4 uppercase tracking-wider">
            What's Unlocked
          </h3>
          <ul className="space-y-3">
            {tier === 'premium' ? (
              <>
                <li className="flex items-center space-x-3 text-offWhite font-body text-sm">
                  <span className="text-green-400">✓</span>
                  <span>Unlimited messaging</span>
                </li>
                <li className="flex items-center space-x-3 text-offWhite font-body text-sm">
                  <span className="text-green-400">✓</span>
                  <span>Full Marketplace access</span>
                </li>
                <li className="flex items-center space-x-3 text-offWhite font-body text-sm">
                  <span className="text-green-400">✓</span>
                  <span>Sasha AI Travel Concierge</span>
                </li>
                <li className="flex items-center space-x-3 text-offWhite font-body text-sm">
                  <span className="text-green-400">✓</span>
                  <span>See who viewed your profile</span>
                </li>
                <li className="flex items-center space-x-3 text-offWhite font-body text-sm">
                  <span className="text-green-400">✓</span>
                  <span>Priority in search results</span>
                </li>
              </>
            ) : (
              <>
                <li className="flex items-center space-x-3 text-offWhite font-body text-sm">
                  <span className="text-green-400">✓</span>
                  <span>5 messages per day</span>
                </li>
                <li className="flex items-center space-x-3 text-offWhite font-body text-sm">
                  <span className="text-green-400">✓</span>
                  <span>See online status</span>
                </li>
                <li className="flex items-center space-x-3 text-offWhite font-body text-sm">
                  <span className="text-green-400">✓</span>
                  <span>1-hour event previews</span>
                </li>
              </>
            )}
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/feed"
            className="px-8 py-3 bg-gold text-charcoal rounded-full font-body font-semibold hover:shadow-gold-glow transition-all"
          >
            Explore Your New Features
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-charcoal flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin"></div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
