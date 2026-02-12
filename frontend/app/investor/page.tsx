'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function InvestorRoot() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard when accessing /investor
    router.replace('/investor/dashboard');
  }, [router]);

  return null;
}
