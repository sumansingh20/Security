'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import SidebarLayout from '@/components/layouts/SidebarLayout';
import { useAuthStore } from '@/store/authStore';

interface SubmissionEntry {
  _id: string;
  studentName: string;
  examTitle: string;
  status: string;
  submissionType: string;
  score: number;
  totalMarks: number;
  submittedAt: string;
  timeSpent: number;
}

export default function SubmissionsReportPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [submissions, setSubmissions] = useState<SubmissionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role !== 'admin') { router.push('/my'); return; }

    const fetchSubmissions = async () => {
      try {
        const res = await api.get('/admin/submissions');
        const data = res.data.data?.submissions || res.data.submissions || res.data.data || [];
        setSubmissions(Array.isArray(data) ? data : []);
      } catch {
        setSubmissions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, [isAuthenticated, user, router]);

  const typeLabels: Record<string, string> = {
    'manual': 'Manual',
    'auto-timeout': 'Auto (Timeout)',
    'auto-violation': 'Auto (Violation)',
    'admin-force': 'Admin Force',
    'force-submitted': 'Force Submitted',
  };

  return (
    <SidebarLayout>
      <div className="p-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/admin/reports" className="hover:underline">Reports</Link>
          <span>/</span>
          <span className="text-gray-700">Submission Analysis</span>
        </div>
        <h1 className="text-2xl font-bold mb-6">Submission Analysis</h1>

        {loading ? (
          <div className="text-center py-8">Loading submissions...</div>
        ) : submissions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <p className="text-lg mb-2">No submissions found</p>
            <p className="text-sm">Submission data will appear here once students complete exams.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Student</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Exam</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Score</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Type</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Time</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {submissions.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{s.studentName || '—'}</td>
                    <td className="px-4 py-3 text-sm">{s.examTitle || '—'}</td>
                    <td className="px-4 py-3 text-sm text-center">{s.score}/{s.totalMarks}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">{typeLabels[s.submissionType] || s.submissionType || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center capitalize">{s.status}</td>
                    <td className="px-4 py-3 text-sm text-center">{Math.round((s.timeSpent || 0) / 60)} min</td>
                    <td className="px-4 py-3 text-sm">{s.submittedAt ? new Date(s.submittedAt).toLocaleString() : '—'}</td>
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
