'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import { useAuthStore } from '@/store/authStore';

interface Result {
  _id: string;
  exam: { _id: string; title: string; subject?: string };
  student: { firstName: string; lastName: string; studentId?: string };
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  status: string;
  submittedAt: string;
  totalViolations: number;
}

export default function TeacherResultsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<{ _id: string; title: string }[]>([]);
  const [selectedExam, setSelectedExam] = useState('');

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role !== 'teacher' && user?.role !== 'admin') { router.push('/my'); return; }
    const fetchExams = async () => {
      try {
        const res = await api.get('/teacher/exams');
        const examList = res.data.data?.exams || res.data.exams || [];
        setExams(examList);
        if (examList.length > 0) setSelectedExam(examList[0]._id);
      } catch { setLoading(false); }
    };
    fetchExams();
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (!selectedExam) return;
    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/teacher/exams/${selectedExam}/results`);
        const data = res.data.data || {};
        setResults(data.results || data.submissions || res.data.results || []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    };
    fetchResults();
  }, [selectedExam]);

  return (
    <LMSLayout pageTitle="Exam Results" breadcrumbs={[{ label: 'Teacher', href: '/teacher' }, { label: 'Results' }]}>
      <div className="lms-card" style={{ marginBottom: '24px', padding: '16px' }}>
        <label className="lms-label" style={{ marginBottom: '8px', display: 'block' }}>Select Exam</label>
        <select value={selectedExam} onChange={(e) => setSelectedExam(e.target.value)}
          className="lms-input" title="Select exam" style={{ maxWidth: '400px' }}>
          <option value="">Select an exam</option>
          {exams.map(e => (<option key={e._id} value={e._id}>{e.title}</option>))}
        </select>
      </div>

      {loading ? (
        <div className="lms-card" style={{ padding: '40px', textAlign: 'center' }}>Loading results...</div>
      ) : results.length === 0 ? (
        <div className="lms-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No results found for this exam.
        </div>
      ) : (
        <div className="lms-card" style={{ overflow: 'auto' }}>
          <table className="lms-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>ID</th>
                <th>Score</th>
                <th>%</th>
                <th>Status</th>
                <th>Violations</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map(r => (
                <tr key={r._id}>
                  <td>{r.student?.firstName} {r.student?.lastName}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{r.student?.studentId || '—'}</td>
                  <td style={{ fontWeight: 500 }}>{r.marksObtained}/{r.totalMarks}</td>
                  <td>{Math.round(r.percentage)}%</td>
                  <td>
                    <span className={`lms-badge ${r.status === 'evaluated' ? 'lms-badge-success' : 'lms-badge-warning'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>{r.totalViolations || 0}</td>
                  <td style={{ fontSize: '13px' }}>{new Date(r.submittedAt).toLocaleString()}</td>
                  <td>
                    <button onClick={() => router.push(`/teacher/exams/${selectedExam}/results`)}
                      className="lms-link" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>
                      View Details
                    </button>
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
