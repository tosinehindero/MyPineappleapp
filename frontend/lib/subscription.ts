'use client';

import { createContext, useContext } from 'react';

// Subscription tier types
export type SubscriptionTier = 'free' | 'basic' | 'premium';

export interface TierFeatures {
  feed_access: boolean;
  online_now_list: boolean;
  messages_per_day: number; // -1 = unlimited
  marketplace: boolean;
  sasha_ai: boolean;
  profile_views: boolean;
  priority_search: boolean;
  events_full_access: boolean;
  add_to_circle: boolean;
}

export interface SubscriptionPlan {
  name: string;
  tier: SubscriptionTier;
  price: number;
  interval: 'month' | 'year' | 'lifetime';
  trial_days: number;
  features: string[];
}

export interface UserSubscription {
  tier: SubscriptionTier;
  status: 'none' | 'active' | 'cancelled' | 'expired' | 'error';
  plan_name?: string;
  interval?: string;
  current_period_end?: string;
  features: TierFeatures;
  expired_plan?: string;
}

export interface SubscriptionContextType {
  subscription: UserSubscription | null;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
  canAccess: (feature: keyof TierFeatures) => boolean;
  getMessagesRemaining: () => number;
}

// Default features for free tier
export const FREE_TIER_FEATURES: TierFeatures = {
  feed_access: true,
  online_now_list: true,
  messages_per_day: 0,
  marketplace: false,
  sasha_ai: false,
  profile_views: false,
  priority_search: false,
  events_full_access: false,
  add_to_circle: false,
};

// API functions
const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

export async function getSubscriptionPlans(): Promise<{
  plans: Record<string, SubscriptionPlan>;
  tier_features: Record<SubscriptionTier, TierFeatures>;
}> {
  try {
    const response = await fetch(`${API_URL}/api/subscriptions/plans`);
    const data = await response.json();
    return {
      plans: data.plans || {},
      tier_features: data.tier_features || {},
    };
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    return { plans: {}, tier_features: {} as any };
  }
}

export async function getUserSubscription(userId: string): Promise<UserSubscription> {
  try {
    const response = await fetch(`${API_URL}/api/subscriptions/user/${userId}`);
    const data = await response.json();
    return {
      tier: data.tier || 'free',
      status: data.status || 'none',
      plan_name: data.plan_name,
      interval: data.interval,
      current_period_end: data.current_period_end,
      features: data.features || FREE_TIER_FEATURES,
      expired_plan: data.expired_plan,
    };
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    return {
      tier: 'free',
      status: 'error',
      features: FREE_TIER_FEATURES,
    };
  }
}

export async function createCheckoutSession(
  planId: string,
  userId: string,
  userEmail: string
): Promise<{ success: boolean; checkout_url?: string; error?: string }> {
  try {
    const response = await fetch(`${API_URL}/api/subscriptions/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_id: planId,
        user_id: userId,
        user_email: userEmail,
        origin_url: window.location.origin,
      }),
    });
    
    const data = await response.json();
    
    if (data.success && data.checkout_url) {
      return { success: true, checkout_url: data.checkout_url };
    }
    
    return { success: false, error: data.detail || 'Failed to create checkout session' };
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return { success: false, error: error.message };
  }
}

export async function checkPaymentStatus(sessionId: string): Promise<{
  success: boolean;
  payment_status?: string;
  tier?: SubscriptionTier;
  plan_name?: string;
}> {
  try {
    const response = await fetch(`${API_URL}/api/subscriptions/status/${sessionId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking payment status:', error);
    return { success: false };
  }
}

export async function cancelSubscription(userId: string): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch(`${API_URL}/api/subscriptions/cancel/${userId}`, {
      method: 'POST',
    });
    return await response.json();
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return { success: false };
  }
}

// Helper to check if a feature is accessible
export function canAccessFeature(
  subscription: UserSubscription | null,
  feature: keyof TierFeatures
): boolean {
  if (!subscription) return FREE_TIER_FEATURES[feature] as boolean;
  
  const featureValue = subscription.features[feature];
  if (typeof featureValue === 'boolean') return featureValue;
  if (typeof featureValue === 'number') return featureValue !== 0;
  return false;
}

// Subscription Context (to be provided at app level)
export const SubscriptionContext = createContext<SubscriptionContextType>({
  subscription: null,
  loading: true,
  refreshSubscription: async () => {},
  canAccess: () => false,
  getMessagesRemaining: () => 0,
});

export const useSubscription = () => useContext(SubscriptionContext);
