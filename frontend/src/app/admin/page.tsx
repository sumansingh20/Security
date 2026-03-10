'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/dashboard');
  }, [router]);

  return (
    <div className="auth-status-page">
      <div className="spinner" />
      <p className="auth-status-desc">Redirecting to dashboard...</p>
    </div>
  );
}
