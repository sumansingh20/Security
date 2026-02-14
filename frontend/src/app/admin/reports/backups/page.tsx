'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SidebarLayout from '@/components/layouts/SidebarLayout';
import { useAuthStore } from '@/store/authStore';

interface BackupEntry {
  id: string;
  name: string;
  type: string;
  size: string;
  status: string;
  createdAt: string;
  duration: string;
}

export default function BackupsReportPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role !== 'admin') { router.push('/my'); return; }

    // Backups are typically managed externally; show informational page
    setTimeout(() => {
      setBackups([]);
      setLoading(false);
    }, 500);
  }, [isAuthenticated, user, router]);

  const statusColors: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    'in-progress': 'bg-blue-100 text-blue-700',
    failed: 'bg-red-100 text-red-700',
    scheduled: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <SidebarLayout>
      <div className="p-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/admin/reports" className="hover:underline">Reports</Link>
          <span>/</span>
          <span className="text-gray-700">Backup Status</span>
        </div>
        <h1 className="text-2xl font-bold mb-6">Backup Status</h1>

        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-800 mb-1">Database Backup Information</h3>
          <p className="text-sm text-blue-700">
            Database backups are managed through MongoDB Atlas or your hosting provider.
            Configure automated backups in your database provider&apos;s dashboard for production environments.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading backup status...</div>
        ) : backups.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <p className="text-lg mb-2">No backup records available</p>
            <p className="text-sm mb-4">Configure database backups through your hosting provider.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-left max-w-2xl mx-auto">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-1">MongoDB Atlas</h4>
                <p className="text-xs text-gray-500">Continuous backups with point-in-time recovery</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-1">mongodump</h4>
                <p className="text-xs text-gray-500">Manual or scheduled backup using CLI tools</p>
              </div>
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-1">Replication</h4>
                <p className="text-xs text-gray-500">Replica sets for high availability</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Backup Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Type</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Size</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Created</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {backups.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{b.name}</td>
                    <td className="px-4 py-3 text-sm">{b.type}</td>
                    <td className="px-4 py-3 text-sm text-center">{b.size}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={`px-2 py-1 rounded text-xs ${statusColors[b.status] || 'bg-gray-100 text-gray-700'}`}>{b.status}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">{new Date(b.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-center">{b.duration}</td>
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
