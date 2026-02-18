'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import SidebarLayout from '@/components/layouts/SidebarLayout';
import { useAuthStore } from '@/store/authStore';

interface ResultSummary {
  _id: string;
  examTitle: string;
  totalSubmissions: number;
  passed: number;
  failed: number;
  avgScore: number;
  highestScore: number;
  lowestScore: number;
}

export default function ResultsReportPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [results, setResults] = useState<ResultSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role !== 'admin') { router.push('/my'); return; }

    const fetchResults = async () => {
      try {
        const res = await api.get('/admin/reports/results');
        setResults(res.data.data || res.data.results || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [isAuthenticated, user, router]);

  return (
    <SidebarLayout>
      <div className="p-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/admin/reports" className="hover:underline">Reports</Link>
          <span>/</span>
          <span className="text-gray-700">Exam Results Summary</span>
        </div>
        <h1 className="text-2xl font-bold mb-6">Exam Results Summary</h1>

        {loading ? (
          <div className="text-center py-8">Loading results...</div>
        ) : results.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <p className="text-lg mb-2">No results data available</p>
            <p className="text-sm">Results summary will appear once exams have been completed.</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Exam</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Total</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Passed</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Failed</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Avg</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">High</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Low</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {results.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{r.examTitle}</td>
                    <td className="px-4 py-3 text-sm text-center">{r.totalSubmissions}</td>
                    <td className="px-4 py-3 text-sm text-center text-green-600">{r.passed}</td>
                    <td className="px-4 py-3 text-sm text-center text-red-600">{r.failed}</td>
                    <td className="px-4 py-3 text-sm text-center">{Math.round(r.avgScore)}%</td>
                    <td className="px-4 py-3 text-sm text-center">{Math.round(r.highestScore)}%</td>
                    <td className="px-4 py-3 text-sm text-center">{Math.round(r.lowestScore)}%</td>
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
