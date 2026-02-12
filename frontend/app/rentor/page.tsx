'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RentorRoot() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard when accessing /rentor
    router.replace('/rentor/dashboard');
  }, [router]);

  return null;
}
