'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import SidebarLayout from '@/components/layouts/SidebarLayout';

interface BatchStudent {
  _id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  rollNumber?: string;
  studentId?: string;
}

interface BatchDetail {
  _id: string;
  name: string;
  exam: { _id: string; title: string; subject?: string } | string;
  students: BatchStudent[];
  status: string;
  startTime?: string;
  endTime?: string;
  isLocked?: boolean;
  createdAt: string;
}

export default function BatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.id as string;
  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBatch = async () => {
      try {
        const res = await api.get(`/admin/batches/${batchId}`);
        setBatch(res.data.data?.batch || res.data.batch || res.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load batch details');
      } finally {
        setLoading(false);
      }
    };
    fetchBatch();
  }, [batchId]);

  if (loading) return <SidebarLayout><div className="p-8 text-center">Loading batch...</div></SidebarLayout>;
  if (error) return <SidebarLayout><div className="p-8 text-center text-red-600">{error}</div></SidebarLayout>;
  if (!batch) return <SidebarLayout><div className="p-8 text-center">Batch not found</div></SidebarLayout>;

  const examTitle = typeof batch.exam === 'object' ? batch.exam.title : 'Unknown Exam';
  const examId = typeof batch.exam === 'object' ? batch.exam._id : batch.exam;

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    active: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <SidebarLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <button onClick={() => router.back()} className="mb-4 text-blue-600 hover:underline text-sm">← Back</button>
        <h1 className="text-2xl font-bold mb-6">Batch: {batch.name}</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <span className="text-gray-500 text-sm">Status</span>
            <p className="mt-1">
              <span className={`px-2 py-1 rounded text-sm font-medium ${statusColor[batch.status] || 'bg-gray-100 text-gray-700'}`}>
                {batch.status}
              </span>
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <span className="text-gray-500 text-sm">Exam</span>
            <p className="mt-1">
              <Link href={`/admin/exams/${examId}`} className="text-blue-600 hover:underline">
                {examTitle}
              </Link>
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <span className="text-gray-500 text-sm">Students</span>
            <p className="mt-1 text-xl font-bold">{batch.students?.length || 0}</p>
          </div>
        </div>

        {batch.startTime && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <span className="text-gray-500 text-sm">Start Time</span>
              <p className="mt-1">{new Date(batch.startTime).toLocaleString()}</p>
            </div>
            {batch.endTime && (
              <div className="bg-white rounded-lg shadow p-4">
                <span className="text-gray-500 text-sm">End Time</span>
                <p className="mt-1">{new Date(batch.endTime).toLocaleString()}</p>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-lg font-bold">Students ({batch.students?.length || 0})</h2>
          </div>
          {batch.students && batch.students.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">#</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Roll / ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {batch.students.map((s, i) => (
                    <tr key={s._id}>
                      <td className="px-4 py-3 text-sm">{i + 1}</td>
                      <td className="px-4 py-3 text-sm">{s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || '—'}</td>
                      <td className="px-4 py-3 text-sm">{s.email}</td>
                      <td className="px-4 py-3 text-sm">{s.rollNumber || s.studentId || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">No students in this batch</div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
