'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import PageWrapper from '@/components/layouts/PageWrapper';
import { Button, Input, Select } from '@/components/common';
import {
  Download,
  Search,
  Filter,
  Eye,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  Award,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';

interface ExamResult {
  exam: {
    _id: string;
    title: string;
    subject: string;
    totalMarks: number;
    passingMarks: number;
    duration: number;
  };
  statistics: {
    totalAttempts: number;
    completedAttempts: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    passRate: number;
    averageTimeSpent: number;
    averageViolations: number;
  };
  submissions: Submission[];
}

interface Submission {
  _id: string;
  student: {
    _id: string;
    name: string;
    email: string;
    rollNumber?: string;
  };
  score: number;
  percentage: number;
  status: 'in_progress' | 'submitted' | 'auto_submitted' | 'graded';
  startTime: string;
  submitTime?: string;
  timeSpent: number;
  violations: number;
  isPassed: boolean;
  attemptNumber: number;
}

export default function ExamResultsPage() {
  const params = useParams();
  const examId = params.examId as string;

  const [results, setResults] = useState<ExamResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'score' | 'time' | 'name'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await api.get(`/admin/exams/${examId}/results`);
        const data = response.data.data;
        // Normalize student names (backend returns firstName/lastName, not name)
        if (data?.submissions) {
          data.submissions = data.submissions.map((s: any) => ({
            ...s,
            student: {
              ...s.student,
              name: s.student?.name || `${s.student?.firstName || ''} ${s.student?.lastName || ''}`.trim() || 'Unknown',
            },
          }));
        }
        setResults(data);
      } catch (error) {
        console.error('Failed to fetch results:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [examId]);

  const handleExportCSV = async () => {
    try {
      const response = await api.get(`/admin/exams/${examId}/results/export`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${results?.exam.title || 'results'}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export results:', error);
    }
  };

  const filteredSubmissions = results?.submissions
    .filter(sub => {
      const matchesSearch = 
        sub.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (sub.student.rollNumber && sub.student.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'passed' && sub.isPassed) ||
        (statusFilter === 'failed' && !sub.isPassed) ||
        (statusFilter === 'in_progress' && sub.status === 'in_progress');
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'score':
          comparison = a.score - b.score;
          break;
        case 'time':
          comparison = a.timeSpent - b.timeSpent;
          break;
        case 'name':
          comparison = a.student.name.localeCompare(b.student.name);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    }) || [];

  if (isLoading) {
    return (
      <PageWrapper breadcrumbs={[{ name: 'Loading...' }]}>
        <div className="flex items-center justify-center h-64">
          <div className="spinner"></div>
        </div>
      </PageWrapper>
    );
  }

  if (!results) {
    return (
      <PageWrapper breadcrumbs={[{ name: 'Results not found' }]}>
        <div className="text-center py-12">
          <p className="text-gray-500">Results not found</p>
        </div>
      </PageWrapper>
    );
  }

  const { exam, submissions } = results;
  // Map backend 'stats' to frontend 'statistics' format
  const rawStats = (results as any).stats || (results as any).statistics || {};
  const statistics = {
    totalAttempts: rawStats.totalSubmissions || rawStats.totalAttempts || submissions?.length || 0,
    completedAttempts: rawStats.totalSubmissions || rawStats.completedAttempts || 0,
    averageScore: parseFloat(rawStats.average || rawStats.averageScore || 0),
    highestScore: rawStats.highest || rawStats.highestScore || 0,
    lowestScore: rawStats.lowest || rawStats.lowestScore || 0,
    passRate: rawStats.totalSubmissions
      ? ((rawStats.passed || 0) / rawStats.totalSubmissions) * 100
      : rawStats.passRate || 0,
    averageTimeSpent: rawStats.averageTimeSpent || 0,
    averageViolations: rawStats.averageViolations || 0,
  };

  return (
    <PageWrapper
      breadcrumbs={[
        { name: 'Site Administration' },
        { name: 'Quiz Administration', href: '/admin/exams' },
        { name: exam.title, href: `/admin/exams/${examId}` },
        { name: 'Results' },
      ]}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{exam.title} - Results</h1>
          <p className="text-gray-600">{exam.subject} • {exam.totalMarks} marks • {exam.duration} minutes</p>
        </div>
        <Button
          onClick={handleExportCSV}
          variant="secondary"
          leftIcon={<Download className="w-4 h-4" />}
        >
          Export CSV
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <div className="card">
          <div className="card-body text-center">
            <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">{statistics.totalAttempts}</p>
            <p className="text-xs text-gray-500">Total Attempts</p>
          </div>
        </div>

        <div className="card">
          <div className="card-body text-center">
            <TrendingUp className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">{statistics.averageScore.toFixed(1)}</p>
            <p className="text-xs text-gray-500">Avg Score</p>
          </div>
        </div>

        <div className="card">
          <div className="card-body text-center">
            <Award className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">{statistics.highestScore}</p>
            <p className="text-xs text-gray-500">Highest</p>
          </div>
        </div>

        <div className="card">
          <div className="card-body text-center">
            <TrendingDown className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">{statistics.lowestScore}</p>
            <p className="text-xs text-gray-500">Lowest</p>
          </div>
        </div>

        <div className="card">
          <div className="card-body text-center">
            <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">{statistics.passRate.toFixed(1)}%</p>
            <p className="text-xs text-gray-500">Pass Rate</p>
          </div>
        </div>

        <div className="card">
          <div className="card-body text-center">
            <Clock className="w-6 h-6 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-800">{Math.round(statistics.averageTimeSpent)}</p>
            <p className="text-xs text-gray-500">Avg Time (min)</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, or roll number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-40"
          >
            <option value="all">All Status</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="in_progress">In Progress</option>
          </Select>
          <Select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field as any);
              setSortOrder(order as any);
            }}
            className="w-40"
          >
            <option value="score-desc">Score (High → Low)</option>
            <option value="score-asc">Score (Low → High)</option>
            <option value="time-asc">Time (Fast → Slow)</option>
            <option value="time-desc">Time (Slow → Fast)</option>
            <option value="name-asc">Name (A → Z)</option>
            <option value="name-desc">Name (Z → A)</option>
          </Select>
        </div>
      </div>

      {/* Results Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Student</th>
                <th>Roll Number</th>
                <th>Score</th>
                <th>Percentage</th>
                <th>Time Spent</th>
                <th>Violations</th>
                <th>Status</th>
                <th>Submitted</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-gray-500">
                    No submissions found
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub, index) => (
                  <tr key={sub._id} className="hover:bg-gray-50">
                    <td className="font-medium text-gray-500">{index + 1}</td>
                    <td>
                      <div>
                        <p className="font-medium">{sub.student.name}</p>
                        <p className="text-xs text-gray-500">{sub.student.email}</p>
                      </div>
                    </td>
                    <td>{sub.student.rollNumber || '-'}</td>
                    <td className="font-semibold">
                      {sub.score} / {exam.totalMarks}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              sub.isPassed ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${sub.percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm">{sub.percentage.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td>{sub.timeSpent} min</td>
                    <td>
                      {sub.violations > 0 ? (
                        <span className="flex items-center gap-1 text-red-600">
                          <AlertTriangle className="w-4 h-4" />
                          {sub.violations}
                        </span>
                      ) : (
                        <span className="text-green-600">0</span>
                      )}
                    </td>
                    <td>
                      {sub.status === 'in_progress' ? (
                        <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">
                          In Progress
                        </span>
                      ) : sub.isPassed ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          Passed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="w-4 h-4" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="text-sm text-gray-500">
                      {sub.submitTime ? format(new Date(sub.submitTime), 'MMM d, HH:mm') : '-'}
                    </td>
                    <td>
                      <Link
                        href={`/admin/exams/${examId}/submissions/${sub._id}`}
                        className="text-primary-600 hover:underline text-sm"
                      >
                        <Eye className="w-4 h-4 inline mr-1" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageWrapper>
  );
}
