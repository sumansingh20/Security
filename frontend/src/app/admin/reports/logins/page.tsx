'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import SidebarLayout from '@/components/layouts/SidebarLayout';
import { useAuthStore } from '@/store/authStore';

interface LoginEntry {
  _id: string;
  userName: string;
  userEmail: string;
  role: string;
  loginTime: string;
  ip: string;
  userAgent?: string;
  success: boolean;
}

export default function LoginsReportPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [logins, setLogins] = useState<LoginEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role !== 'admin') { router.push('/my'); return; }

    const fetchLogins = async () => {
      try {
        const res = await api.get('/admin/audit-logs?action=login');
        const data = res.data.data?.logs || res.data.logs || res.data.data || [];
        setLogins(Array.isArray(data) ? data.map((l: any) => ({
          _id: l._id,
          userName: l.user?.name || l.userName || '—',
          userEmail: l.user?.email || l.userEmail || '—',
          role: l.user?.role || l.role || '—',
          loginTime: l.createdAt || l.timestamp || l.loginTime,
          ip: l.ip || l.ipAddress || '—',
          userAgent: l.userAgent,
          success: l.success !== false,
        })) : []);
      } catch {
        setLogins([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLogins();
  }, [isAuthenticated, user, router]);

  return (
    <SidebarLayout>
      <div className="p-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/admin/reports" className="hover:underline">Reports</Link>
          <span>/</span>
          <span className="text-gray-700">User Logins</span>
        </div>
        <h1 className="text-2xl font-bold mb-6">User Logins</h1>

        {loading ? (
          <div className="text-center py-8">Loading login data...</div>
        ) : logins.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <p className="text-lg mb-2">No login records found</p>
            <p className="text-sm">Login activity will be tracked and displayed here.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">User</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Email</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Time</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">IP</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logins.map((l) => (
                  <tr key={l._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{l.userName}</td>
                    <td className="px-4 py-3 text-sm">{l.userEmail}</td>
                    <td className="px-4 py-3 text-sm text-center capitalize">{l.role}</td>
                    <td className="px-4 py-3 text-sm">{new Date(l.loginTime).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs font-mono">{l.ip}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`px-2 py-1 rounded text-xs ${l.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {l.success ? 'Success' : 'Failed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
