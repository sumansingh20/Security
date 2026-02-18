'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LMSLayout from '@/components/layouts/LMSLayout';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

interface LogEntry {
  id: string;
  timestamp: string;
  user: { id: string; name: string; email: string };
  action: string;
  component: string;
  eventName: string;
  description: string;
  ip: string;
  course?: { id: string; name: string };
}

export default function ActivityLogsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    user: '',
    action: '',
    dateFrom: '',
    dateTo: '',
    course: '',
  });
  const [page, setPage] = useState(1);
  const perPage = 25;

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'admin') {
      router.push('/my');
      return;
    }

    // Fetch real audit logs from API
    const fetchLogs = async () => {
      try {
        const response = await api.get('/admin/audit-logs?limit=200');
        const data = response.data.data?.logs || response.data.logs || response.data.data || [];
        const formatted: LogEntry[] = data.map((log: any, i: number) => ({
          id: log._id || `log-${i}`,
          timestamp: log.timestamp || log.createdAt || new Date().toISOString(),
          user: {
            id: log.user || '',
            name: log.userEmail || 'Unknown',
            email: log.userEmail || '',
          },
          action: log.action || 'unknown',
          component: log.targetType || 'System',
          eventName: log.action || 'Activity',
          description: log.details ? (typeof log.details === 'string' ? log.details : JSON.stringify(log.details)) : log.action || '',
          ip: log.ipAddress || '-',
        }));
        setLogs(formatted);
      } catch (err) {
        console.error('Failed to fetch activity logs:', err);
        setLogs([]);
      }
      setLoading(false);
    };
    fetchLogs();
  }, [isAuthenticated, user, router]);

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'view':
        return 'bg-blue-100 text-blue-700';
      case 'create':
        return 'bg-green-100 text-green-700';
      case 'update':
        return 'bg-yellow-100 text-yellow-700';
      case 'delete':
        return 'bg-red-100 text-red-700';
      case 'login':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filters.user && !log.user.name.toLowerCase().includes(filters.user.toLowerCase())) {
      return false;
    }
    if (filters.action && log.action !== filters.action) {
      return false;
    }
    if (filters.course && log.course && !log.course.name.toLowerCase().includes(filters.course.toLowerCase())) {
      return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredLogs.length / perPage);
  const paginatedLogs = filteredLogs.slice((page - 1) * perPage, page * perPage);

  const clearFilters = () => {
    setFilters({ user: '', action: '', dateFrom: '', dateTo: '', course: '' });
    setPage(1);
  };

  if (loading) {
    return (
      <LMSLayout pageTitle="Activity Logs" breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Reports', href: '/admin/reports' }, { label: 'Activity' }]}>
        <div className="lms-card" style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout pageTitle="Activity Logs" breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Reports', href: '/admin/reports' }, { label: 'Activity' }]}>
      <div className="p-6">
        {/* Page Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[#1d4f91]">Activity Logs</h1>
            <p className="text-sm text-gray-600 mt-1">
              View system activity and user actions
            </p>
          </div>
          <button className="px-3 py-2 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50">
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 mb-4">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-[#1d4f91]">Filters</h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                <input
                  type="text"
                  value={filters.user}
                  onChange={(e) => setFilters({ ...filters, user: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1d4f91]"
                  placeholder="Search user..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                <select
                  value={filters.action}
                  onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1d4f91]"
                  title="Action Filter"
                  aria-label="Action Filter"
                >
                  <option value="">All actions</option>
                  <option value="view">View</option>
                  <option value="create">Create</option>
                  <option value="update">Update</option>
                  <option value="delete">Delete</option>
                  <option value="login">Login</option>
                  <option value="submit">Submit</option>
                  <option value="start">Start</option>
                  <option value="monitor">Monitor</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Exam</label>
                <input
                  type="text"
                  value={filters.course}
                  onChange={(e) => setFilters({ ...filters, course: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1d4f91]"
                  placeholder="Search exam..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From date</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1d4f91]"
                  title="From Date"
                  aria-label="From Date"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To date</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1d4f91]"
                  title="To Date"
                  aria-label="To Date"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setPage(1)}
                className="px-4 py-2 text-sm bg-[#1d4f91] text-white hover:bg-[#163d73]"
              >
                Apply filters
              </button>
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Results Info */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {(page - 1) * perPage + 1}-{Math.min(page * perPage, filteredLogs.length)} of {filteredLogs.length} entries
        </div>

        {/* Logs Table */}
        <div className="bg-white border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 border-b border-gray-200">Time</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 border-b border-gray-200">User</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-700 border-b border-gray-200">Action</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 border-b border-gray-200">Component</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 border-b border-gray-200">Event</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 border-b border-gray-200 hidden lg:table-cell">Exam</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 border-b border-gray-200 hidden xl:table-cell">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#0066cc]">{log.user.name}</div>
                      <div className="text-xs text-gray-500">{log.user.email}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs rounded ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{log.component}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{log.eventName}</div>
                      <div className="text-xs text-gray-500">{log.description}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">
                      {log.course ? log.course.name : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden xl:table-cell">
                      {log.ip}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-3 py-1 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                First
              </button>
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>
    </LMSLayout>
  );
}
