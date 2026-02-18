'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LMSLayout from '@/components/layouts/LMSLayout';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

interface SystemSettings {
  // General
  siteName: string;
  siteDescription: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  
  // Security
  sessionTimeout: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  enforceIPBinding: boolean;
  enforceBrowserBinding: boolean;
  
  // Exam
  defaultBatchSize: number;
  defaultExamDuration: number;
  defaultMaxViolations: number;
  autoSubmitOnViolation: boolean;
  emergencyFreeze: boolean;
  
  // DOB Login
  dobLoginEnabled: boolean;
  dobFormat: string;
  allowExamWindowOnly: boolean;
}

export default function SystemSettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [settings, setSettings] = useState<SystemSettings>({
    siteName: 'ProctoredExam',
    siteDescription: 'Secure Proctored Examination System',
    maintenanceMode: false,
    maintenanceMessage: 'System is under maintenance. Please try again later.',
    sessionTimeout: 3600,
    maxLoginAttempts: 5,
    lockoutDuration: 7200,
    enforceIPBinding: true,
    enforceBrowserBinding: true,
    defaultBatchSize: 500,
    defaultExamDuration: 180,
    defaultMaxViolations: 3,
    autoSubmitOnViolation: true,
    emergencyFreeze: false,
    dobLoginEnabled: true,
    dobFormat: 'DDMMYYYY',
    allowExamWindowOnly: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'admin') {
      router.push('/my');
      return;
    }
    fetchSettings();
  }, [isAuthenticated, user, router]);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/admin/settings');
      if (response.data.data?.settings) {
        setSettings({ ...settings, ...response.data.data.settings });
      }
    } catch (err) {
      console.warn('Using default settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      await api.put('/admin/settings', settings);
      setMessage({ type: 'success', text: 'Settings saved successfully.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof SystemSettings, value: any) => {
    setSettings({ ...settings, [field]: value });
    setMessage({ type: '', text: '' });
  };

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'security', label: 'Security' },
    { id: 'exam', label: 'Examination' },
    { id: 'authentication', label: 'Authentication' }
  ];

  if (loading) {
    return (
      <LMSLayout pageTitle="System Settings">
        <div className="loading-container">
          <p>Loading settings...</p>
        </div>
      </LMSLayout>
    );
  }

  return (
    <LMSLayout
      pageTitle="System Settings"
      breadcrumbs={[
        { label: 'Admin', href: '/admin/dashboard' },
        { label: 'Configuration' },
        { label: 'System Settings' }
      ]}
    >
      {/* Warning Banner */}
      <div className="alert alert-warning mb-4">
        <strong>⚠ Caution:</strong> Changes to system settings affect all users. 
        Ensure proper testing before modifying production settings.
      </div>

      {/* Message */}
      {message.text && (
        <div className={`alert alert-${message.type} mb-4`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="form-tabs mb-5">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`form-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <section className="section">
          <h2 className="section-title">General Settings</h2>
          <table className="form-table">
            <tbody>
              <tr>
                <td className="form-label">Site Name</td>
                <td>
                  <input
                    type="text"
                    className="form-input w-96"
                    value={settings.siteName}
                    onChange={(e) => handleChange('siteName', e.target.value)}
                    placeholder="Enter site name"
                    title="Site Name"
                  />
                  <div className="form-help">Displayed in header and browser title</div>
                </td>
              </tr>
              <tr>
                <td className="form-label">Site Description</td>
                <td>
                  <input
                    type="text"
                    className="form-input w-96"
                    value={settings.siteDescription}
                    onChange={(e) => handleChange('siteDescription', e.target.value)}
                    placeholder="Enter site description"
                    title="Site Description"
                  />
                  <div className="form-help">Short description for login page</div>
                </td>
              </tr>
              <tr>
                <td className="form-label">Maintenance Mode</td>
                <td>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.maintenanceMode}
                      onChange={(e) => handleChange('maintenanceMode', e.target.checked)}
                    />
                    Enable maintenance mode (blocks all student access)
                  </label>
                </td>
              </tr>
              <tr>
                <td className="form-label">Maintenance Message</td>
                <td>
                  <textarea
                    className="form-input w-96"
                    value={settings.maintenanceMessage}
                    onChange={(e) => handleChange('maintenanceMessage', e.target.value)}
                    rows={3}
                    placeholder="Enter maintenance message"
                    title="Maintenance Message"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <section className="section">
          <h2 className="section-title">Security Settings</h2>
          <table className="form-table">
            <tbody>
              <tr>
                <td className="form-label">Session Timeout</td>
                <td>
                  <input
                    type="number"
                    className="form-input w-28"
                    value={settings.sessionTimeout}
                    onChange={(e) => handleChange('sessionTimeout', parseInt(e.target.value))}
                    min={300}
                    max={86400}
                    placeholder="Session Timeout"
                    title="Session Timeout"
                  />
                    <span className="ml-2">seconds</span>
                  <div className="form-help">Auto logout after inactivity (300-86400 seconds)</div>
                </td>
              </tr>
              <tr>
                <td className="form-label">Max Login Attempts</td>
                <td>
                  <input
                    type="number"
                    className="form-input w-20"
                    value={settings.maxLoginAttempts}
                    onChange={(e) => handleChange('maxLoginAttempts', parseInt(e.target.value))}
                    min={3}
                    max={10}
                    placeholder="Max Attempts"
                    title="Max Login Attempts"
                  />
                    <div className="form-help">Account locked after this many failed attempts</div>
                </td>
              </tr>
              <tr>
                <td className="form-label">Lockout Duration</td>
                <td>
                  <input
                    type="number"
                    className="form-input w-28"
                    value={settings.lockoutDuration}
                    onChange={(e) => handleChange('lockoutDuration', parseInt(e.target.value))}
                    min={300}
                    max={86400}
                    placeholder="Lockout Duration"
                    title="Lockout Duration"
                  />
                    <span className="ml-2">seconds</span>
                  <div className="form-help">Duration of account lockout</div>
                </td>
              </tr>
              <tr>
                <td className="form-label">IP Binding</td>
                <td>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.enforceIPBinding}
                      onChange={(e) => handleChange('enforceIPBinding', e.target.checked)}
                    />
                    Bind exam sessions to IP address
                  </label>
                  <div className="form-help">Session terminated if IP changes during exam</div>
                </td>
              </tr>
              <tr>
                <td className="form-label">Browser Binding</td>
                <td>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.enforceBrowserBinding}
                      onChange={(e) => handleChange('enforceBrowserBinding', e.target.checked)}
                    />
                    Bind exam sessions to browser fingerprint
                  </label>
                  <div className="form-help">Prevents session hijacking</div>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      )}

      {/* Examination Settings */}
      {activeTab === 'exam' && (
        <section className="section">
          <h2 className="section-title">Examination Settings</h2>
          <table className="form-table">
            <tbody>
              <tr>
                <td className="form-label">Default Batch Size</td>
                <td>
                  <input
                    type="number"
                    className="form-input w-24"
                    value={settings.defaultBatchSize}
                    onChange={(e) => handleChange('defaultBatchSize', parseInt(e.target.value))}
                    min={10}
                    max={1000}
                    placeholder="Batch Size"
                    title="Default Batch Size"
                  />
                  <span className="ml-2">students</span>
                  <div className="form-help">Maximum students per batch (10-1000)</div>
                </td>
              </tr>
              <tr>
                <td className="form-label">Default Exam Duration</td>
                <td>
                  <input
                    type="number"
                    className="form-input w-24"
                    value={settings.defaultExamDuration}
                    onChange={(e) => handleChange('defaultExamDuration', parseInt(e.target.value))}
                    min={10}
                    max={480}
                    placeholder="Exam Duration"
                    title="Default Exam Duration"
                  />
                  <span className="ml-2">minutes</span>
                  <div className="form-help">Default duration for new exams</div>
                </td>
              </tr>
              <tr>
                <td className="form-label">Default Max Violations</td>
                <td>
                  <input
                    type="number"
                    className="form-input w-20"
                    value={settings.defaultMaxViolations}
                    onChange={(e) => handleChange('defaultMaxViolations', parseInt(e.target.value))}
                    min={1}
                    max={10}
                    placeholder="Max Violations"
                    title="Default Max Violations"
                  />
                  <div className="form-help">Violations allowed before auto-termination</div>
                </td>
              </tr>
              <tr>
                <td className="form-label">Auto Submit on Violation</td>
                <td>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.autoSubmitOnViolation}
                      onChange={(e) => handleChange('autoSubmitOnViolation', e.target.checked)}
                    />
                    Automatically submit exam when max violations reached
                  </label>
                </td>
              </tr>
              <tr>
                <td className="form-label">
                  <span style={{ color: 'var(--error)', fontWeight: 'bold' }}>Emergency Freeze</span>
                </td>
                <td>
                  <label className="checkbox-label" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={settings.emergencyFreeze}
                      onChange={(e) => handleChange('emergencyFreeze', e.target.checked)}
                      style={{ marginTop: '3px' }}
                    />
                    <span>
                      <strong style={{ color: 'var(--error)' }}>ACTIVATE EMERGENCY FREEZE</strong>
                      <br />
                      <small style={{ color: 'var(--text-muted)' }}>
                        Freezes ALL exam operations. No exams can be started, published, or modified.
                        Active sessions continue but no new actions allowed.
                      </small>
                    </span>
                  </label>
                  {settings.emergencyFreeze && (
                    <div className="alert alert-warning mt-2" style={{ padding: '8px 12px', fontSize: '12px' }}>
                      ⚠ Emergency freeze is ACTIVE. All exam operations are blocked.
                    </div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      )}

      {/* Authentication Settings */}
      {activeTab === 'authentication' && (
        <section className="section">
          <h2 className="section-title">Student Authentication Settings</h2>
          <div className="alert alert-info mb-4">
            <strong>DOB-Based Login:</strong> Students authenticate using their Date of Birth 
            instead of a password. This is standard for government examinations.
          </div>
          <table className="form-table">
            <tbody>
              <tr>
                <td className="form-label">DOB Login</td>
                <td>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.dobLoginEnabled}
                      onChange={(e) => handleChange('dobLoginEnabled', e.target.checked)}
                    />
                    Enable DOB-based authentication for students
                  </label>
                </td>
              </tr>
              <tr>
                <td className="form-label">DOB Format</td>
                <td>
                  <select
                    className="form-input w-52"
                    value={settings.dobFormat}
                    onChange={(e) => handleChange('dobFormat', e.target.value)}
                    title="DOB Format"
                  >
                    <option value="DDMMYYYY">DDMMYYYY (e.g., 15081990)</option>
                    <option value="DD-MM-YYYY">DD-MM-YYYY (e.g., 15-08-1990)</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY (e.g., 15/08/1990)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (e.g., 1990-08-15)</option>
                  </select>
                  <div className="form-help">Format students must use when logging in</div>
                </td>
              </tr>
              <tr>
                <td className="form-label">Exam Window Only</td>
                <td>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.allowExamWindowOnly}
                      onChange={(e) => handleChange('allowExamWindowOnly', e.target.checked)}
                    />
                    Allow student login only during assigned exam window
                  </label>
                  <div className="form-help">Students cannot login before or after their scheduled exam</div>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      )}

      {/* Save Button */}
      <div className="mt-6 pt-4 border-t border-gray-300">
        <button
          className="lms-btn lms-btn-primary"
          onClick={saveSettings}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </LMSLayout>
  );
}
