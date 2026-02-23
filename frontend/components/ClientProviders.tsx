'use client';

import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with Firebase
const CommunityPulse = dynamic(() => import('./CommunityPulse'), {
  ssr: false,
});

const OnlinePresenceProvider = dynamic(() => import('./OnlinePresenceProvider'), {
  ssr: false,
});

const SubscriptionProvider = dynamic(
  () => import('./SubscriptionProvider').then((mod) => mod.SubscriptionProvider),
  { ssr: false }
);

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <SubscriptionProvider>
      <OnlinePresenceProvider>
        {children}
        <CommunityPulse />
      </OnlinePresenceProvider>
    </SubscriptionProvider>
  );
}
