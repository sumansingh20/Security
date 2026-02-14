'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const router = useRouter();
  const { user, checkAuth } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    studentId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        studentId: user.studentId || '',
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await api.put('/auth/profile', {
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
      toast.success('Profile updated');
      setIsEditing(false);
      checkAuth();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const dashboardLink = user?.role === 'admin' ? '/admin/dashboard' : '/my';

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top Bar */}
      <div className="bg-[#1d4f91] text-white text-xs">
        <div className="max-w-5xl mx-auto px-4 py-1 flex justify-between">
          <span>ProctoredExam - Secure Exam Portal</span>
          <span>
            You are logged in as <strong>{user?.firstName} {user?.lastName}</strong> ({user?.email})
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-gray-300">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1d4f91] rounded flex items-center justify-center text-white font-bold text-sm">
              PE
            </div>
            <span className="text-lg font-semibold text-gray-900">ProctoredExam</span>
          </Link>
          <nav className="text-sm">
            <Link href={dashboardLink} className="text-[#0066cc] hover:underline">Dashboard</Link>
          </nav>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-2 text-sm text-gray-600">
          <Link href="/" className="text-[#0066cc] hover:underline">Home</Link>
          <span className="mx-1">/</span>
          <Link href={dashboardLink} className="text-[#0066cc] hover:underline">Dashboard</Link>
          <span className="mx-1">/</span>
          <span>Profile</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <h1 className="text-xl font-normal text-gray-900 mb-6 pb-2 border-b border-gray-300">
            User Profile
          </h1>

          <div className="bg-white border border-gray-300">
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
              <h2 className="text-base font-medium">Account Information</h2>
            </div>
            <div className="p-4">
              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First name
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-[#1d4f91]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last name
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-[#1d4f91]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 text-sm bg-gray-50 text-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-1.5 bg-[#1d4f91] text-white text-sm hover:bg-[#163d70] disabled:opacity-50"
                    >
                      {isSubmitting ? 'Saving...' : 'Save changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-1.5 border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr>
                        <td className="py-2 text-gray-500 w-32">Name:</td>
                        <td className="py-2">{user?.firstName} {user?.lastName}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-gray-500">Email:</td>
                        <td className="py-2">{user?.email}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-gray-500">Role:</td>
                        <td className="py-2 capitalize">{user?.role}</td>
                      </tr>
                      {user?.studentId && (
                        <tr>
                          <td className="py-2 text-gray-500">Student ID:</td>
                          <td className="py-2">{user?.studentId}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-1.5 bg-[#1d4f91] text-white text-sm hover:bg-[#163d70]"
                  >
                    Edit profile
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-gray-300 mt-6">
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
              <h2 className="text-base font-medium">Change Password</h2>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4">
                To change your password, please use the password reset feature.
              </p>
              <Link
                href="/forgot-password"
                className="text-[#0066cc] hover:underline text-sm"
              >
                Reset password
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-300 py-3">
        <div className="max-w-5xl mx-auto px-4 text-center text-xs text-gray-500">
          ProctoredExam &copy; 2026. Secure Exam Portal.
        </div>
      </footer>
    </div>
  );
}
