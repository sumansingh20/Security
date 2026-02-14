'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LMSLayout from '@/components/layouts/LMSLayout';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

const DEPARTMENTS = [
  { value: '', label: 'Select Department' },
  { value: 'cse', label: 'Computer Science & Engineering' },
  { value: 'ece', label: 'Electronics & Communication' },
  { value: 'ee', label: 'Electrical Engineering' },
  { value: 'me', label: 'Mechanical Engineering' },
  { value: 'ce', label: 'Civil Engineering' },
  { value: 'math', label: 'Mathematics' },
  { value: 'physics', label: 'Physics' },
  { value: 'chemistry', label: 'Chemistry' },
  { value: 'other', label: 'Other' },
];

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  department: string;
  studentId: string;
  rollNumber: string;
  dateOfBirth: string;
  employeeId: string;
  batch: string;
  section: string;
  semester: string;
  phone: string;
  isActive: boolean;
}

const initialFormData: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'student',
  department: '',
  studentId: '',
  rollNumber: '',
  dateOfBirth: '',
  employeeId: '',
  batch: '',
  section: '',
  semester: '1',
  phone: '',
  isActive: true,
};

export default function CreateUserPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [createdUser, setCreatedUser] = useState<any>(null);
  const [step, setStep] = useState(1);

  // Bulk import state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (user?.role !== 'admin') { router.push('/my'); return; }
  }, [isAuthenticated, user, router]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
    setError('');
    setFieldErrors(prev => ({ ...prev, [name]: '' }));
  }, []);

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email format';

    if (formData.role === 'student') {
      if (!formData.studentId.trim()) errors.studentId = 'Student ID is required';
      if (!formData.dateOfBirth) errors.dateOfBirth = 'Date of birth is required (used as password)';
    }

    if ((formData.role === 'teacher' || formData.role === 'admin') && !formData.employeeId.trim()) {
      errors.employeeId = 'Employee ID is required for staff';
    }

    if (formData.phone && !/^[0-9]{10}$/.test(formData.phone)) {
      errors.phone = 'Phone must be 10 digits';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      let password = '';
      if (formData.role === 'student' && formData.dateOfBirth) {
        const dob = new Date(formData.dateOfBirth);
        const day = String(dob.getDate()).padStart(2, '0');
        const month = String(dob.getMonth() + 1).padStart(2, '0');
        const year = dob.getFullYear();
        password = `${day}${month}${year}`;
      } else {
        password = 'TempPass@123';
      }

      const payload: any = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
        password,
        isActive: formData.isActive,
      };

      if (formData.department) payload.department = formData.department;
      if (formData.phone) payload.phone = formData.phone;

      if (formData.role === 'student') {
        payload.studentId = formData.studentId.trim();
        payload.dateOfBirth = formData.dateOfBirth;
        if (formData.rollNumber) payload.rollNumber = formData.rollNumber.trim();
        if (formData.batch) payload.batch = formData.batch.trim();
        if (formData.section) payload.section = formData.section.trim();
        if (formData.semester) payload.semester = parseInt(formData.semester);
      } else {
        payload.employeeId = formData.employeeId.trim();
      }

      const response = await api.post('/admin/users', payload);
      setCreatedUser(response.data?.data?.user || response.data?.user);
      setSuccess(true);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to create user';
      const serverErrors = err.response?.data?.errors;
      if (serverErrors && Array.isArray(serverErrors)) {
        const mapped: Record<string, string> = {};
        serverErrors.forEach((e: any) => { if (e.field) mapped[e.field] = e.message; });
        setFieldErrors(mapped);
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      processCSVFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processCSVFile(file);
  };

  const processCSVFile = (file: File) => {
    setCsvFile(file);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { setCsvPreview([]); return; }
      const headers = lines[0].split(',').map(h => h.trim());
      const data = lines.slice(1, 6).map(line => {
        const values = line.split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((h, i) => { row[h] = values[i] || ''; });
        return row;
      });
      setCsvPreview(data);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvFile) return;
    setImportLoading(true);
    setImportResult(null);

    try {
      const text = await csvFile.text();
      const lines = text.split('\n').filter(l => l.trim());
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
        setImportResult({ success: false, message: 'No valid users found. Required columns: firstName, lastName, email' });
        return;
      }

      const response = await api.post('/admin/users/bulk', { users });
      setImportResult({
        success: true,
        created: response.data.data?.created || 0,
        failed: response.data.data?.failed || 0,
        errors: response.data.data?.errors || [],
        total: users.length,
      });
    } catch (err: any) {
      setImportResult({ success: false, message: err.response?.data?.message || 'Import failed' });
    } finally {
      setImportLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setSuccess(false);
    setCreatedUser(null);
    setError('');
    setFieldErrors({});
    setStep(1);
  };

  const downloadTemplate = () => {
    const csv = 'firstName,lastName,email,studentId,dateOfBirth,role,department,batch,phone\nJohn,Doe,john@example.com,STU001,2000-01-15,student,cse,2024-2028,9876543210\nJane,Smith,jane@example.com,,,teacher,ece,,\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
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

  // Success screen
  if (success && createdUser) {
    return (
      <LMSLayout pageTitle="User Created" breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Users', href: '/admin/users' }, { label: 'Created' }]}>
        <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '40px 20px' }}>
          <div className="animate-scale-in" style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #059669, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '36px', color: '#fff' }}>
            ✓
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a2e', marginBottom: '8px' }}>User Created Successfully!</h2>
          <p style={{ color: '#666', marginBottom: '32px' }}>
            {createdUser.firstName} {createdUser.lastName} has been added as a {createdUser.role}.
          </p>

          <div className="animate-fade-in-up lms-section" style={{ textAlign: 'left', marginBottom: '24px' }}>
            <div className="lms-section-title">Account Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#999', letterSpacing: '0.5px' }}>Name</div>
                <div style={{ fontWeight: 600, marginTop: '4px' }}>{createdUser.firstName} {createdUser.lastName}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#999', letterSpacing: '0.5px' }}>Email</div>
                <div style={{ fontWeight: 600, marginTop: '4px' }}>{createdUser.email}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#999', letterSpacing: '0.5px' }}>Role</div>
                <div style={{ fontWeight: 600, marginTop: '4px', color: getRoleColor(createdUser.role) }}>{getRoleIcon(createdUser.role)} {createdUser.role.charAt(0).toUpperCase() + createdUser.role.slice(1)}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#999', letterSpacing: '0.5px' }}>Password</div>
                <div style={{ fontWeight: 600, marginTop: '4px', fontFamily: 'monospace', background: '#f5f5f5', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
                  {createdUser.role === 'student' ? 'DOB (DDMMYYYY)' : 'TempPass@123'}
                </div>
              </div>
              {createdUser.studentId && (
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#999', letterSpacing: '0.5px' }}>Student ID</div>
                  <div style={{ fontWeight: 600, marginTop: '4px', fontFamily: 'monospace' }}>{createdUser.studentId}</div>
                </div>
              )}
              {createdUser.employeeId && (
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#999', letterSpacing: '0.5px' }}>Employee ID</div>
                  <div style={{ fontWeight: 600, marginTop: '4px', fontFamily: 'monospace' }}>{createdUser.employeeId}</div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={resetForm} className="lms-btn lms-btn-primary" style={{ minWidth: '160px' }}>
              Create Another User
            </button>
            <button onClick={() => router.push('/admin/users')} className="lms-btn" style={{ minWidth: '160px' }}>
              Back to Users
            </button>
          </div>
        </div>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout
      pageTitle="Create User"
      breadcrumbs={[
        { label: 'Admin', href: '/admin/dashboard' },
        { label: 'Users', href: '/admin/users' },
        { label: 'Create User' },
      ]}
    >
      {/* Tab Switcher */}
      <div className="animate-fade-in" style={{ display: 'flex', gap: '0', marginBottom: '24px', borderRadius: '10px', overflow: 'hidden', border: '2px solid #e5e7eb', width: 'fit-content' }}>
        <button
          onClick={() => setActiveTab('single')}
          style={{
            padding: '12px 28px',
            background: activeTab === 'single' ? 'linear-gradient(135deg, #1a1a2e, #16213e)' : '#fff',
            color: activeTab === 'single' ? '#fff' : '#666',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '18px' }}>👤</span> Single User
        </button>
        <button
          onClick={() => setActiveTab('bulk')}
          style={{
            padding: '12px 28px',
            background: activeTab === 'bulk' ? 'linear-gradient(135deg, #1a1a2e, #16213e)' : '#fff',
            color: activeTab === 'bulk' ? '#fff' : '#666',
            border: 'none',
            borderLeft: '2px solid #e5e7eb',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '18px' }}>📋</span> Bulk Import
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="lms-alert lms-alert-error animate-shake" style={{ marginBottom: '20px' }}>
          <strong>Error: </strong>{error}
        </div>
      )}

      {/* ===== SINGLE USER FORM ===== */}
      {activeTab === 'single' && (
        <form onSubmit={handleSubmit}>
          {/* Step Indicators */}
          <div className="animate-fade-in" style={{ display: 'flex', gap: '8px', marginBottom: '28px', alignItems: 'center', flexWrap: 'wrap' }}>
            {[
              { num: 1, label: 'Role & Basic Info' },
              { num: 2, label: formData.role === 'student' ? 'Student Details' : 'Staff Details' },
              { num: 3, label: 'Review & Create' },
            ].map((s, i) => (
              <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setStep(s.num)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: step === s.num ? '2px solid #1a1a2e' : '2px solid #ddd',
                    background: step > s.num ? '#059669' : step === s.num ? '#1a1a2e' : '#fff',
                    color: step >= s.num ? '#fff' : '#999',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {step > s.num ? '✓' : s.num}
                </button>
                <span style={{ fontSize: '13px', fontWeight: step === s.num ? 600 : 400, color: step === s.num ? '#1a1a2e' : '#999', transition: 'all 0.3s' }}>
                  {s.label}
                </span>
                {i < 2 && <div style={{ width: '40px', height: '2px', background: step > s.num ? '#059669' : '#ddd', transition: 'all 0.3s' }} />}
              </div>
            ))}
          </div>

          {/* Step 1: Role & Basic Info */}
          {step === 1 && (
            <div className="animate-fade-in-up">
              {/* Role Selection */}
              <div className="lms-section" style={{ marginBottom: '20px' }}>
                <div className="lms-section-title">Select Role</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', padding: '16px' }}>
                  {(['student', 'teacher', 'admin'] as const).map(role => (
                    <label
                      key={role}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '20px 16px',
                        borderRadius: '12px',
                        border: formData.role === role ? `2px solid ${getRoleColor(role)}` : '2px solid #e5e7eb',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        background: formData.role === role ? `${getRoleColor(role)}08` : '#fff',
                        transform: formData.role === role ? 'scale(1.02)' : 'scale(1)',
                      }}
                    >
                      <input type="radio" name="role" value={role} checked={formData.role === role} onChange={handleChange} style={{ display: 'none' }} />
                      <span style={{ fontSize: '32px', marginBottom: '8px' }}>{getRoleIcon(role)}</span>
                      <span style={{ fontWeight: 600, fontSize: '15px', color: formData.role === role ? getRoleColor(role) : '#333', textTransform: 'capitalize' }}>{role}</span>
                      <span style={{ fontSize: '11px', color: '#999', marginTop: '4px', textAlign: 'center' }}>
                        {role === 'student' ? 'Login with Student ID + DOB' : role === 'teacher' ? 'Create & manage exams' : 'Full system access'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Basic Info */}
              <div className="lms-section">
                <div className="lms-section-title">Basic Information</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '16px' }}>
                  <div className="lms-form-group" style={{ margin: 0 }}>
                    <label className="lms-label">First Name <span style={{ color: '#dc2626' }}>*</span></label>
                    <input type="text" name="firstName" className="lms-input" value={formData.firstName} onChange={handleChange} placeholder="Enter first name" style={fieldErrors.firstName ? { borderColor: '#dc2626' } : {}} />
                    {fieldErrors.firstName && <span style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.firstName}</span>}
                  </div>
                  <div className="lms-form-group" style={{ margin: 0 }}>
                    <label className="lms-label">Last Name <span style={{ color: '#dc2626' }}>*</span></label>
                    <input type="text" name="lastName" className="lms-input" value={formData.lastName} onChange={handleChange} placeholder="Enter last name" style={fieldErrors.lastName ? { borderColor: '#dc2626' } : {}} />
                    {fieldErrors.lastName && <span style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.lastName}</span>}
                  </div>
                  <div className="lms-form-group" style={{ margin: 0 }}>
                    <label className="lms-label">Email Address <span style={{ color: '#dc2626' }}>*</span></label>
                    <input type="email" name="email" className="lms-input" value={formData.email} onChange={handleChange} placeholder="user@example.com" style={fieldErrors.email ? { borderColor: '#dc2626' } : {}} />
                    {fieldErrors.email && <span style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.email}</span>}
                  </div>
                  <div className="lms-form-group" style={{ margin: 0 }}>
                    <label className="lms-label">Department</label>
                    <select name="department" className="lms-select" value={formData.department} onChange={handleChange} title="Department">
                      {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                  <div className="lms-form-group" style={{ margin: 0 }}>
                    <label className="lms-label">Phone Number</label>
                    <input type="tel" name="phone" className="lms-input" value={formData.phone} onChange={handleChange} placeholder="10-digit number" maxLength={10} style={fieldErrors.phone ? { borderColor: '#dc2626' } : {}} />
                    {fieldErrors.phone && <span style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.phone}</span>}
                  </div>
                  <div className="lms-form-group" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '28px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                      <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} style={{ width: '18px', height: '18px', accentColor: '#059669' }} />
                      Account Active
                    </label>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', gap: '12px' }}>
                <button type="button" onClick={() => router.push('/admin/users')} className="lms-btn">Cancel</button>
                <button type="button" onClick={() => setStep(2)} className="lms-btn lms-btn-primary" style={{ minWidth: '140px' }}>
                  Next Step →
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Role-specific Details */}
          {step === 2 && (
            <div className="animate-fade-in-up">
              {formData.role === 'student' ? (
                <div className="lms-section">
                  <div className="lms-section-title">🎓 Student Details</div>
                  <div className="lms-alert lms-alert-info" style={{ margin: '12px 16px' }}>
                    Student password will be set to their Date of Birth in <strong>DDMMYYYY</strong> format. Students log in using their Student ID + DOB.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '16px' }}>
                    <div className="lms-form-group" style={{ margin: 0 }}>
                      <label className="lms-label">Student ID <span style={{ color: '#dc2626' }}>*</span></label>
                      <input type="text" name="studentId" className="lms-input" value={formData.studentId} onChange={handleChange} placeholder="e.g., 2024CS001" style={fieldErrors.studentId ? { borderColor: '#dc2626' } : {}} />
                      {fieldErrors.studentId && <span style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.studentId}</span>}
                    </div>
                    <div className="lms-form-group" style={{ margin: 0 }}>
                      <label className="lms-label">Date of Birth <span style={{ color: '#dc2626' }}>*</span></label>
                      <input type="date" name="dateOfBirth" className="lms-input" value={formData.dateOfBirth} onChange={handleChange} style={fieldErrors.dateOfBirth ? { borderColor: '#dc2626' } : {}} />
                      {fieldErrors.dateOfBirth && <span style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.dateOfBirth}</span>}
                    </div>
                    <div className="lms-form-group" style={{ margin: 0 }}>
                      <label className="lms-label">Roll Number</label>
                      <input type="text" name="rollNumber" className="lms-input" value={formData.rollNumber} onChange={handleChange} placeholder="e.g., 1" />
                    </div>
                    <div className="lms-form-group" style={{ margin: 0 }}>
                      <label className="lms-label">Batch</label>
                      <input type="text" name="batch" className="lms-input" value={formData.batch} onChange={handleChange} placeholder="e.g., 2024-2028" />
                    </div>
                    <div className="lms-form-group" style={{ margin: 0 }}>
                      <label className="lms-label">Section</label>
                      <input type="text" name="section" className="lms-input" value={formData.section} onChange={handleChange} placeholder="e.g., A" />
                    </div>
                    <div className="lms-form-group" style={{ margin: 0 }}>
                      <label className="lms-label">Semester</label>
                      <select name="semester" className="lms-select" value={formData.semester} onChange={handleChange} title="Semester">
                        {[1,2,3,4,5,6,7,8,9,10].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="lms-section">
                  <div className="lms-section-title">{getRoleIcon(formData.role)} {formData.role === 'admin' ? 'Administrator' : 'Teacher'} Details</div>
                  <div className="lms-alert lms-alert-info" style={{ margin: '12px 16px' }}>
                    Staff accounts are created with temporary password: <strong style={{ fontFamily: 'monospace' }}>TempPass@123</strong>. Users should change their password after first login.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '16px' }}>
                    <div className="lms-form-group" style={{ margin: 0 }}>
                      <label className="lms-label">Employee ID <span style={{ color: '#dc2626' }}>*</span></label>
                      <input type="text" name="employeeId" className="lms-input" value={formData.employeeId} onChange={handleChange} placeholder="e.g., EMP001" style={fieldErrors.employeeId ? { borderColor: '#dc2626' } : {}} />
                      {fieldErrors.employeeId && <span style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.employeeId}</span>}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                <button type="button" onClick={() => setStep(1)} className="lms-btn">← Previous</button>
                <button type="button" onClick={() => { if (validateForm()) setStep(3); }} className="lms-btn lms-btn-primary" style={{ minWidth: '140px' }}>
                  Next Step →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="animate-fade-in-up">
              <div className="lms-section">
                <div className="lms-section-title">Review & Confirm</div>
                <div style={{ padding: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <ReviewItem label="First Name" value={formData.firstName} />
                    <ReviewItem label="Last Name" value={formData.lastName} />
                    <ReviewItem label="Email" value={formData.email} />
                    <ReviewItem label="Role" value={<span style={{ color: getRoleColor(formData.role), fontWeight: 600 }}>{getRoleIcon(formData.role)} {formData.role.charAt(0).toUpperCase() + formData.role.slice(1)}</span>} />
                    {formData.department && <ReviewItem label="Department" value={DEPARTMENTS.find(d => d.value === formData.department)?.label || formData.department} />}
                    {formData.phone && <ReviewItem label="Phone" value={formData.phone} />}
                    {formData.role === 'student' && (
                      <>
                        <ReviewItem label="Student ID" value={formData.studentId} />
                        <ReviewItem label="Date of Birth" value={formData.dateOfBirth} />
                        {formData.rollNumber && <ReviewItem label="Roll Number" value={formData.rollNumber} />}
                        {formData.batch && <ReviewItem label="Batch" value={formData.batch} />}
                        {formData.section && <ReviewItem label="Section" value={formData.section} />}
                        <ReviewItem label="Semester" value={formData.semester} />
                      </>
                    )}
                    {(formData.role === 'teacher' || formData.role === 'admin') && (
                      <ReviewItem label="Employee ID" value={formData.employeeId} />
                    )}
                    <ReviewItem label="Password" value={formData.role === 'student' ? 'DOB in DDMMYYYY format' : 'TempPass@123'} />
                    <ReviewItem label="Account Status" value={
                      <span style={{ color: formData.isActive ? '#059669' : '#dc2626', fontWeight: 600 }}>
                        {formData.isActive ? '● Active' : '● Inactive'}
                      </span>
                    } />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                <button type="button" onClick={() => setStep(2)} className="lms-btn">← Previous</button>
                <button
                  type="submit"
                  className="lms-btn lms-btn-success"
                  disabled={loading}
                  style={{ minWidth: '180px', fontSize: '15px', padding: '12px 24px' }}
                >
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                      <span className="animate-pulse">●</span> Creating...
                    </span>
                  ) : (
                    'Create User ✓'
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      {/* ===== BULK IMPORT ===== */}
      {activeTab === 'bulk' && (
        <div className="animate-fade-in-up">
          <div className="lms-section" style={{ marginBottom: '20px' }}>
            <div className="lms-section-title">📋 CSV Bulk Import</div>
            <div style={{ padding: '16px' }}>
              <div className="lms-alert lms-alert-info" style={{ marginBottom: '20px' }}>
                <strong>Required columns:</strong> firstName, lastName, email<br />
                <strong>Optional columns:</strong> studentId, dateOfBirth (YYYY-MM-DD), role, department, batch, phone, employeeId<br />
                <strong>Default password:</strong> Student@123 (if not specified in CSV)
              </div>

              <button onClick={downloadTemplate} className="lms-btn lms-btn-sm" style={{ marginBottom: '20px' }}>
                ⬇ Download CSV Template
              </button>

              {/* Drag & Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                style={{
                  border: `2px dashed ${dragActive ? '#2563eb' : '#d1d5db'}`,
                  borderRadius: '12px',
                  padding: '40px 20px',
                  textAlign: 'center',
                  background: dragActive ? '#eff6ff' : '#fafafa',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                }}
                onClick={() => document.getElementById('csv-input')?.click()}
              >
                <input id="csv-input" type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} />
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>{dragActive ? '📂' : '📄'}</div>
                <div style={{ fontWeight: 600, color: '#333', marginBottom: '4px' }}>
                  {csvFile ? csvFile.name : 'Drop CSV file here or click to browse'}
                </div>
                <div style={{ fontSize: '12px', color: '#999' }}>
                  {csvFile ? `${(csvFile.size / 1024).toFixed(1)} KB` : 'Supports .csv files up to 500 rows'}
                </div>
              </div>
            </div>
          </div>

          {/* CSV Preview */}
          {csvPreview.length > 0 && (
            <div className="lms-section animate-fade-in-up" style={{ marginBottom: '20px' }}>
              <div className="lms-section-title">Preview (first 5 rows)</div>
              <div className="lms-table-container">
                <table className="lms-table">
                  <thead>
                    <tr>{Object.keys(csvPreview[0]).map(key => <th key={key}>{key}</th>)}</tr>
                  </thead>
                  <tbody>
                    {csvPreview.map((row, i) => (
                      <tr key={i}>{Object.values(row).map((val: any, j) => <td key={j}>{val || '-'}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handleImport} className="lms-btn lms-btn-primary" disabled={importLoading} style={{ minWidth: '160px' }}>
                  {importLoading ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                      <span className="animate-pulse">●</span> Importing...
                    </span>
                  ) : (
                    `Import ${csvPreview.length}+ Users`
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className={`lms-alert ${importResult.success ? 'lms-alert-success' : 'lms-alert-error'} animate-fade-in-up`}>
              {importResult.success ? (
                <div>
                  <strong>Import Complete!</strong>
                  <p style={{ margin: '8px 0 0' }}>
                    Created: <strong>{importResult.created}</strong> users
                    {importResult.failed > 0 && <> | Failed: <strong>{importResult.failed}</strong></>}
                  </p>
                  {importResult.errors?.length > 0 && (
                    <ul style={{ marginTop: '8px', paddingLeft: '20px', fontSize: '12px' }}>
                      {importResult.errors.slice(0, 5).map((err: any, i: number) => (
                        <li key={i} style={{ color: '#dc2626' }}>{err.email || err.error || JSON.stringify(err)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div><strong>Import Failed: </strong>{importResult.message}</div>
              )}
            </div>
          )}
        </div>
      )}
    </LMSLayout>
  );
}

function ReviewItem({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#999', letterSpacing: '0.5px', fontWeight: 500 }}>{label}</span>
      <span style={{ fontWeight: 600, fontSize: '14px', color: '#333' }}>{value || <span style={{ color: '#ccc' }}>Not provided</span>}</span>
    </div>
  );
}
