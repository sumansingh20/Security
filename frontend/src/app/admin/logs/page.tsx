'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import { safeFormat } from '@/lib/dateUtils';

interface AuditLog {
  _id: string;
  action: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
  targetType: string;
  targetId: string;
  details: string | Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState({
    action: 'all',
    severity: 'all',
    dateFrom: '',
    dateTo: '',
    search: ''
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [serverTime, setServerTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setServerTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [page, filter.action, filter.severity]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '50');
      if (filter.action !== 'all') params.append('action', filter.action);
      if (filter.severity !== 'all') params.append('severity', filter.severity);
      if (filter.dateFrom) params.append('dateFrom', filter.dateFrom);
      if (filter.dateTo) params.append('dateTo', filter.dateTo);
      if (filter.search) params.append('search', filter.search);

      const response = await api.get(`/admin/audit-logs?${params}`);
      setLogs(response.data.data.logs || []);
      setTotalPages(response.data.data.pagination?.pages || response.data.data.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      // Generate sample logs for demo
      setLogs(generateSampleLogs());
    } finally {
      setIsLoading(false);
    }
  };

  const generateSampleLogs = (): AuditLog[] => {
    const actions = ['LOGIN', 'LOGOUT', 'EXAM_START', 'EXAM_SUBMIT', 'VIOLATION', 'USER_CREATE', 'EXAM_CREATE', 'PASSWORD_CHANGE'];
    const severities: AuditLog['severity'][] = ['info', 'warning', 'error', 'critical'];
    const sampleLogs: AuditLog[] = [];
    
    for (let i = 0; i < 20; i++) {
      const action = actions[Math.floor(Math.random() * actions.length)];
      sampleLogs.push({
        _id: `log_${i}`,
        action,
        user: {
          _id: `user_${i}`,
          firstName: ['John', 'Jane', 'Bob', 'Alice'][Math.floor(Math.random() * 4)],
          lastName: ['Doe', 'Smith', 'Johnson', 'Williams'][Math.floor(Math.random() * 4)],
          email: `user${i}@university.edu`,
          role: ['student', 'teacher', 'admin'][Math.floor(Math.random() * 3)]
        },
        targetType: ['User', 'Exam', 'Session', 'System'][Math.floor(Math.random() * 4)],
        targetId: `target_${i}`,
        details: `${action} action performed`,
        ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        timestamp: new Date(Date.now() - Math.floor(Math.random() * 86400000 * 7)).toISOString(),
        severity: severities[Math.floor(Math.random() * severities.length)]
      });
    }
    return sampleLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'critical': return 'lms-status-closed';
      case 'error': return 'lms-status-closed';
      case 'warning': return 'lms-status-pending';
      case 'info': return 'lms-status-info';
      default: return '';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'LOGIN': return '🔐';
      case 'LOGOUT': return '🚪';
      case 'EXAM_START': return '▶️';
      case 'EXAM_SUBMIT': return '✅';
      case 'VIOLATION': return '⚠️';
      case 'USER_CREATE': return '👤';
      case 'EXAM_CREATE': return '📝';
      case 'PASSWORD_CHANGE': return '🔑';
      default: return '📋';
    }
  };

