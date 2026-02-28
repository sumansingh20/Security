'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import LMSLayout from '@/components/layouts/LMSLayout';

export default function ProfilePage() {
  const { user, checkAuth } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'activity'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    studentId: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        studentId: (user as any).studentId || '',
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.put('/auth/profile', {
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
      toast.success('Profile updated successfully!');
      setIsEditing(false);
      checkAuth();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setIsChangingPassword(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword,
      });
      toast.success('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getInitials = () => {
    const f = user?.firstName?.[0] || '';
    const l = user?.lastName?.[0] || '';
    return (f + l).toUpperCase();
  };

  const dashboardLink = user?.role === 'admin' ? '/admin/dashboard' : user?.role === 'teacher' ? '/teacher' : '/my';

  const tabs = [
    { id: 'profile' as const, label: 'Profile' },
    { id: 'security' as const, label: 'Security' },
    { id: 'activity' as const, label: 'Activity' },
  ];

  return (
    <LMSLayout pageTitle="My Profile" breadcrumbs={[{ label: 'Dashboard', href: dashboardLink }, { label: 'Profile' }]}>
      <div className="profile-container">
        {/* Profile Hero */}
        <div className="profile-hero">
          <div className="profile-hero-inner">
            <div className="profile-avatar">{getInitials()}</div>
            <div className="profile-hero-info">
              <h1 className="profile-name">{user?.firstName} {user?.lastName}</h1>
              <p className="profile-email">{user?.email}</p>
              <div className="profile-meta">
                <span className="profile-role-badge">{user?.role?.toUpperCase()}</span>
                {(user as any)?.studentId && (
                  <span className="profile-id-badge">ID: {(user as any).studentId}</span>
                )}
              </div>
            </div>
            <div className="profile-hero-action">
              <Link href={dashboardLink} className="lms-btn lms-btn-sm">Back to Dashboard</Link>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="profile-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`profile-tab ${activeTab === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="profile-content" key={activeTab}>
          {activeTab === 'profile' && (
            <>
              {/* Account Information */}
              <div className="lms-info-box">
                <div className="lms-info-box-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Personal Information</span>
                  {!isEditing && (
                    <button onClick={() => setIsEditing(true)} className="lms-btn lms-btn-primary lms-btn-sm">Edit Profile</button>
                  )}
                </div>
                <div className="lms-info-box-body">
                  {isEditing ? (
                    <form onSubmit={handleSubmit}>
                      <div className="lms-form-row">
                        <div className="lms-form-group">
                          <label className="lms-label">First Name</label>
                          <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="lms-input" placeholder="Enter first name" />
                        </div>
                        <div className="lms-form-group">
                          <label className="lms-label">Last Name</label>
                          <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="lms-input" placeholder="Enter last name" />
                        </div>
                      </div>
                      <div className="lms-form-group" style={{ marginTop: '16px' }}>
                        <label className="lms-label">Email Address</label>
                        <input type="email" value={formData.email} disabled className="lms-input" />
                        <span className="lms-form-hint">Email cannot be changed for security purposes</span>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                        <button type="submit" disabled={isSubmitting} className="lms-btn lms-btn-success">
                          {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button type="button" onClick={() => { setIsEditing(false); if (user) setFormData({ firstName: user.firstName || '', lastName: user.lastName || '', email: user.email || '', studentId: (user as any).studentId || '' }); }} className="lms-btn">
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="lms-info-row">
                        <div className="lms-info-label">First Name</div>
                        <div className="lms-info-value">{user?.firstName || '-'}</div>
                      </div>
                      <div className="lms-info-row">
                        <div className="lms-info-label">Last Name</div>
                        <div className="lms-info-value">{user?.lastName || '-'}</div>
                      </div>
                      <div className="lms-info-row">
                        <div className="lms-info-label">Email</div>
                        <div className="lms-info-value">{user?.email || '-'}</div>
                      </div>
                      <div className="lms-info-row">
                        <div className="lms-info-label">Role</div>
                        <div className="lms-info-value" style={{ textTransform: 'capitalize' }}>{user?.role || '-'}</div>
                      </div>
                      {(user as any)?.studentId && (
                        <div className="lms-info-row">
                          <div className="lms-info-label">Student ID</div>
                          <div className="lms-info-value font-mono">{(user as any).studentId}</div>
                        </div>
                      )}
                      {(user as any)?.employeeId && (
                        <div className="lms-info-row">
                          <div className="lms-info-label">Employee ID</div>
                          <div className="lms-info-value font-mono">{(user as any).employeeId}</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Account Stats */}
              <div className="lms-stats-row" style={{ marginTop: '20px' }}>
                <div className="lms-stat">
                  <div className="lms-stat-value">{user?.role?.toUpperCase() || 'N/A'}</div>
                  <div className="lms-stat-label">Account Type</div>
                </div>
                <div className="lms-stat">
                  <div className="lms-stat-value" style={{ color: 'var(--success)' }}>Active</div>
                  <div className="lms-stat-label">Status</div>
                </div>
                <div className="lms-stat">
                  <div className="lms-stat-value">Today</div>
                  <div className="lms-stat-label">Last Login</div>
                </div>
                <div className="lms-stat">
                  <div className="lms-stat-value">{new Date().getFullYear()}</div>
                  <div className="lms-stat-label">Member Since</div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'security' && (
            <>
              {/* Change Password */}
              <div className="lms-form">
                <div className="lms-form-header">Change Password</div>
                <div className="lms-form-body">
                  <form onSubmit={handlePasswordSubmit}>
                    <div className="lms-form-group" style={{ marginBottom: '16px' }}>
                      <label className="lms-label">Current Password</label>
                      <input type="password" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} className="lms-input" placeholder="Enter current password" required />
                    </div>
                    <div className="lms-form-group" style={{ marginBottom: '16px' }}>
                      <label className="lms-label">New Password</label>
                      <input type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} className="lms-input" placeholder="Min 8 characters" required minLength={8} />
                    </div>
                    <div className="lms-form-group" style={{ marginBottom: '20px' }}>
                      <label className="lms-label">Confirm New Password</label>
                      <input type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} className="lms-input" placeholder="Confirm password" required />
                      {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                        <span className="lms-form-error">Passwords do not match</span>
                      )}
                    </div>
                    <button type="submit" disabled={isChangingPassword} className="lms-btn lms-btn-warning">
                      {isChangingPassword ? 'Changing...' : 'Update Password'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Security Tips */}
              <div className="lms-info-box" style={{ marginTop: '20px' }}>
                <div className="lms-info-box-header">Security Tips</div>
                <div className="lms-info-box-body">
                  <ul className="guidelines-list">
                    <li className="guideline-item"><span className="guideline-icon active">*</span> Use a strong, unique password with at least 8 characters</li>
                    <li className="guideline-item"><span className="guideline-icon active">*</span> Never share your login credentials with anyone</li>
                    <li className="guideline-item"><span className="guideline-icon active">*</span> Log out when using shared or public computers</li>
                    <li className="guideline-item"><span className="guideline-icon active">*</span> Report any suspicious activity to your administrator</li>
                  </ul>
                </div>
              </div>
            </>
          )}

          {activeTab === 'activity' && (
            <>
              {/* Current Session */}
              <div className="lms-info-box">
                <div className="lms-info-box-header">Current Session</div>
                <div className="lms-info-box-body">
                  <div className="lms-info-row">
                    <div className="lms-info-label">Browser</div>
                    <div className="lms-info-value">
                      {typeof navigator !== 'undefined' ? (navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : navigator.userAgent.includes('Safari') ? 'Safari' : 'Other') : 'Unknown'}
                    </div>
                  </div>
                  <div className="lms-info-row">
                    <div className="lms-info-label">Login Time</div>
                    <div className="lms-info-value font-mono">{new Date().toLocaleTimeString()}</div>
                  </div>
                  <div className="lms-info-row">
                    <div className="lms-info-label">Session Status</div>
                    <div className="lms-info-value"><span className="lms-status lms-status-active">ACTIVE</span></div>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="lms-section" style={{ marginTop: '20px' }}>
                <div className="lms-section-title">Quick Links</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Link href={dashboardLink} className="lms-btn">Dashboard</Link>
                  <Link href={user?.role === 'student' ? '/my/exams' : user?.role === 'teacher' ? '/teacher/exams' : '/admin/exams'} className="lms-btn">My Exams</Link>
                  <Link href="/help" className="lms-btn">Help Center</Link>
                  <Link href="/forgot-password" className="lms-btn">Reset Password</Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </LMSLayout>
  );
}
