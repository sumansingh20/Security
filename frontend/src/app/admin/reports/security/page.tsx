'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import SidebarLayout from '@/components/layouts/SidebarLayout';
import { useAuthStore } from '@/store/authStore';

interface SecurityEvent {
  _id: string;
  type: string;
  severity: string;
  description: string;
  userId?: string;
  userName?: string;
  ip?: string;
  timestamp: string;
  resolved: boolean;
}

export default function SecurityReportPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, critical: 0, high: 0, resolved: 0 });

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role !== 'admin') { router.push('/my'); return; }

    const fetchSecurity = async () => {
      try {
        const res = await api.get('/admin/audit-logs?action=security');
        const data = res.data.data?.logs || res.data.logs || res.data.data || [];
        const secEvents: SecurityEvent[] = Array.isArray(data) ? data.map((e: any) => ({
          _id: e._id,
          type: e.action || e.type || 'unknown',
          severity: e.severity || 'medium',
          description: e.message || e.description || '—',
          userId: e.user?._id,
          userName: e.user?.name || e.userName,
          ip: e.ip || e.ipAddress,
          timestamp: e.createdAt || e.timestamp,
          resolved: e.resolved || false,
        })) : [];
        setEvents(secEvents);
        setStats({
          total: secEvents.length,
          critical: secEvents.filter((e) => e.severity === 'critical').length,
          high: secEvents.filter((e) => e.severity === 'high').length,
          resolved: secEvents.filter((e) => e.resolved).length,
        });
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSecurity();
  }, [isAuthenticated, user, router]);

  const severityColors: Record<string, string> = {
    low: 'bg-blue-100 text-blue-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-800',
  };

  return (
    <SidebarLayout>
      <div className="p-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/admin/reports" className="hover:underline">Reports</Link>
          <span>/</span>
          <span className="text-gray-700">Security Overview</span>
        </div>
        <h1 className="text-2xl font-bold mb-6">Security Overview</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-500">Total Events</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            <div className="text-sm text-gray-500">Critical</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.high}</div>
            <div className="text-sm text-gray-500">High</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            <div className="text-sm text-gray-500">Resolved</div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading security data...</div>
        ) : events.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <p className="text-lg mb-2">No security events recorded</p>
            <p className="text-sm">Security events will appear here when detected.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Severity</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">User</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">IP</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {events.map((e) => (
                  <tr key={e._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{e.type}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${severityColors[e.severity] || 'bg-gray-100 text-gray-700'}`}>{e.severity}</span>
                    </td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate">{e.description}</td>
                    <td className="px-4 py-3 text-sm">{e.userName || '—'}</td>
                    <td className="px-4 py-3 text-sm font-mono text-xs">{e.ip || '—'}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">{new Date(e.timestamp).toLocaleString()}</td>
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
