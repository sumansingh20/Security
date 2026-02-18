'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LMSLayout from '@/components/layouts/LMSLayout';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

interface DashboardStats {
  totalUsers: number;
  totalExams: number;
  totalSubmissions: number;
  activeExams: number;
}

interface ReportCategory {
  name: string;
  reports: { id: string; name: string; description: string; href: string }[];
}

export default function AdminReportsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({ totalUsers: 0, totalExams: 0, totalSubmissions: 0, activeExams: 0 });

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role !== 'admin') { router.push('/my'); return; }
    fetchStats();
  }, [isAuthenticated, user, router]);

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/dashboard');
      const data = response.data.data || response.data;
      const s = data.stats || data;
      setStats({
        totalUsers: s.totalStudents || s.totalUsers || 0,
        totalExams: s.totalExams || 0,
        totalSubmissions: s.totalSubmissions || 0,
        activeExams: s.activeExams || 0,
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const reportCategories: ReportCategory[] = [
    {
      name: 'Exam Reports',
      reports: [
        { id: 'exam-results', name: 'Exam results summary', description: 'View results and pass/fail rates across all exams', href: '/admin/results' },
        { id: 'violation-report', name: 'Violation report', description: 'Review all exam violations and proctoring alerts', href: '/admin/sessions' },
        { id: 'submission-analysis', name: 'Submission analysis', description: 'Track submission patterns and auto-submit events', href: '/admin/results' },
      ],
    },
    {
      name: 'User Reports',
      reports: [
        { id: 'user-management', name: 'User management', description: 'View and manage all users', href: '/admin/users' },
        { id: 'user-activity', name: 'User activity', description: 'Track user engagement and exam participation', href: '/admin/logs' },
      ],
    },
    {
      name: 'System Reports',
      reports: [
        { id: 'audit-trail', name: 'Audit trail', description: 'View detailed audit logs for all system actions', href: '/admin/logs' },
        { id: 'exam-sessions', name: 'Exam sessions', description: 'Monitor active and past exam sessions', href: '/admin/sessions' },
        { id: 'batch-management', name: 'Batch management', description: 'View and manage student batches', href: '/admin/batches' },
      ],
    },
  ];

  return (
    <LMSLayout pageTitle="Reports" breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Reports' }]}>
      {/* Quick Stats */}
      <div className="lms-card" style={{ marginBottom: '24px' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
          <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>Quick Statistics</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', padding: '16px' }}>
          {[
            { label: 'Total Users', value: stats.totalUsers, color: '#3b82f6' },
            { label: 'Total Exams', value: stats.totalExams, color: '#8b5cf6' },
            { label: 'Active Exams', value: stats.activeExams, color: '#22c55e' },
            { label: 'Total Submissions', value: stats.totalSubmissions, color: '#f59e0b' },
          ].map(item => (
            <div key={item.label} style={{ textAlign: 'center', padding: '16px', border: '1px solid var(--border)', borderRadius: '8px', borderLeft: `4px solid ${item.color}` }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: item.color }}>{loading ? '...' : item.value.toLocaleString()}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Report Categories */}
      {reportCategories.map((category) => (
        <div key={category.name} className="lms-card" style={{ marginBottom: '16px' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <h3 style={{ fontWeight: 600, color: 'var(--primary)' }}>{category.name}</h3>
          </div>
          <div>
            {category.reports.map((report, i) => (
              <div key={report.id} style={{ padding: '14px 16px', borderBottom: i < category.reports.length - 1 ? '1px solid var(--border-light, #f0f0f0)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <Link href={report.href} style={{ fontWeight: 500, color: 'var(--primary)', textDecoration: 'none' }}>{report.name}</Link>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{report.description}</p>
                </div>
                <Link href={report.href} className="lms-btn lms-btn-secondary" style={{ padding: '4px 14px', fontSize: '13px', textDecoration: 'none', whiteSpace: 'nowrap' }}>View</Link>
              </div>
            ))}
          </div>
        </div>
      ))}
    </LMSLayout>
  );
}
