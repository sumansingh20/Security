'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LMSLayout from '@/components/layouts/LMSLayout';
import { useAuthStore } from '@/store/authStore';

interface ReportCategory {
  name: string;
  reports: {
    id: string;
    name: string;
    description: string;
    href: string;
  }[];
}

export default function AdminReportsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'admin') {
      router.push('/my');
      return;
    }
    setLoading(false);
  }, [isAuthenticated, user, router]);

  const reportCategories: ReportCategory[] = [
    {
      name: 'Exam Reports',
      reports: [
        {
          id: 'exam-statistics',
          name: 'Exam statistics',
          description: 'Analyze exam performance and question-level statistics',
          href: '/admin/reports/quiz-stats',
        },
        {
          id: 'exam-results',
          name: 'Exam results summary',
          description: 'View results and pass/fail rates across all exams',
          href: '/admin/reports/results',
        },
        {
          id: 'violation-report',
          name: 'Violation report',
          description: 'Review all exam violations and proctoring alerts',
          href: '/admin/reports/violations',
        },
        {
          id: 'submission-analysis',
          name: 'Submission analysis',
          description: 'Track submission patterns and auto-submit events',
          href: '/admin/reports/submissions',
        },
      ],
    },
    {
      name: 'User Reports',
      reports: [
        {
          id: 'user-logins',
          name: 'User logins',
          description: 'View recent login activity across all users',
          href: '/admin/reports/logins',
        },
        {
          id: 'user-activity',
          name: 'User activity',
          description: 'Track user engagement and exam participation',
          href: '/admin/reports/activity',
        },
        {
          id: 'inactive-users',
          name: 'Inactive users',
          description: 'Find users who have not logged in recently',
          href: '/admin/reports/inactive',
        },
        {
          id: 'online-users',
          name: 'Online users',
          description: 'View currently active users on the portal',
          href: '/admin/reports/online',
        },
      ],
    },
    {
      name: 'System Reports',
      reports: [
        {
          id: 'system-logs',
          name: 'System logs',
          description: 'View system activity and error logs',
          href: '/admin/reports/logs',
        },
        {
          id: 'security-overview',
          name: 'Security overview',
          description: 'Review security-related events and potential issues',
          href: '/admin/reports/security',
        },
        {
          id: 'audit-trail',
          name: 'Audit trail',
          description: 'View detailed audit logs for all system actions',
          href: '/admin/reports/activity',
        },
        {
          id: 'backup-status',
          name: 'Backup status',
          description: 'View backup history and status',
          href: '/admin/reports/backups',
        },
      ],
    },
  ];

  if (loading) {
    return (
      <LMSLayout pageTitle="Reports" breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Reports' }]}>
        <div className="lms-card" style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout pageTitle="Reports" breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Reports' }]}>
      <div className="p-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[#1d4f91]">Reports</h1>
          <p className="text-sm text-gray-600 mt-1">
            Access various system reports and analytics
          </p>
        </div>

        {/* Report Categories */}
        <div className="space-y-6">
          {reportCategories.map((category) => (
            <div key={category.name} className="bg-white border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <h2 className="font-semibold text-[#1d4f91]">{category.name}</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {category.reports.map((report) => (
                  <div key={report.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <Link
                          href={report.href}
                          className="font-medium text-[#0066cc] hover:underline"
                        >
                          {report.name}
                        </Link>
                        <p className="text-sm text-gray-500 mt-1">{report.description}</p>
                      </div>
                      <Link
                        href={report.href}
                        className="px-3 py-1 text-sm border border-gray-300 text-gray-700 hover:bg-gray-100"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-6 bg-white border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-[#1d4f91]">Quick Statistics</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
            <div className="text-center p-4 border border-gray-200 rounded">
              <div className="text-2xl font-bold text-[#1d4f91]">1,250</div>
              <div className="text-sm text-gray-500">Total Users</div>
            </div>
            <div className="text-center p-4 border border-gray-200 rounded">
              <div className="text-2xl font-bold text-[#1d4f91]">45</div>
              <div className="text-sm text-gray-500">Total Exams</div>
            </div>
            <div className="text-center p-4 border border-gray-200 rounded">
              <div className="text-2xl font-bold text-[#1d4f91]">128</div>
              <div className="text-sm text-gray-500">Online Now</div>
            </div>
            <div className="text-center p-4 border border-gray-200 rounded">
              <div className="text-2xl font-bold text-[#1d4f91]">3,420</div>
              <div className="text-sm text-gray-500">Submissions</div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-6 bg-white border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-[#1d4f91]">Recent Activity</h2>
          </div>
          <ul className="divide-y divide-gray-100">
            {[
              { user: 'John Doe', action: 'Submitted exam', exam: 'Mathematics Final', time: '2 minutes ago' },
              { user: 'Jane Smith', action: 'Started exam', exam: 'Data Structures Quiz', time: '5 minutes ago' },
              { user: 'Mike Johnson', action: 'Completed exam', exam: 'Algorithms Midterm', time: '10 minutes ago' },
              { user: 'Sarah Williams', action: 'Violation detected', exam: 'Web Development Exam', time: '15 minutes ago' },
              { user: 'Admin User', action: 'Created new exam', exam: 'Machine Learning Final', time: '30 minutes ago' },
            ].map((activity, index) => (
              <li key={index} className="px-4 py-3 hover:bg-gray-50">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{activity.user}</span>
                    <span className="text-gray-500"> {activity.action} in </span>
                    <span className="text-[#0066cc]">{activity.exam}</span>
                  </div>
                  <span className="text-gray-400 text-xs">{activity.time}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <Link href="/admin/reports/activity" className="text-sm text-[#0066cc] hover:underline">
              View full activity log →
            </Link>
          </div>
        </div>
      </div>
    </LMSLayout>
  );
}
