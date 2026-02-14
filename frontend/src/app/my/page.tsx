'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useExamStore } from '@/store/examStore';
import api from '@/lib/api';
import { format, isAfter, isBefore } from 'date-fns';
import LMSLayout from '@/components/layouts/LMSLayout';

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const { availableExams, examResults, fetchAvailableExams, fetchExamResults, isLoadingExams, examError } = useExamStore();
  const [serverTime, setServerTime] = useState(new Date());

  useEffect(() => {
    fetchAvailableExams();
    fetchExamResults();
    // Try to get server time for accuracy
    const fetchTime = async () => {
      try {
        const res = await api.get('/student/server-time');
        setServerTime(new Date(res.data.data?.serverTime || Date.now()));
      } catch {
        setServerTime(new Date());
      }
    };
    fetchTime();
    const timer = setInterval(() => {
      setServerTime(prev => new Date(prev.getTime() + 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [fetchAvailableExams, fetchExamResults]);

  const now = serverTime;

  // Active exams (currently running and student can start/resume)
  const activeExams = availableExams.filter((exam) => {
    return exam.status === 'available' || exam.status === 'in-progress';
  });

  // Upcoming exams
  const upcomingExams = availableExams.filter((exam) => {
    return exam.status === 'upcoming';
  });

  // Recent results (backend returns flat: { id, examId, examTitle, subject, marksObtained, totalMarks, percentage, status, submittedAt, ... })
  const recentResults = examResults.slice(0, 5);

  if (isLoadingExams) {
    return (
      <LMSLayout pageTitle="Student Dashboard">
        <div className="loading-animated">
          <div className="loading-spinner"></div>
          <span>Loading examination data...</span>
        </div>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout
      pageTitle="Exam Dashboard"
      breadcrumbs={[{ label: 'Student' }, { label: 'Exam Dashboard' }]}
    >
      {/* Student Info Box */}
      <div className="lms-info-box animate-fadeInDown">
        <div className="lms-info-box-header">
          <span className="section-icon">👤</span> Student Information
        </div>
        <div className="lms-info-box-body">
          <div className="lms-info-row">
            <div className="lms-info-label">Name:</div>
            <div className="lms-info-value">{user?.firstName} {user?.lastName}</div>
          </div>
          <div className="lms-info-row">
            <div className="lms-info-label">Student ID:</div>
            <div className="lms-info-value">{user?.studentId || user?.email}</div>
          </div>
          <div className="lms-info-row">
            <div className="lms-info-label">Server Time:</div>
            <div className="lms-info-value font-mono pulse-text">
              {format(serverTime, 'dd MMM yyyy, HH:mm:ss')}
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {examError && (
        <div className="lms-alert lms-alert-error animate-fadeIn" style={{ marginBottom: '16px' }}>
          <span className="section-icon">⚠️</span>
          <div>
            <div className="lms-alert-title">Failed to Load Examinations</div>
            <div>{examError}</div>
            <button 
              className="lms-btn lms-btn-sm" 
              style={{ marginTop: '8px' }}
              onClick={() => { fetchAvailableExams(); fetchExamResults(); }}
            >
              🔄 Retry
            </button>
          </div>
        </div>
      )}

      {/* Active Examinations Alert */}
      {activeExams.length > 0 && (
        <div className="lms-alert lms-alert-success live-exam-alert animate-pulse-border">
          <div className="live-indicator"></div>
          <div>
            <div className="lms-alert-title">🟢 ACTIVE EXAMINATION</div>
            <div>
              You have {activeExams.length} examination(s) available. Please proceed immediately.
            </div>
          </div>
        </div>
      )}

      {/* Active Exams Table */}
      {activeExams.length > 0 && (
        <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.1s' }}>
          <div className="lms-section-title">
            <span className="section-icon">🔴</span> Current Examinations
          </div>
          <div className="lms-table-container">
            <table className="lms-table">
              <thead>
                <tr>
                  <th>Exam Code</th>
                  <th>Title</th>
                  <th>Subject</th>
                  <th>End Time</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeExams.map((exam) => (
                  <tr key={exam._id} className="exam-row-highlight">
                    <td className="font-mono">{exam._id.slice(-8).toUpperCase()}</td>
                    <td><strong>{exam.title}</strong></td>
                    <td>{exam.subject || '-'}</td>
                    <td className="font-mono countdown-text">{format(new Date(exam.endTime), 'dd/MM/yyyy HH:mm')}</td>
                    <td>{exam.duration} min</td>
                    <td>
                      {exam.status === 'in-progress' ? (
                        <span className="lms-status lms-status-pending pulse-status">IN PROGRESS</span>
                      ) : (
                        <span className="lms-status lms-status-active pulse-status">READY</span>
                      )}
                    </td>
                    <td>
                      {exam.status === 'in-progress' ? (
                        <Link href={`/my/exams/${exam._id}/attempt`} className="lms-btn lms-btn-primary lms-btn-sm btn-pulse">
                          ▶ Continue
                        </Link>
                      ) : (
                        <Link href={`/my/exams/${exam._id}`} className="lms-btn lms-btn-success lms-btn-sm btn-pulse">
                          ▶ Start Exam
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Active Exams */}
      {activeExams.length === 0 && (
        <div className="lms-alert lms-alert-info animate-fadeIn">
          <span className="section-icon">📋</span>
          <div>
            <div className="lms-alert-title">No Active Examinations</div>
            <div>
              There are no examinations scheduled for your batch at this time.
              Please check the schedule below for upcoming examinations.
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Exams */}
      <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.2s' }}>
        <div className="lms-section-title">
          <span className="section-icon">📅</span> Upcoming Examinations
        </div>
        <div className="lms-table-container">
          {upcomingExams.length > 0 ? (
            <table className="lms-table">
              <thead>
                <tr>
                  <th>Exam Code</th>
                  <th>Title</th>
                  <th>Subject</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {upcomingExams.map((exam) => (
                  <tr key={exam._id}>
                    <td className="font-mono">{exam._id.slice(-8).toUpperCase()}</td>
                    <td>{exam.title}</td>
                    <td>{exam.subject || '-'}</td>
                    <td className="font-mono">{format(new Date(exam.startTime), 'dd/MM/yyyy HH:mm')}</td>
                    <td className="font-mono">{format(new Date(exam.endTime), 'dd/MM/yyyy HH:mm')}</td>
                    <td>{exam.duration} min</td>
                    <td>
                      <span className="lms-status lms-status-pending">SCHEDULED</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="lms-table-empty empty-state-animated">
              <div className="empty-icon">📭</div>
              <div>No upcoming examinations scheduled.</div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Results */}
      <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.3s' }}>
        <div className="lms-section-title">
          <span className="section-icon">📊</span> Recent Results
        </div>
        <div className="lms-table-container">
          {recentResults.length > 0 ? (
            <table className="lms-table">
              <thead>
                <tr>
                  <th>Exam Code</th>
                  <th>Title</th>
                  <th>Date</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentResults.map((result: any) => (
                  <tr key={result.id || result._id}>
                    <td className="font-mono">{(result.examId || '').slice(-8).toUpperCase()}</td>
                    <td>{result.examTitle || 'N/A'}</td>
                    <td className="font-mono">
                      {result.submittedAt ? format(new Date(result.submittedAt), 'dd/MM/yyyy') : '-'}
                    </td>
                    <td>
                      <strong>{result.marksObtained ?? 0} / {result.totalMarks ?? 0}</strong>
                    </td>
                    <td>
                      {result.status === 'passed' ? (
                        <span className="lms-status lms-status-active">PASSED</span>
                      ) : (
                        <span className="lms-status lms-status-closed">FAILED</span>
                      )}
                    </td>
                    <td>
                      <Link href={`/my/results/${result.id || result._id}`} className="lms-btn lms-btn-sm">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="lms-table-empty empty-state-animated">
              <div className="empty-icon">📝</div>
              <div>No examination results available.</div>
            </div>
          )}
        </div>
      </div>

      {/* Examination Rules */}
      <div className="lms-info-box guidelines-box animate-fadeIn" style={{ animationDelay: '0.4s' }}>
        <div className="lms-info-box-header">
          <span className="section-icon">📖</span> Important Instructions
        </div>
        <div className="lms-info-box-body" style={{ fontSize: '12px', lineHeight: '1.8' }}>
          <ul className="guidelines-list">
            <li className="guideline-item"><span className="guideline-icon active">1</span>Ensure you have a stable internet connection before starting the examination.</li>
            <li className="guideline-item"><span className="guideline-icon idle">2</span>Do not refresh the page or navigate away during the examination.</li>
            <li className="guideline-item"><span className="guideline-icon violation">3</span>Opening new tabs or windows during the examination is prohibited and will be logged.</li>
            <li className="guideline-item"><span className="guideline-icon submit">4</span>Your examination will be auto-submitted when the time expires.</li>
            <li className="guideline-item"><span className="guideline-icon active">5</span>All answers are saved automatically. Do not rely on manual submission.</li>
            <li className="guideline-item"><span className="guideline-icon violation">6</span>Any attempt to use unauthorized materials will result in disqualification.</li>
            <li className="guideline-item"><span className="guideline-icon terminate">7</span>For technical issues, contact support immediately: support@proctoredexam.com</li>
          </ul>
        </div>
      </div>
    </LMSLayout>
  );
}
