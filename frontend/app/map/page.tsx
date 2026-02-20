'use client';

import VettingGuard from '@/components/VettingGuard';
import MapView from '@/components/MapView';

export default function MapPage() {
  return (
    <VettingGuard>
      <MapView />
    </VettingGuard>
  );
}
