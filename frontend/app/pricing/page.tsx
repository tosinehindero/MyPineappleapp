'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { toast, Toaster } from 'sonner';
import {
  getSubscriptionPlans,
  createCheckoutSession,
  type SubscriptionPlan,
  type SubscriptionTier,
} from '@/lib/subscription';

export default function PricingPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [plans, setPlans] = useState<Record<string, SubscriptionPlan>>({});
  const [loading, setLoading] = useState(true);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    loadPlans();

    return () => unsubscribe();
  }, []);

  const loadPlans = async () => {
    try {
      const data = await getSubscriptionPlans();
      setPlans(data.plans);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planId: string) => {
    if (!currentUser) {
      toast.error('Please sign in to subscribe');
      router.push('/login');
      return;
    }

    setProcessingPlan(planId);
    try {
      const result = await createCheckoutSession(
        planId,
        currentUser.uid,
        currentUser.email || ''
      );

      if (result.success && result.checkout_url) {
        window.location.href = result.checkout_url;
      } else {
        toast.error(result.error || 'Failed to start checkout');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setProcessingPlan(null);
    }
  };

  const getDisplayPlan = (tier: 'basic' | 'premium') => {
    const suffix = billingInterval === 'monthly' ? '_monthly' : '_yearly';
    return plans[`${tier}${suffix}`];
  };

  const basicPlan = getDisplayPlan('basic');
  const premiumPlan = getDisplayPlan('premium');
  const lifetimePlan = plans['premium_lifetime'];

  const calculateYearlySavings = (monthlyPrice: number, yearlyPrice: number) => {
    const monthlyTotal = monthlyPrice * 12;
    const savings = monthlyTotal - yearlyPrice;
    return Math.round((savings / monthlyTotal) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal">
      <Toaster theme="dark" position="top-right" />

      {/* Header */}
      <nav className="sticky top-0 z-50 bg-charcoal/95 backdrop-blur-xl border-b border-gold/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/feed" className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full border-2 border-gold overflow-hidden">
              <img
                src="https://customer-assets.emergentagent.com/job_39fcce0e-8a43-4eb6-8e28-bbef7a6f13d0/artifacts/0yulccxz_3ff79de4-ddd2-44d9-a1b1-e47f2ff51a82.png"
                alt="Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xl font-heading text-gold">PineapplePlay</span>
          </Link>
          <Link
            href="/feed"
            className="text-offWhite/70 hover:text-gold transition-colors font-body text-sm"
          >
            Back to Feed
          </Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-heading text-gold mb-4">
            Unlock the Full Experience
          </h1>
          <p className="text-offWhite/70 font-body text-lg max-w-2xl mx-auto">
            Choose the plan that fits your lifestyle. All paid plans include a 14-day free trial.
          </p>
        </motion.div>

        {/* Billing Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-center mb-10"
        >
          <div className="bg-white/[0.03] border border-white/10 rounded-full p-1 flex items-center">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`px-6 py-2 rounded-full text-sm font-body transition-all ${
                billingInterval === 'monthly'
                  ? 'bg-gold text-charcoal'
                  : 'text-offWhite/70 hover:text-gold'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={`px-6 py-2 rounded-full text-sm font-body transition-all flex items-center space-x-2 ${
                billingInterval === 'yearly'
                  ? 'bg-gold text-charcoal'
                  : 'text-offWhite/70 hover:text-gold'
              }`}
            >
              <span>Yearly</span>
              <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                Save 17%
              </span>
            </button>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Free Tier */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 flex flex-col"
          >
            <div className="mb-6">
              <h3 className="text-xl font-heading text-offWhite mb-2">Free</h3>
              <div className="flex items-baseline">
                <span className="text-4xl font-heading text-gold">$0</span>
                <span className="text-offWhite/50 font-body ml-2">/forever</span>
              </div>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {[
                { text: 'Access to feed', included: true },
                { text: 'View online members', included: true },
                { text: 'Send messages', included: false },
                { text: 'Marketplace access', included: false },
                { text: 'Sasha AI Travel', included: false },
                { text: 'Events access', included: false },
              ].map((feature, i) => (
                <li key={i} className="flex items-center space-x-3">
                  {feature.included ? (
                    <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-offWhite/30" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className={feature.included ? 'text-offWhite' : 'text-offWhite/40'}>
                    {feature.text}
                  </span>
                </li>
              ))}
            </ul>

            <button
              disabled
              className="w-full py-3 bg-white/10 text-offWhite/50 rounded-full font-body cursor-not-allowed"
            >
              Current Plan
            </button>
          </motion.div>

          {/* Basic Tier */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 flex flex-col"
          >
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-heading text-offWhite">Basic</h3>
                <span className="text-xs font-body bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
                  14-day trial
                </span>
              </div>
              <div className="flex items-baseline">
                <span className="text-4xl font-heading text-gold">
                  ${basicPlan?.price || '19.99'}
                </span>
                <span className="text-offWhite/50 font-body ml-2">
                  /{billingInterval === 'monthly' ? 'mo' : 'yr'}
                </span>
              </div>
              {billingInterval === 'yearly' && (
                <p className="text-green-400 text-sm font-body mt-1">
                  Save {calculateYearlySavings(19.99, 199.99)}% vs monthly
                </p>
              )}
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {[
                { text: 'Everything in Free', included: true },
                { text: '5 messages per day', included: true },
                { text: 'See online status', included: true },
                { text: '1-hour event previews', included: true },
                { text: 'Marketplace access', included: false },
                { text: 'Sasha AI Travel', included: false },
                { text: 'Add to Circle', included: false },
              ].map((feature, i) => (
                <li key={i} className="flex items-center space-x-3">
                  {feature.included ? (
                    <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-offWhite/30" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className={feature.included ? 'text-offWhite' : 'text-offWhite/40'}>
                    {feature.text}
                  </span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSelectPlan(billingInterval === 'monthly' ? 'basic_monthly' : 'basic_yearly')}
              disabled={processingPlan !== null}
              className="w-full py-3 bg-white/10 border border-gold/30 text-gold rounded-full font-body hover:bg-gold/10 transition-all disabled:opacity-50"
            >
              {processingPlan?.includes('basic') ? 'Processing...' : 'Start Free Trial'}
            </button>
          </motion.div>

          {/* Premium Tier */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-b from-gold/10 to-transparent border-2 border-gold/30 rounded-2xl p-6 flex flex-col relative"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-charcoal text-xs font-body font-semibold px-4 py-1 rounded-full">
              Most Popular
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-heading text-gold">Premium</h3>
                <span className="text-xs font-body bg-gold/20 text-gold px-2 py-1 rounded-full">
                  14-day trial
                </span>
              </div>
              <div className="flex items-baseline">
                <span className="text-4xl font-heading text-gold">
                  ${premiumPlan?.price || '34.99'}
                </span>
                <span className="text-offWhite/50 font-body ml-2">
                  /{billingInterval === 'monthly' ? 'mo' : 'yr'}
                </span>
              </div>
              {billingInterval === 'yearly' && (
                <p className="text-green-400 text-sm font-body mt-1">
                  Save {calculateYearlySavings(34.99, 349.99)}% vs monthly
                </p>
              )}
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {[
                { text: 'Everything in Basic', included: true },
                { text: 'Unlimited messages', included: true },
                { text: 'Full Marketplace access', included: true },
                { text: 'Sasha AI Travel Concierge', included: true },
                { text: 'See who viewed you', included: true },
                { text: 'Priority in search', included: true },
                { text: 'Full Events access', included: true },
                { text: 'Add to Circle', included: true },
              ].map((feature, i) => (
                <li key={i} className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-gold" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-offWhite">{feature.text}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSelectPlan(billingInterval === 'monthly' ? 'premium_monthly' : 'premium_yearly')}
              disabled={processingPlan !== null}
              className="w-full py-3 bg-gold text-charcoal rounded-full font-body font-semibold hover:shadow-gold-glow transition-all disabled:opacity-50"
            >
              {processingPlan?.includes('premium') && !processingPlan?.includes('lifetime') 
                ? 'Processing...' 
                : 'Start Free Trial'}
            </button>
          </motion.div>
        </div>

        {/* Lifetime Option */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="max-w-2xl mx-auto bg-white/[0.03] border border-gold/20 rounded-2xl p-6 text-center"
        >
          <h3 className="text-xl font-heading text-gold mb-2">Premium Lifetime</h3>
          <p className="text-offWhite/70 font-body mb-4">
            One payment, lifetime access. Never pay again.
          </p>
          <div className="flex items-center justify-center space-x-4 mb-4">
            <span className="text-4xl font-heading text-gold">${lifetimePlan?.price || '499'}</span>
            <span className="text-offWhite/50 font-body">one-time payment</span>
          </div>
          <button
            onClick={() => handleSelectPlan('premium_lifetime')}
            disabled={processingPlan !== null}
            className="px-8 py-3 bg-gold/20 border border-gold/40 text-gold rounded-full font-body hover:bg-gold/30 transition-all disabled:opacity-50"
          >
            {processingPlan === 'premium_lifetime' ? 'Processing...' : 'Get Lifetime Access'}
          </button>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-16 max-w-3xl mx-auto"
        >
          <h2 className="text-2xl font-heading text-gold text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: 'Can I cancel anytime?',
                a: 'Yes! You can cancel your subscription at any time. You\'ll continue to have access until the end of your billing period.',
              },
              {
                q: 'What happens after my free trial?',
                a: 'After your 14-day trial, you\'ll be charged for your selected plan. Cancel anytime during the trial to avoid charges.',
              },
              {
                q: 'Can I upgrade or downgrade my plan?',
                a: 'Absolutely. You can change your plan at any time from your account settings.',
              },
              {
                q: 'Is the lifetime plan really forever?',
                a: 'Yes! The lifetime plan gives you permanent Premium access with no recurring payments.',
              },
            ].map((faq, i) => (
              <div
                key={i}
                className="bg-white/[0.02] border border-white/5 rounded-xl p-4"
              >
                <h4 className="text-offWhite font-body font-semibold mb-2">{faq.q}</h4>
                <p className="text-offWhite/60 font-body text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
