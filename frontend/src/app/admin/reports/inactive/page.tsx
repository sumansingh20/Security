'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import SidebarLayout from '@/components/layouts/SidebarLayout';
import { useAuthStore } from '@/store/authStore';

interface InactiveUser {
  _id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  lastLogin?: string;
  createdAt: string;
}

export default function InactiveUsersReportPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [users, setUsers] = useState<InactiveUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role !== 'admin') { router.push('/my'); return; }

    const fetchInactive = async () => {
      try {
        const res = await api.get(`/admin/users?inactive=${days}`);
        const data = res.data.data?.users || res.data.users || res.data.data || [];
        setUsers(Array.isArray(data) ? data : []);
      } catch {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchInactive();
  }, [isAuthenticated, user, router, days]);

  return (
    <SidebarLayout>
      <div className="p-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/admin/reports" className="hover:underline">Reports</Link>
          <span>/</span>
          <span className="text-gray-700">Inactive Users</span>
        </div>
        <h1 className="text-2xl font-bold mb-4">Inactive Users</h1>

        <div className="flex items-center gap-3 mb-6">
          <label className="text-sm text-gray-600">Inactive for more than:</label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="border rounded px-3 py-1 text-sm"
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : users.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <p className="text-lg mb-2">No inactive users found</p>
            <p className="text-sm">All users have been active within the selected period.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Email</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Last Login</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <Link href={`/admin/users/${u._id}`} className="text-blue-600 hover:underline">
                        {u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">{u.email}</td>
                    <td className="px-4 py-3 text-sm text-center capitalize">{u.role}</td>
                    <td className="px-4 py-3 text-sm">{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}</td>
                    <td className="px-4 py-3 text-sm">{new Date(u.createdAt).toLocaleDateString()}</td>
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
