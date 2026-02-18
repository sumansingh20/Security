'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import LMSLayout from '@/components/layouts/LMSLayout';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  studentId?: string;
  dateOfBirth?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter !== 'all') params.append('role', roleFilter);
      
      const response = await api.get(`/admin/users?${params.toString()}`);
      setUsers(response.data.data.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await api.put(`/admin/users/${userId}`, { isActive: !currentStatus });
      toast.success(`User ${currentStatus ? 'deactivated' : 'activated'}`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    try {
      await api.delete(`/admin/users/${userToDelete._id}`);
      toast.success('User deleted');
      setShowDeleteModal(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      // Parse CSV to JSON
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        toast.error('CSV file is empty or has no data rows');
        setImporting(false);
        return;
      }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

      const users = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const u: any = {};
        headers.forEach((h, i) => {
          if (h === 'firstname' || h === 'first_name') u.firstName = values[i];
          else if (h === 'lastname' || h === 'last_name') u.lastName = values[i];
          else if (h === 'email') u.email = values[i];
          else if (h === 'role') u.role = values[i] || 'student';
          else if (h === 'password') u.password = values[i];
          else if (h === 'studentid' || h === 'student_id') u.studentId = values[i];
          else if (h === 'employeeid' || h === 'employee_id') u.employeeId = values[i];
          else if (h === 'department') u.department = values[i];
          else if (h === 'batch') u.batch = values[i];
          else if (h === 'dateofbirth' || h === 'date_of_birth' || h === 'dob') u.dateOfBirth = values[i];
          else if (h === 'phone') u.phone = values[i];
        });
        if (!u.password) u.password = 'Student@123';
        if (!u.role) u.role = 'student';
        return u;
      }).filter(u => u.email && u.firstName && u.lastName);

      if (users.length === 0) {
        toast.error('No valid users found in CSV. Required columns: firstName, lastName, email');
        setImporting(false);
        return;
      }

      const response = await api.post('/admin/users/bulk', { users });

      setImportResult({
        success: true,
        imported: response.data.data?.created || 0,
        failed: response.data.data?.failed || 0,
        errors: response.data.data?.errors || [],
      });

      toast.success(`Imported ${response.data.data?.created || 0} users`);
      fetchUsers();
    } catch (error: any) {
      setImportResult({
        success: false,
        imported: 0,
        failed: 0,
        errors: [{ row: 0, message: error.response?.data?.message || 'Import failed' }],
      });
      toast.error('Import failed');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadTemplate = () => {
    const template = 'firstName,lastName,email,studentId,dateOfBirth,role,department,batch\n';
    const example = 'John,Doe,john.doe@example.com,STU001,15-08-1990,student,Computer Science,2024\n';
    const blob = new Blob([template + example], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'user_import_template.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const filteredUsers = users.filter(user =>
    user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.studentId && user.studentId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const stats = {
    total: users.length,
    students: users.filter(u => u.role === 'student').length,
    teachers: users.filter(u => u.role === 'teacher').length,
    admins: users.filter(u => u.role === 'admin').length,
    active: users.filter(u => u.isActive).length,
  };

  return (
    <LMSLayout
      pageTitle="User Management"
      breadcrumbs={[
        { label: 'Administration' },
        { label: 'Users' }
      ]}
    >
      {/* Stats */}
      <div className="lms-stats-row">
        <div className="lms-stat">
          <div className="lms-stat-value">{stats.total}</div>
          <div className="lms-stat-label">Total Users</div>
        </div>
        <div className="lms-stat">
          <div className="lms-stat-value">{stats.students}</div>
          <div className="lms-stat-label">Students</div>
        </div>
        <div className="lms-stat">
          <div className="lms-stat-value">{stats.teachers}</div>
          <div className="lms-stat-label">Teachers</div>
        </div>
        <div className="lms-stat">
          <div className="lms-stat-value">{stats.admins}</div>
          <div className="lms-stat-label">Admins</div>
        </div>
        <div className="lms-stat">
          <div className="lms-stat-value" style={{ color: 'var(--success)' }}>{stats.active}</div>
          <div className="lms-stat-label">Active</div>
        </div>
      </div>

      {/* Filters */}
      <div className="lms-section">
        <div className="lms-section-title">Filter &amp; Search</div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="lms-form-group" style={{ margin: 0, flex: '1 1 200px' }}>
            <label className="lms-label">Search</label>
            <input
              type="text"
              className="lms-input"
              placeholder="Search by name, email, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="lms-form-group" style={{ margin: 0, width: '150px' }}>
            <label className="lms-label">Role</label>
            <select
              className="lms-select"
              title="Filter by role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>
          </div>
          <Link href="/admin/users/create" className="lms-btn lms-btn-primary">
            Add User
          </Link>
          <button 
            onClick={() => setShowImportModal(true)} 
            className="lms-btn"
          >
            Import CSV
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="lms-section">
        <div className="lms-section-title">User List</div>
        
        {isLoading ? (
          <div className="lms-loading">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="lms-table-empty">
            No users found.{' '}
            <Link href="/admin/users/create" style={{ color: 'var(--link-color)' }}>Add new user</Link>
          </div>
        ) : (
          <div className="lms-table-container">
            <table className="lms-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Student ID</th>
                  <th>DOB</th>
                  <th>Last Login</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user._id}>
                    <td className="font-mono">{user._id.slice(-8).toUpperCase()}</td>
                    <td>{user.firstName} {user.lastName}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`lms-status ${
                        user.role === 'admin' ? 'lms-status-closed' :
                        user.role === 'teacher' ? 'lms-status-info' : ''
                      }`}>
                        {user.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="font-mono">{user.studentId || '-'}</td>
                    <td className="font-mono">
                      {user.dateOfBirth ? format(new Date(user.dateOfBirth), 'dd/MM/yyyy') : '-'}
                    </td>
                    <td className="font-mono" style={{ fontSize: '11px' }}>
                      {user.lastLogin ? format(new Date(user.lastLogin), 'dd/MM/yy HH:mm') : 'Never'}
                    </td>
                    <td>
                      <span className={`lms-status ${user.isActive ? 'lms-status-active' : 'lms-status-closed'}`}>
                        {user.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <Link href={`/admin/users/${user._id}`} className="lms-btn lms-btn-sm">
                          Edit
                        </Link>
                        <button
                          onClick={() => handleToggleStatus(user._id, user.isActive)}
                          className={`lms-btn lms-btn-sm ${user.isActive ? '' : 'lms-btn-primary'}`}
                        >
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => {
                              setUserToDelete(user);
                              setShowDeleteModal(true);
                            }}
                            className="lms-btn lms-btn-sm lms-btn-danger"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Guidelines */}
      <div className="lms-info-box">
        <div className="lms-info-box-header">User Management Guidelines</div>
        <div className="lms-info-box-body" style={{ fontSize: '12px' }}>
          <ul style={{ paddingLeft: '20px', margin: 0 }}>
            <li>Student login requires: Student ID + DOB (DDMMYYYY format)</li>
            <li>Admin and Teacher login requires: Email + Password</li>
            <li>Deactivated users cannot login but their data is preserved</li>
            <li>Deleting a user will remove all associated examination data</li>
          </ul>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div className="lms-modal-overlay">
          <div className="lms-modal">
            <div className="lms-modal-header">
              Confirm Delete
            </div>
            <div className="lms-modal-body">
              <p>Are you sure you want to delete user <strong>{userToDelete.firstName} {userToDelete.lastName}</strong>?</p>
              <p style={{ marginTop: '8px', color: 'var(--error)', fontSize: '12px' }}>
                This will permanently remove all associated examination data and cannot be undone.
              </p>
            </div>
            <div className="lms-modal-footer">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
                className="lms-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="lms-btn lms-btn-danger"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="lms-modal-overlay">
          <div className="lms-modal" style={{ maxWidth: '500px' }}>
            <div className="lms-modal-header">
              Import Users from CSV
            </div>
            <div className="lms-modal-body">
              <div className="lms-info-box" style={{ marginBottom: '16px' }}>
                <div className="lms-info-box-header">CSV Format</div>
                <div className="lms-info-box-body" style={{ fontSize: '12px' }}>
                  <p style={{ margin: '0 0 8px' }}>Required columns:</p>
                  <ul style={{ paddingLeft: '20px', margin: '0 0 8px' }}>
                    <li><code>firstName</code> - Student first name</li>
                    <li><code>lastName</code> - Student last name</li>
                    <li><code>email</code> - Unique email address</li>
                    <li><code>studentId</code> - Unique student ID</li>
                    <li><code>dateOfBirth</code> - DOB (DD-MM-YYYY format)</li>
                  </ul>
                  <p style={{ margin: '0' }}>Optional: <code>role</code>, <code>department</code>, <code>batch</code></p>
                </div>
              </div>

              <button onClick={downloadTemplate} className="lms-btn lms-btn-sm" style={{ marginBottom: '16px' }}>
                Download Template CSV
              </button>

              <div className="lms-form-group">
                <label className="lms-label">Select CSV File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="lms-input"
                  disabled={importing}
                />
              </div>

              {importing && (
                <div className="lms-loading" style={{ padding: '16px 0' }}>
                  Importing users... Please wait.
                </div>
              )}

              {importResult && (
                <div className={`lms-alert ${importResult.success ? 'lms-alert-success' : 'lms-alert-error'}`} style={{ marginTop: '16px' }}>
                  {importResult.success ? (
                    <div>
                      <strong>Import Complete</strong>
                      <p style={{ margin: '4px 0 0' }}>
                        Successfully imported: {importResult.imported} users<br />
                        {importResult.failed > 0 && `Failed: ${importResult.failed} rows`}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <strong>Import Failed</strong>
                      {importResult.errors.map((err, i) => (
                        <p key={i} style={{ margin: '4px 0 0', fontSize: '12px' }}>
                          {err.row > 0 ? `Row ${err.row}: ` : ''}{err.message}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="lms-modal-footer">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportResult(null);
                }}
                className="lms-btn"
                disabled={importing}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </LMSLayout>
  );
}
