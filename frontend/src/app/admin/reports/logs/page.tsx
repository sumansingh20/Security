'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import SidebarLayout from '@/components/layouts/SidebarLayout';
import { useAuthStore } from '@/store/authStore';

interface LogEntry {
  _id: string;
  level: string;
  message: string;
  component?: string;
  timestamp: string;
  userId?: string;
  ip?: string;
  details?: string;
}

export default function SystemLogsReportPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState('all');

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role !== 'admin') { router.push('/my'); return; }

    const fetchLogs = async () => {
      try {
        const res = await api.get('/admin/audit-logs?limit=200');
        const data = res.data.data?.logs || res.data.logs || res.data.data || [];
        setLogs(Array.isArray(data) ? data.map((l: any) => ({
          _id: l._id,
          level: l.level || l.action || 'info',
          message: l.message || l.description || l.action || '—',
          component: l.component || l.resource || '—',
          timestamp: l.createdAt || l.timestamp,
          userId: l.user?._id || l.userId,
          ip: l.ip || l.ipAddress,
          details: l.details,
        })) : []);
      } catch {
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [isAuthenticated, user, router]);

  const levelColors: Record<string, string> = {
    info: 'bg-blue-100 text-blue-700',
    warning: 'bg-yellow-100 text-yellow-700',
    warn: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700',
    debug: 'bg-gray-100 text-gray-600',
  };

  const filtered = levelFilter === 'all' ? logs : logs.filter((l) => l.level === levelFilter);

  return (
    <SidebarLayout>
      <div className="p-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/admin/reports" className="hover:underline">Reports</Link>
          <span>/</span>
          <span className="text-gray-700">System Logs</span>
        </div>
        <h1 className="text-2xl font-bold mb-4">System Logs</h1>

        <div className="flex gap-2 mb-6">
          {['all', 'info', 'warning', 'error', 'debug'].map((f) => (
            <button
              key={f}
              onClick={() => setLevelFilter(f)}
              className={`px-3 py-1 rounded text-sm capitalize ${levelFilter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-8">Loading logs...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <p className="text-lg mb-2">No logs found</p>
            <p className="text-sm">System logs will appear here as events occur.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Level</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Message</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Component</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Time</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((l) => (
                  <tr key={l._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${levelColors[l.level] || 'bg-gray-100 text-gray-700'}`}>{l.level}</span>
                    </td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate">{l.message}</td>
                    <td className="px-4 py-3 text-sm">{l.component}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">{new Date(l.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs font-mono">{l.ip || '—'}</td>
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
