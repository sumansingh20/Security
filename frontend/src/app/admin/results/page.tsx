'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import { useAuthStore } from '@/store/authStore';
import { format } from 'date-fns';

interface Result {
  _id: string;
  exam: {
    _id: string;
    title: string;
    subject?: string;
  };
  student: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    studentId?: string;
  };
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  status: string;
  submittedAt: string;
  totalViolations?: number;
}

export default function AdminResultsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [results, setResults] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [examFilter, setExamFilter] = useState('all');
  const [exams, setExams] = useState<{ _id: string; title: string }[]>([]);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role !== 'admin') { router.push('/my'); return; }
    fetchExams();
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') fetchResults();
  }, [examFilter, isAuthenticated, user]);

  const fetchResults = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (examFilter !== 'all') params.append('exam', examFilter);
      const response = await api.get(`/admin/results?${params.toString()}`);
      const data = response.data.data?.results || response.data.results || response.data.data || [];
      setResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch results:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExams = async () => {
    try {
      const response = await api.get('/admin/exams');
      setExams(response.data.data?.exams || response.data.exams || []);
    } catch {}
  };

  const filteredResults = results.filter(result => {
    if (!result.student || !result.exam) return false;
    return (
      (result.student.firstName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (result.student.lastName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (result.student.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (result.exam.title || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <LMSLayout pageTitle="Results" breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Results' }]}>
      <div className="lms-card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input type="text" placeholder="Search by student or exam..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} className="lms-input" style={{ width: '260px' }} />
            <select value={examFilter} onChange={(e) => setExamFilter(e.target.value)} title="Filter by exam" className="lms-input">
              <option value="all">All Exams</option>
              {exams.map((exam) => (<option key={exam._id} value={exam._id}>{exam.title}</option>))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="lms-card" style={{ padding: '40px', textAlign: 'center' }}>Loading results...</div>
      ) : filteredResults.length === 0 ? (
        <div className="lms-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No results found.</div>
      ) : (
        <div className="lms-card" style={{ overflow: 'auto' }}>
          <table className="lms-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Exam</th>
                <th>Score</th>
                <th>%</th>
                <th>Result</th>
                <th>Status</th>
                <th>Violations</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((result) => (
                <tr key={result._id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{result.student?.firstName} {result.student?.lastName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{result.student?.email}</div>
                  </td>
                  <td><Link href={`/admin/exams/${result.exam?._id}`} className="lms-link">{result.exam?.title}</Link></td>
                  <td>{result.marksObtained || 0} / {result.totalMarks || 0}</td>
                  <td>{Math.round(result.percentage || 0)}%</td>
                  <td>
                    <span className={`lms-badge ${result.passed ? 'lms-badge-success' : 'lms-badge-danger'}`}>
                      {result.passed ? '✅ PASSED' : '❌ FAILED'}
                    </span>
                  </td>
                  <td>
                    <span className={`lms-badge ${result.status === 'evaluated' ? 'lms-badge-success' : result.status === 'submitted' ? 'lms-badge-info' : 'lms-badge-default'}`}>
                      {result.status}
                    </span>
                  </td>
                  <td>{result.totalViolations || 0}</td>
                  <td style={{ fontSize: '13px' }}>{result.submittedAt ? format(new Date(result.submittedAt), 'MMM d, yyyy HH:mm') : '—'}</td>
                  <td>
                    <Link href={`/admin/exams/${result.exam?._id}/submissions/${result._id}`} className="lms-link" style={{ marginRight: '8px' }}>View</Link>
                    <Link href={`/admin/results/${result._id}/grade`} className="lms-link">Grade</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </LMSLayout>
  );
}
