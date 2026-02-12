'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RenterRoot() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to browse when accessing /renter
    router.replace('/renter/browse');
  }, [router]);

  return null;
}
