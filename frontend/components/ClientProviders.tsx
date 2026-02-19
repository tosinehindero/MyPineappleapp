'use client';

import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with Firebase
const CommunityPulse = dynamic(() => import('./CommunityPulse'), {
  ssr: false,
});

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <CommunityPulse />
    </>
  );
}
