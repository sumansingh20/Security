'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import SidebarLayout from '@/components/layouts/SidebarLayout';
import { useAuthStore } from '@/store/authStore';

interface OnlineUser {
  _id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  lastActive: string;
  currentActivity?: string;
}

export default function OnlineUsersReportPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role !== 'admin') { router.push('/my'); return; }

    const fetchOnline = async () => {
      try {
        const res = await api.get('/admin/users/online');
        const data = res.data.data?.users || res.data.users || res.data.data || [];
        setOnlineUsers(Array.isArray(data) ? data : []);
      } catch {
        setOnlineUsers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchOnline();

    // Refresh every 30 seconds
    const interval = setInterval(fetchOnline, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, user, router]);

  const roleColors: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700',
    teacher: 'bg-blue-100 text-blue-700',
    student: 'bg-green-100 text-green-700',
  };

  return (
    <SidebarLayout>
      <div className="p-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/admin/reports" className="hover:underline">Reports</Link>
          <span>/</span>
          <span className="text-gray-700">Online Users</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">Online Users</h1>
        <p className="text-sm text-gray-500 mb-6">Auto-refreshes every 30 seconds</p>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : onlineUsers.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <p className="text-lg mb-2">No users currently online</p>
            <p className="text-sm">Online users will appear here in real-time.</p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              <span className="font-medium">{onlineUsers.length}</span> user(s) currently online
            </div>
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">●</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Email</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Role</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Last Active</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {onlineUsers.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3"><span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span></td>
                      <td className="px-4 py-3 text-sm">
                        <Link href={`/admin/users/${u._id}`} className="text-blue-600 hover:underline">
                          {u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || '—'}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm">{u.email}</td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className={`px-2 py-1 rounded text-xs ${roleColors[u.role] || 'bg-gray-100 text-gray-700'}`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">{new Date(u.lastActive).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm">{u.currentActivity || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </SidebarLayout>
  );
}
