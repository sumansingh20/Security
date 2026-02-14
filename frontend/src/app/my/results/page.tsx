'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Result {
  id: string;
  examId: string;
  examTitle: string;
  subject: string;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  status: string;        // 'passed' | 'failed'
  submittedAt: string;
  reviewAvailable: boolean;
  attemptNumber: number;
}

export default function ResultsPage() {
  const [results, setResults] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await api.get('/student/results');
        setResults(response.data.data.results || []);
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to load results');
      } finally {
        setIsLoading(false);
      }
    };
    fetchResults();
  }, []);

  // Client-side stats
  const statistics = useMemo(() => {
    if (results.length === 0) return null;
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const avgPercentage = results.reduce((sum, r) => sum + (r.percentage || 0), 0) / results.length;
    const bestResult = results.reduce((best, r) => (r.percentage > (best?.percentage || 0) ? r : best), results[0]);
    return {
      total: results.length,
      passed,
      failed,
      passRate: Math.round((passed / results.length) * 100),
      avgPercentage: Math.round(avgPercentage),
      bestPercentage: Math.round(bestResult.percentage),
      bestExam: bestResult.examTitle,
    };
  }, [results]);

  const filteredResults = useMemo(() => {
    let list = [...results];
    if (filter === 'passed') list = list.filter(r => r.status === 'passed');
    if (filter === 'failed') list = list.filter(r => r.status === 'failed');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => r.examTitle.toLowerCase().includes(q) || r.subject?.toLowerCase().includes(q));
    }
    return list;
  }, [results, filter, search]);

  if (isLoading) {
    return (
      <LMSLayout
        pageTitle="My Results"
        breadcrumbs={[{ label: 'Dashboard', href: '/my' }, { label: 'Results' }]}
      >
        <div className="loading-animated">
          <div className="loading-spinner"></div>
          <span>Loading results...</span>
        </div>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout
      pageTitle="My Results"
      breadcrumbs={[{ label: 'Dashboard', href: '/my' }, { label: 'Results' }]}
    >
      {/* Statistics Overview */}
      {statistics && (
        <div className="lms-stats-row monitor-stats">
          <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.05s' }}>
            <div className="lms-stat-icon">📊</div>
            <div className="lms-stat-value">{statistics.total}</div>
            <div className="lms-stat-label">Total Exams</div>
          </div>
          <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
            <div className="lms-stat-icon">✅</div>
            <div className="lms-stat-value" style={{ color: 'var(--success)' }}>{statistics.passed}</div>
            <div className="lms-stat-label">Passed</div>
          </div>
          <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.15s' }}>
            <div className="lms-stat-icon">❌</div>
            <div className="lms-stat-value" style={{ color: 'var(--danger)' }}>{statistics.failed}</div>
            <div className="lms-stat-label">Failed</div>
          </div>
          <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
            <div className="lms-stat-icon">📈</div>
            <div className="lms-stat-value">{statistics.avgPercentage}%</div>
            <div className="lms-stat-label">Average Score</div>
          </div>
          <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.25s' }}>
            <div className="lms-stat-icon">🏆</div>
            <div className="lms-stat-value">{statistics.bestPercentage}%</div>
            <div className="lms-stat-label">Best Score</div>
          </div>
          <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
            <div className="lms-stat-icon">🎯</div>
            <div className="lms-stat-value">{statistics.passRate}%</div>
            <div className="lms-stat-label">Pass Rate</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.1s' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '16px' }}>
          <input
            type="text"
            className="lms-input"
            placeholder="Search exams..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '200px' }}
            aria-label="Search results"
          />
          <div style={{ display: 'flex', gap: '6px' }}>
            {['all', 'passed', 'failed'].map(f => (
              <button
                key={f}
                className={`lms-btn lms-btn-sm ${filter === f ? 'lms-btn-primary' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'passed' ? '✅ Passed' : '❌ Failed'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <div className="lms-section" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
          <h3>No Results Yet</h3>
          <p style={{ color: 'var(--text-muted)', margin: '12px 0 20px' }}>
            You haven&apos;t completed any examinations yet.
          </p>
          <Link href="/my/exams" className="lms-btn lms-btn-primary">Browse Examinations →</Link>
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="lms-section" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
          <h3>No Matching Results</h3>
          <p style={{ color: 'var(--text-muted)', margin: '8px 0' }}>Try adjusting your search or filter.</p>
        </div>
      ) : (
        <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.15s' }}>
          <div className="lms-table-container">
            <table className="lms-table" role="table">
              <thead>
                <tr>
                  <th>Examination</th>
                  <th>Subject</th>
                  <th>Marks</th>
                  <th>Percentage</th>
                  <th>Result</th>
                  <th>Attempt</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((result) => (
                  <tr key={result.id}>
                    <td style={{ fontWeight: 'bold', maxWidth: '200px' }}>{result.examTitle}</td>
                    <td>{result.subject || '—'}</td>
                    <td className="font-mono">
                      {result.marksObtained}/{result.totalMarks}
                    </td>
                    <td className="font-mono" style={{ fontWeight: 'bold' }}>
                      {Math.round(result.percentage)}%
                    </td>
                    <td>
                      <span
                        className={`lms-badge ${result.status === 'passed' ? 'lms-badge-success' : 'lms-badge-danger'}`}
                      >
                        {result.status === 'passed' ? '✅ PASSED' : '❌ FAILED'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>{result.attemptNumber || 1}</td>
                    <td className="font-mono" style={{ fontSize: '11px' }}>
                      {format(new Date(result.submittedAt), 'dd MMM yyyy HH:mm')}
                    </td>
                    <td>
                      <Link
                        href={`/my/results/${result.id}`}
                        className="lms-btn lms-btn-sm lms-btn-primary"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </LMSLayout>
  );
}
