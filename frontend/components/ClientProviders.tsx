'use client';

import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with Firebase
const CommunityPulse = dynamic(() => import('./CommunityPulse'), {
  ssr: false,
});

const OnlinePresenceProvider = dynamic(() => import('./OnlinePresenceProvider'), {
  ssr: false,
});

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <OnlinePresenceProvider>
      {children}
      <CommunityPulse />
    </OnlinePresenceProvider>
  );
}
