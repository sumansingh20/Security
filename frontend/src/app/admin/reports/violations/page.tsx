'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import SidebarLayout from '@/components/layouts/SidebarLayout';
import { useAuthStore } from '@/store/authStore';

interface ViolationEntry {
  _id: string;
  studentName: string;
  studentEmail: string;
  examTitle: string;
  type: string;
  severity: string;
  timestamp: string;
  details?: string;
  resolved?: boolean;
}

export default function ViolationsReportPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [violations, setViolations] = useState<ViolationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role !== 'admin') { router.push('/my'); return; }

    const fetchViolations = async () => {
      try {
        const res = await api.get('/admin/violations');
        const data = res.data.data?.violations || res.data.violations || res.data.data || [];
        setViolations(Array.isArray(data) ? data : []);
      } catch {
        setViolations([]);
      } finally {
        setLoading(false);
      }
    };
    fetchViolations();
  }, [isAuthenticated, user, router]);

  const severityColor: Record<string, string> = {
    low: 'bg-yellow-100 text-yellow-700',
    medium: 'bg-orange-100 text-orange-700',
    high: 'bg-red-100 text-red-700',
    critical: 'bg-red-200 text-red-800',
  };

  const filtered = filter === 'all' ? violations : violations.filter((v) => v.severity === filter);

  return (
    <SidebarLayout>
      <div className="p-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/admin/reports" className="hover:underline">Reports</Link>
          <span>/</span>
          <span className="text-gray-700">Violations</span>
        </div>
        <h1 className="text-2xl font-bold mb-4">Violation Report</h1>

        <div className="flex gap-2 mb-6">
          {['all', 'low', 'medium', 'high', 'critical'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-sm capitalize ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-8">Loading violations...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <p className="text-lg mb-2">No violations found</p>
            <p className="text-sm">Violations will appear here when detected during exams.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Student</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Exam</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Severity</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((v, i) => (
                  <tr key={v._id || i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{v.studentName || v.studentEmail || '—'}</td>
                    <td className="px-4 py-3 text-sm">{v.examTitle || '—'}</td>
                    <td className="px-4 py-3 text-sm">{v.type}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${severityColor[v.severity] || 'bg-gray-100 text-gray-700'}`}>
                        {v.severity || 'unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{new Date(v.timestamp).toLocaleString()}</td>
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
