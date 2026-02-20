'use client';

import VettingGuard from '@/components/VettingGuard';
import SecureMessaging from '@/components/SecureMessaging';

export default function MessagesPage() {
  return (
    <VettingGuard>
      <SecureMessaging />
    </VettingGuard>
  );
}
