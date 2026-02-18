'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import LMSLayout from '@/components/layouts/LMSLayout';

export default function ProfilePage() {
  const router = useRouter();
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

  const getRoleBadge = () => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-700 border-red-200',
      teacher: 'bg-blue-100 text-blue-700 border-blue-200',
      student: 'bg-green-100 text-green-700 border-green-200',
    };
    return colors[user?.role || ''] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getRoleIcon = () => {
    switch (user?.role) {
      case 'admin': return '🛡️';
      case 'teacher': return '📚';
      case 'student': return '🎓';
      default: return '👤';
    }
  };

  const dashboardLink = user?.role === 'admin' ? '/admin/dashboard' : user?.role === 'teacher' ? '/teacher' : '/my';

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: '👤' },
    { id: 'security' as const, label: 'Security', icon: '🔒' },
    { id: 'activity' as const, label: 'Activity', icon: '📊' },
  ];

  return (
    <LMSLayout pageTitle="My Profile" breadcrumbs={[{ label: 'Dashboard', href: dashboardLink }, { label: 'Profile' }]}>
      <div className="max-w-4xl mx-auto">
        {/* Profile Hero Card */}
        <div className="animate-fade-in-up bg-gradient-to-r from-[#1d4f91] via-[#2563aa] to-[#1d4f91] rounded-xl p-8 mb-8 text-white relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
          <div className="absolute top-1/2 right-1/4 w-20 h-20 bg-white/5 rounded-full" />

          <div className="relative flex items-center gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/30 flex items-center justify-center text-3xl font-bold shadow-lg"
                 style={{ animation: 'scaleIn 0.5s ease forwards' }}>
              {getInitials()}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-1" style={{ animation: 'fadeInUp 0.4s ease 0.1s both' }}>
                {user?.firstName} {user?.lastName}
              </h1>
              <p className="text-blue-100 text-sm mb-3" style={{ animation: 'fadeInUp 0.4s ease 0.2s both' }}>
                {user?.email}
              </p>
              <div className="flex items-center gap-3" style={{ animation: 'fadeInUp 0.4s ease 0.3s both' }}>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getRoleBadge()}`}>
                  {getRoleIcon()} {user?.role?.toUpperCase()}
                </span>
                {(user as any)?.studentId && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-white/15 border border-white/20">
                    🆔 {(user as any).studentId}
                  </span>
                )}
              </div>
            </div>
            <div className="hidden md:flex flex-col items-end gap-2" style={{ animation: 'fadeInUp 0.4s ease 0.4s both' }}>
              <Link href={dashboardLink} className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 hover:bg-white/25 rounded-lg text-sm font-medium transition-all duration-200 border border-white/20 text-white no-underline hover:no-underline">
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="animate-fade-in-up flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl" style={{ animationDelay: '0.2s' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-white text-[#1d4f91] shadow-md'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in" key={activeTab}>
          {activeTab === 'profile' && (
            <div className="space-y-6 stagger-children">
              {/* Account Information */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in-up">
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-lg">👤</div>
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">Personal Information</h2>
                      <p className="text-xs text-gray-500">Manage your personal details</p>
                    </div>
                  </div>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="lms-btn lms-btn-primary text-sm"
                    >
                      ✏️ Edit Profile
                    </button>
                  )}
                </div>
                <div className="p-6">
                  {isEditing ? (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                          <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            className="lms-input"
                            placeholder="Enter first name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                          <input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            className="lms-input"
                            placeholder="Enter last name"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                        <div className="relative">
                          <input
                            type="email"
                            value={formData.email}
                            disabled
                            className="lms-input bg-gray-50 text-gray-500 pr-24"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Read-only</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Email address cannot be modified for security purposes</p>
                      </div>
                      <div className="flex items-center gap-3 pt-2">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="lms-btn lms-btn-success"
                        >
                          {isSubmitting ? (
                            <span className="flex items-center gap-2">
                              <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                              Saving...
                            </span>
                          ) : '✅ Save Changes'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditing(false);
                            if (user) setFormData({ firstName: user.firstName || '', lastName: user.lastName || '', email: user.email || '', studentId: (user as any).studentId || '' });
                          }}
                          className="lms-btn lms-btn-outline"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[
                        { label: 'First Name', value: user?.firstName, icon: '👤' },
                        { label: 'Last Name', value: user?.lastName, icon: '👤' },
                        { label: 'Email Address', value: user?.email, icon: '📧' },
                        { label: 'Role', value: user?.role, icon: getRoleIcon(), capitalize: true },
                        ...((user as any)?.studentId ? [{ label: 'Student ID', value: (user as any).studentId, icon: '🆔' }] : []),
                        ...((user as any)?.employeeId ? [{ label: 'Employee ID', value: (user as any).employeeId, icon: '🆔' }] : []),
                      ].map((field, i) => (
                        <div
                          key={field.label}
                          className="group p-4 rounded-lg bg-gray-50 hover:bg-blue-50/50 border border-gray-100 hover:border-blue-100 transition-all duration-300"
                          style={{ animation: `fadeInUp 0.3s ease ${0.05 * i}s both` }}
                        >
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <span>{field.icon}</span>{field.label}
                          </p>
                          <p className={`text-sm font-medium text-gray-900 ${field.capitalize ? 'capitalize' : ''}`}>
                            {field.value || '—'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in-up">
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-lg">📈</div>
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">Account Overview</h2>
                      <p className="text-xs text-gray-500">Your account summary at a glance</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Account Type', value: user?.role?.toUpperCase() || 'N/A', color: 'bg-blue-50 text-blue-700', icon: '🏷️' },
                    { label: 'Status', value: 'Active', color: 'bg-green-50 text-green-700', icon: '✅' },
                    { label: 'Last Login', value: 'Today', color: 'bg-purple-50 text-purple-700', icon: '🕐' },
                    { label: 'Member Since', value: new Date().getFullYear().toString(), color: 'bg-orange-50 text-orange-700', icon: '📅' },
                  ].map((stat, i) => (
                    <div
                      key={stat.label}
                      className={`${stat.color} rounded-xl p-4 text-center transition-all duration-300 hover:scale-105 hover:shadow-md cursor-default`}
                      style={{ animation: `scaleIn 0.3s ease ${0.1 * i}s both` }}
                    >
                      <div className="text-2xl mb-2">{stat.icon}</div>
                      <p className="text-lg font-bold">{stat.value}</p>
                      <p className="text-xs opacity-70 font-medium">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6 stagger-children">
              {/* Change Password */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in-up">
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center text-lg">🔑</div>
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">Change Password</h2>
                      <p className="text-xs text-gray-500">Update your password to keep your account secure</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <form onSubmit={handlePasswordSubmit} className="max-w-md space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
                      <input
                        type="password"
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        className="lms-input"
                        placeholder="Enter current password"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                      <input
                        type="password"
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        className="lms-input"
                        placeholder="Enter new password (min 6 characters)"
                        required
                        minLength={6}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        className="lms-input"
                        placeholder="Confirm new password"
                        required
                      />
                      {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                        <p className="text-xs text-red-500 mt-1 animate-fade-in">Passwords do not match</p>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isChangingPassword}
                      className="lms-btn lms-btn-warning"
                    >
                      {isChangingPassword ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                          Changing...
                        </span>
                      ) : '🔒 Update Password'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Security Tips */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in-up">
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-lg">🛡️</div>
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">Security Tips</h2>
                      <p className="text-xs text-gray-500">Best practices to keep your account safe</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {[
                      { tip: 'Use a strong, unique password with at least 8 characters', icon: '🔐' },
                      { tip: 'Never share your login credentials with anyone', icon: '🚫' },
                      { tip: 'Log out when using shared or public computers', icon: '🖥️' },
                      { tip: 'Report any suspicious activity to your administrator', icon: '⚠️' },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-green-50 transition-all duration-300"
                        style={{ animation: `fadeInUp 0.3s ease ${0.1 * i}s both` }}
                      >
                        <span className="text-lg mt-0.5">{item.icon}</span>
                        <p className="text-sm text-gray-700">{item.tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-6 stagger-children">
              {/* Session Info */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in-up">
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-lg">🕐</div>
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">Current Session</h2>
                      <p className="text-xs text-gray-500">Details about your active session</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { label: 'Browser', value: typeof navigator !== 'undefined' ? (navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : navigator.userAgent.includes('Safari') ? 'Safari' : 'Other') : 'Unknown', icon: '🌐' },
                      { label: 'Login Time', value: new Date().toLocaleTimeString(), icon: '⏰' },
                      { label: 'Session Status', value: 'Active', icon: '🟢' },
                    ].map((info, i) => (
                      <div
                        key={info.label}
                        className="p-4 rounded-lg bg-gray-50 border border-gray-100 hover:shadow-md transition-all duration-300"
                        style={{ animation: `fadeInUp 0.3s ease ${0.1 * i}s both` }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{info.icon}</span>
                          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">{info.label}</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{info.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in-up">
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-cyan-50 rounded-lg flex items-center justify-center text-lg">🔗</div>
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">Quick Links</h2>
                      <p className="text-xs text-gray-500">Navigate to common areas</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { label: 'Dashboard', href: dashboardLink, icon: '📊', desc: 'View your main dashboard' },
                    { label: 'My Exams', href: user?.role === 'student' ? '/my/exams' : user?.role === 'teacher' ? '/teacher/exams' : '/admin/exams', icon: '📝', desc: 'Manage or take exams' },
                    { label: 'Help Center', href: '/help', icon: '❓', desc: 'Get help and support' },
                    { label: 'Reset Password', href: '/forgot-password', icon: '🔑', desc: 'Change your password via email' },
                  ].map((link, i) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="group flex items-center gap-4 p-4 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all duration-300 no-underline hover:no-underline"
                      style={{ animation: `fadeInUp 0.3s ease ${0.1 * i}s both` }}
                    >
                      <div className="w-10 h-10 bg-gray-100 group-hover:bg-blue-100 rounded-lg flex items-center justify-center text-lg transition-all duration-300 group-hover:scale-110">
                        {link.icon}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-[#1d4f91]">{link.label}</p>
                        <p className="text-xs text-gray-500">{link.desc}</p>
                      </div>
                      <span className="ml-auto text-gray-300 group-hover:text-[#1d4f91] transition-all duration-200 group-hover:translate-x-1">→</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </LMSLayout>
  );
}
