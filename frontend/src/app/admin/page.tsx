'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/adminApi';

export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getToken() ? '/admin/dashboard' : '/admin/login');
  }, [router]);

  return null;
}
