'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import LMSLayout from '@/components/layouts/LMSLayout';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface UserDetail {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  studentId?: string;
  employeeId?: string;
  role: string;
  department?: string;
  batch?: string;
  phone?: string;
  rollNumber?: string;
  section?: string;
  semester?: number;
  isActive: boolean;
  isVerified: boolean;
  dateOfBirth?: string;
  createdAt: string;
  lastLogin?: string;
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    try {
      const res = await api.get(`/admin/users/${userId}`);
      const userData = res.data.data?.user || res.data.user || res.data.data;
      setUser(userData);
      setEditData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        role: userData.role || 'student',
        department: userData.department || '',
        phone: userData.phone || '',
        studentId: userData.studentId || '',
        employeeId: userData.employeeId || '',
        rollNumber: userData.rollNumber || '',
        section: userData.section || '',
        semester: userData.semester || '',
        batch: userData.batch || '',
        isActive: userData.isActive ?? true,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = { ...editData };
      if (payload.semester) payload.semester = Number(payload.semester);
      Object.keys(payload).forEach(key => {
        if (payload[key] === '') delete payload[key];
      });
      payload.isActive = editData.isActive;

      await api.put(`/admin/users/${userId}`, payload);
      toast.success('User updated successfully');
      setEditing(false);
      fetchUser();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/admin/users/${userId}`, { password: newPassword });
      toast.success('Password reset successfully');
      setShowResetPassword(false);
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!user) return;
    try {
      await api.put(`/admin/users/${userId}`, { isActive: !user.isActive });
      toast.success(`User ${user.isActive ? 'deactivated' : 'activated'}`);
      fetchUser();
    } catch (err: any) {
      toast.error('Failed to update status');
    }
  };

  const getRoleColor = (role: string) => {
    if (role === 'admin') return '#dc2626';
    if (role === 'teacher') return '#2563eb';
    return '#059669';
  };

  const getRoleIcon = (role: string) => {
    if (role === 'admin') return '🛡️';
    if (role === 'teacher') return '👨‍🏫';
    return '🎓';
  };

  if (loading) {
    return (
      <LMSLayout pageTitle="User Details" breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Users', href: '/admin/users' }, { label: 'Loading...' }]}>
        <div className="lms-loading" style={{ padding: '60px 0', textAlign: 'center' }}>Loading user details...</div>
      </LMSLayout>
    );
  }

  if (error || !user) {
    return (
      <LMSLayout pageTitle="User Details" breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Users', href: '/admin/users' }, { label: 'Error' }]}>
        <div className="lms-alert lms-alert-error" style={{ maxWidth: '500px', margin: '40px auto', textAlign: 'center' }}>
          {error || 'User not found'}
        </div>
        <div style={{ textAlign: 'center' }}>
          <button onClick={() => router.push('/admin/users')} className="lms-btn">Back to Users</button>
        </div>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout
      pageTitle={`${user.firstName} ${user.lastName}`}
      breadcrumbs={[
        { label: 'Admin', href: '/admin/dashboard' },
        { label: 'Users', href: '/admin/users' },
        { label: `${user.firstName} ${user.lastName}` },
      ]}
    >
      {/* User Header Card */}
      <div className="lms-section animate-fade-in" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: `linear-gradient(135deg, ${getRoleColor(user.role)}, ${getRoleColor(user.role)}99)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px', color: '#fff', fontWeight: 700,
            }}>
              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
                {user.firstName} {user.lastName}
              </h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                <span className={`lms-status ${user.role === 'admin' ? 'lms-status-closed' : user.role === 'teacher' ? 'lms-status-info' : 'lms-status-active'}`}>
                  {getRoleIcon(user.role)} {user.role.toUpperCase()}
                </span>
                <span className={`lms-status ${user.isActive ? 'lms-status-active' : 'lms-status-closed'}`}>
                  {user.isActive ? '● ACTIVE' : '● INACTIVE'}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {!editing ? (
              <>
                <button onClick={() => setEditing(true)} className="lms-btn lms-btn-primary lms-btn-sm">Edit User</button>
                <button onClick={() => setShowResetPassword(true)} className="lms-btn lms-btn-sm">Reset Password</button>
                <button onClick={handleToggleStatus} className={`lms-btn lms-btn-sm ${user.isActive ? 'lms-btn-warning' : 'lms-btn-success'}`}>
                  {user.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </>
            ) : (
              <>
                <button onClick={handleSave} className="lms-btn lms-btn-success lms-btn-sm" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={() => { setEditing(false); fetchUser(); }} className="lms-btn lms-btn-sm">Cancel</button>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Main Info */}
        <div>
          {/* Personal Information */}
          <div className="lms-section animate-fade-in-up" style={{ marginBottom: '20px' }}>
            <div className="lms-section-title">Personal Information</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '16px' }}>
              {editing ? (
                <>
                  <div className="lms-form-group" style={{ margin: 0 }}>
                    <label className="lms-label">First Name</label>
                    <input type="text" className="lms-input" value={editData.firstName} onChange={e => setEditData({ ...editData, firstName: e.target.value })} />
                  </div>
                  <div className="lms-form-group" style={{ margin: 0 }}>
                    <label className="lms-label">Last Name</label>
                    <input type="text" className="lms-input" value={editData.lastName} onChange={e => setEditData({ ...editData, lastName: e.target.value })} />
                  </div>
                  <div className="lms-form-group" style={{ margin: 0 }}>
                    <label className="lms-label">Email</label>
                    <input type="email" className="lms-input" value={editData.email} onChange={e => setEditData({ ...editData, email: e.target.value })} />
                  </div>
                  <div className="lms-form-group" style={{ margin: 0 }}>
                    <label className="lms-label">Role</label>
                    <select className="lms-select" value={editData.role} onChange={e => setEditData({ ...editData, role: e.target.value })} title="Role">
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="lms-form-group" style={{ margin: 0 }}>
                    <label className="lms-label">Department</label>
                    <input type="text" className="lms-input" value={editData.department} onChange={e => setEditData({ ...editData, department: e.target.value })} />
                  </div>
                  <div className="lms-form-group" style={{ margin: 0 }}>
                    <label className="lms-label">Phone</label>
                    <input type="tel" className="lms-input" value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} />
                  </div>
                </>
              ) : (
                <>
                  <InfoItem label="First Name" value={user.firstName} />
                  <InfoItem label="Last Name" value={user.lastName} />
                  <InfoItem label="Email" value={user.email} mono />
                  <InfoItem label="Role" value={<span style={{ color: getRoleColor(user.role), fontWeight: 600 }}>{getRoleIcon(user.role)} {user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span>} />
                  <InfoItem label="Department" value={user.department || '-'} />
                  <InfoItem label="Phone" value={user.phone || '-'} />
                </>
              )}
            </div>
          </div>

          {/* Role-specific Details */}
          <div className="lms-section animate-fade-in-up" style={{ marginBottom: '20px' }}>
            <div className="lms-section-title">
              {user.role === 'student' ? '🎓 Student Details' : '👔 Staff Details'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '16px' }}>
              {editing ? (
                user.role === 'student' ? (
                  <>
                    <div className="lms-form-group" style={{ margin: 0 }}>
                      <label className="lms-label">Student ID</label>
                      <input type="text" className="lms-input" value={editData.studentId} onChange={e => setEditData({ ...editData, studentId: e.target.value })} />
                    </div>
                    <div className="lms-form-group" style={{ margin: 0 }}>
                      <label className="lms-label">Roll Number</label>
                      <input type="text" className="lms-input" value={editData.rollNumber} onChange={e => setEditData({ ...editData, rollNumber: e.target.value })} />
                    </div>
                    <div className="lms-form-group" style={{ margin: 0 }}>
                      <label className="lms-label">Batch</label>
                      <input type="text" className="lms-input" value={editData.batch} onChange={e => setEditData({ ...editData, batch: e.target.value })} />
                    </div>
                    <div className="lms-form-group" style={{ margin: 0 }}>
                      <label className="lms-label">Section</label>
                      <input type="text" className="lms-input" value={editData.section} onChange={e => setEditData({ ...editData, section: e.target.value })} />
                    </div>
                    <div className="lms-form-group" style={{ margin: 0 }}>
                      <label className="lms-label">Semester</label>
                      <select className="lms-select" value={editData.semester} onChange={e => setEditData({ ...editData, semester: e.target.value })} title="Semester">
                        <option value="">-</option>
                        {[1,2,3,4,5,6,7,8,9,10].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </>
                ) : (
                  <div className="lms-form-group" style={{ margin: 0 }}>
                    <label className="lms-label">Employee ID</label>
                    <input type="text" className="lms-input" value={editData.employeeId} onChange={e => setEditData({ ...editData, employeeId: e.target.value })} />
                  </div>
                )
              ) : (
                user.role === 'student' ? (
                  <>
                    <InfoItem label="Student ID" value={user.studentId || '-'} mono />
                    <InfoItem label="Date of Birth" value={user.dateOfBirth ? format(new Date(user.dateOfBirth), 'dd/MM/yyyy') : '-'} />
                    <InfoItem label="Roll Number" value={user.rollNumber || '-'} />
                    <InfoItem label="Batch" value={user.batch || '-'} />
                    <InfoItem label="Section" value={user.section || '-'} />
                    <InfoItem label="Semester" value={user.semester?.toString() || '-'} />
                  </>
                ) : (
                  <>
                    <InfoItem label="Employee ID" value={user.employeeId || '-'} mono />
                  </>
                )
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <div className="lms-section animate-fade-in-up" style={{ marginBottom: '20px' }}>
            <div className="lms-section-title">Account Info</div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <InfoItem label="User ID" value={user._id.slice(-12).toUpperCase()} mono />
              <InfoItem label="Status" value={
                <span className={`lms-status ${user.isActive ? 'lms-status-active' : 'lms-status-closed'}`}>
                  {user.isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
              } />
              <InfoItem label="Verified" value={user.isVerified ? 'Yes' : 'No'} />
              <InfoItem label="Joined" value={format(new Date(user.createdAt), 'dd MMM yyyy')} />
              <InfoItem label="Last Login" value={user.lastLogin ? format(new Date(user.lastLogin), 'dd MMM yyyy HH:mm') : 'Never'} />
            </div>
          </div>

          <div className="lms-section animate-fade-in-up">
            <div className="lms-section-title">Quick Actions</div>
            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button onClick={() => router.push('/admin/users')} className="lms-btn" style={{ width: '100%', textAlign: 'left' }}>
                ← Back to User List
              </button>
              <button onClick={() => router.push('/admin/users/create')} className="lms-btn lms-btn-primary" style={{ width: '100%', textAlign: 'left' }}>
                + Create New User
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Password Modal */}
      {showResetPassword && (
        <div className="lms-modal-overlay">
          <div className="lms-modal animate-scale-in" style={{ maxWidth: '420px' }}>
            <div className="lms-modal-header">Reset Password</div>
            <div className="lms-modal-body">
              <p style={{ marginBottom: '16px', color: '#666', fontSize: '14px' }}>
                Set a new password for <strong>{user.firstName} {user.lastName}</strong>.
              </p>
              <div className="lms-form-group" style={{ margin: 0 }}>
                <label className="lms-label">New Password</label>
                <input
                  type="text"
                  className="lms-input"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  autoFocus
                />
              </div>
              <div style={{ marginTop: '8px' }}>
                <button
                  type="button"
                  className="lms-btn lms-btn-sm"
                  onClick={() => {
                    if (user.role === 'student' && user.dateOfBirth) {
                      const dob = new Date(user.dateOfBirth);
                      const pwd = `${String(dob.getDate()).padStart(2, '0')}${String(dob.getMonth() + 1).padStart(2, '0')}${dob.getFullYear()}`;
                      setNewPassword(pwd);
                    } else {
                      setNewPassword('TempPass@123');
                    }
                  }}
                >
                  Use Default ({user.role === 'student' ? 'DOB' : 'TempPass@123'})
                </button>
              </div>
            </div>
            <div className="lms-modal-footer">
              <button onClick={() => { setShowResetPassword(false); setNewPassword(''); }} className="lms-btn">Cancel</button>
              <button onClick={handleResetPassword} className="lms-btn lms-btn-primary" disabled={saving}>
                {saving ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </LMSLayout>
  );
}

function InfoItem({ label, value, mono }: { label: string; value: any; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#999', letterSpacing: '0.5px', fontWeight: 500 }}>{label}</div>
      <div style={{ fontWeight: 600, marginTop: '4px', fontSize: '14px', color: '#333', fontFamily: mono ? 'monospace' : 'inherit' }}>{value || '-'}</div>
    </div>
  );
}