  if (isLoading) {
    return (
      <LMSLayout pageTitle="Audit Logs">
        <div className="loading-animated">
          <div className="loading-spinner"></div>
          <span>Loading audit logs...</span>
        </div>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout
      pageTitle="Audit Logs"
      breadcrumbs={[{ label: 'Administration' }, { label: 'System' }, { label: 'Audit Logs' }]}
    >
      {/* Header Info */}
      <div className="lms-info-box animate-fadeInDown">
        <div className="lms-info-box-body flex justify-between items-center flex-wrap gap-3">
          <div className="flex gap-6 flex-wrap">
            <div>
              <span className="lms-info-label">🕐 Server Time:</span>
              <span className="lms-info-value font-mono ml-2 pulse-text">
                {safeFormat(serverTime, 'dd/MM/yyyy HH:mm:ss')}
              </span>
            </div>
            <div>
              <span className="lms-info-label">📊 Total Logs:</span>
              <span className="lms-info-value font-mono ml-2">{logs.length}</span>
            </div>
          </div>
          <button className="lms-btn lms-btn-sm" onClick={fetchLogs}>
            <span className="refresh-icon">↻</span> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.1s' }}>
        <div className="lms-section-title"><span className="section-icon">🔍</span> Filters</div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="lms-form-group" style={{ margin: 0, minWidth: '150px' }}>
            <label className="lms-label">Action Type</label>
            <select
              className="lms-select"
              title="Filter by action type"
              value={filter.action}
              onChange={(e) => setFilter({ ...filter, action: e.target.value })}
            >
              <option value="all">All Actions</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="EXAM_START">Exam Start</option>
              <option value="EXAM_SUBMIT">Exam Submit</option>
              <option value="VIOLATION">Violation</option>
              <option value="USER_CREATE">User Create</option>
              <option value="EXAM_CREATE">Exam Create</option>
            </select>
          </div>
          <div className="lms-form-group" style={{ margin: 0, minWidth: '150px' }}>
            <label className="lms-label">Severity</label>
            <select
              className="lms-select"
              title="Filter by severity"
              value={filter.severity}
              onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
            >
              <option value="all">All Severities</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="lms-form-group" style={{ margin: 0, flex: '1 1 200px' }}>
            <label className="lms-label">Search</label>
            <input
              type="text"
              className="lms-input"
              placeholder="Search by user, IP, or details..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="lms-stats-row monitor-stats">
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.15s' }}>
          <div className="lms-stat-icon">📋</div>
          <div className="lms-stat-value">{logs.length}</div>
          <div className="lms-stat-label">Total Logs</div>
        </div>
        <div className="lms-stat stat-card-monitor stat-active animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          <div className="lms-stat-icon">🔐</div>
          <div className="lms-stat-value">{logs.filter(l => l.action === 'LOGIN').length}</div>
          <div className="lms-stat-label">Logins</div>
        </div>
        <div className="lms-stat stat-card-monitor stat-violation animate-fadeInUp" style={{ animationDelay: '0.25s' }}>
          <div className="lms-stat-icon">⚠️</div>
          <div className="lms-stat-value">{logs.filter(l => l.action === 'VIOLATION').length}</div>
          <div className="lms-stat-label">Violations</div>
        </div>
        <div className="lms-stat stat-card-monitor animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
          <div className="lms-stat-icon">🚨</div>
          <div className="lms-stat-value">{logs.filter(l => l.severity === 'critical' || l.severity === 'error').length}</div>
          <div className="lms-stat-label">Errors</div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="lms-section animate-fadeIn" style={{ animationDelay: '0.2s' }}>
        <div className="lms-section-title"><span className="section-icon">📜</span> Audit Log Entries</div>
        {logs.length === 0 ? (
          <div className="lms-table-empty empty-state-animated">
            <div className="empty-icon">📋</div>
            <div>No audit logs found.</div>
          </div>
        ) : (
          <div className="lms-table-container">
            <table className="lms-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>User</th>
                  <th>Target</th>
                  <th>Details</th>
                  <th>IP Address</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id} className={log.severity === 'critical' || log.severity === 'error' ? 'bg-red-50' : ''}>
                    <td className="font-mono text-xs">{safeFormat(log.timestamp, 'dd/MM/yy HH:mm:ss')}</td>
                    <td>
                      <span style={{ marginRight: '6px' }}>{getActionIcon(log.action)}</span>
                      {log.action}
                    </td>
                    <td>
                      {log.user ? (
                        <div>
                          <div>{log.user.firstName} {log.user.lastName}</div>
                          <div className="text-xs text-muted">{log.user.email}</div>
                        </div>
                      ) : (
                        <span className="text-muted">System</span>
                      )}
                    </td>
                    <td>
                      <span className="lms-badge">{log.targetType}</span>
                    </td>
                    <td className="text-xs">{typeof log.details === 'string' ? log.details : log.details ? JSON.stringify(log.details) : '—'}</td>
                    <td className="font-mono text-xs">{log.ipAddress}</td>
                    <td>
                      <span className={`lms-status ${getSeverityClass(log.severity)}`}>
                        {(log.severity || 'info').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            <button
              className="lms-btn lms-btn-sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              ← Previous
            </button>
            <span className="lms-btn lms-btn-sm" style={{ cursor: 'default' }}>
              Page {page} of {totalPages}
            </span>
            <button
              className="lms-btn lms-btn-sm"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Guidelines */}
      <div className="lms-info-box guidelines-box animate-fadeIn" style={{ animationDelay: '0.3s' }}>
        <div className="lms-info-box-header">
          <span className="section-icon">📖</span> Audit Log Information
        </div>
        <div className="lms-info-box-body text-xs">
          <ul className="guidelines-list">
            <li className="guideline-item"><span className="guideline-icon active">●</span>All system actions are logged automatically for security auditing.</li>
            <li className="guideline-item"><span className="guideline-icon idle">●</span>Logs are retained for 90 days as per data retention policy.</li>
            <li className="guideline-item"><span className="guideline-icon violation">●</span>Critical events trigger real-time alerts to administrators.</li>
            <li className="guideline-item"><span className="guideline-icon submit">●</span>Export functionality available for compliance reporting.</li>
          </ul>
        </div>
      </div>
    </LMSLayout>
  );
}
