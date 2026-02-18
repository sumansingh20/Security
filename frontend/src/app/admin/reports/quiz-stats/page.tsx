'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import SidebarLayout from '@/components/layouts/SidebarLayout';
import { useAuthStore } from '@/store/authStore';

interface ExamStat {
  _id: string;
  title: string;
  subject?: string;
  totalStudents: number;
  avgScore: number;
  passRate: number;
  avgTimeSpent: number;
  totalSubmissions: number;
}

export default function QuizStatsReportPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState<ExamStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role !== 'admin') { router.push('/my'); return; }

    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/reports/exam-stats');
        setStats(res.data.data || res.data.stats || []);
      } catch {
        // Generate placeholder stats
        setStats([]);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [isAuthenticated, user, router]);

  return (
    <SidebarLayout>
      <div className="p-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/admin/reports" className="hover:underline">Reports</Link>
          <span>/</span>
          <span className="text-gray-700">Exam Statistics</span>
        </div>
        <h1 className="text-2xl font-bold mb-6">Exam Statistics</h1>

        {loading ? (
          <div className="text-center py-8">Loading statistics...</div>
        ) : stats.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <p className="text-lg mb-2">No exam statistics available yet</p>
            <p className="text-sm">Statistics will appear here once exams have been taken by students.</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Exam</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Subject</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Submissions</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Avg Score</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Pass Rate</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Avg Time</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{s.title}</td>
                    <td className="px-4 py-3 text-sm">{s.subject || '—'}</td>
                    <td className="px-4 py-3 text-sm text-center">{s.totalSubmissions}</td>
                    <td className="px-4 py-3 text-sm text-center">{Math.round(s.avgScore)}%</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`px-2 py-1 rounded text-xs ${s.passRate >= 70 ? 'bg-green-100 text-green-700' : s.passRate >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {Math.round(s.passRate)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">{Math.round(s.avgTimeSpent)} min</td>
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
