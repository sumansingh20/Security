'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

interface LMSLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export default function LMSLayout({ children, pageTitle, breadcrumbs }: LMSLayoutProps) {
  const pathname = usePathname();
  const { user, logout, isLoading, isInitialized, isAuthenticated, checkAuth } = useAuthStore();
  const [serverTime, setServerTime] = useState('');
  const [mounted, setMounted] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Set mounted after first render and check auth
  useEffect(() => {
    setMounted(true);
    
    // Only check auth if not already initialized (avoid double-check from route layouts)
    if (isInitialized && isAuthenticated) {
      setAuthChecked(true);
      return;
    }

    // Check auth with server on mount
    const verifyAuth = async () => {
      try {
        await checkAuth();
      } catch (e) {
        console.error('Auth check failed:', e);
      } finally {
        setAuthChecked(true);
      }
    };
    verifyAuth();
  }, []);

  // Update server time display
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setServerTime(now.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // NO useEffect for redirect - removed to prevent loops

  const handleLogout = async () => {
    await logout();
    // Use window.location for full navigation
    window.location.href = '/login';
  };

  // Navigation items based on role - Secure Exam Portal only
  const getNavItems = () => {
    if (user?.role === 'admin') {
      return [
        { section: 'Administration', items: [
          { label: 'Dashboard', href: '/admin/dashboard', icon: '▣' },
          { label: 'User Management', href: '/admin/users', icon: '◎' },
          { label: 'System Settings', href: '/admin/settings', icon: '⚙' },
        ]},
        { section: 'Examination', items: [
          { label: 'All Examinations', href: '/admin/exams', icon: '◰' },
          { label: 'Question Bank', href: '/admin/questions', icon: '◱' },
          { label: 'Results', href: '/admin/results', icon: '◲' },
        ]},
        { section: 'Proctoring', items: [
          { label: 'Live Monitor', href: '/admin/monitor', icon: '◵' },
          { label: 'Session Inspector', href: '/admin/sessions', icon: '◳' },
          { label: 'Audit Logs', href: '/admin/logs', icon: '◴' },
          { label: 'Reports', href: '/admin/reports', icon: '◶' },
        ]},
      ];
    }
    
    if (user?.role === 'teacher') {
      return [
        { section: 'Teacher Panel', items: [
          { label: 'Dashboard', href: '/teacher', icon: '▣' },
          { label: 'Question Bank', href: '/teacher/questions', icon: '◱' },
        ]},
        { section: 'Examination', items: [
          { label: 'My Exams', href: '/teacher/exams', icon: '◰' },
          { label: 'Create Exam', href: '/teacher/exams/create', icon: '◱' },
          { label: 'Live Monitor', href: '/teacher/monitor', icon: '◵' },
          { label: 'Reports', href: '/teacher/reports', icon: '◴' },
        ]},
      ];
    }

    // Student - exam portal only
    return [
      { section: 'Exam Portal', items: [
        { label: 'Dashboard', href: '/my', icon: '▣' },
        { label: 'My Examinations', href: '/my/exams', icon: '◰' },
        { label: 'Results', href: '/my/results', icon: '◲' },
      ]},
      { section: 'Account', items: [
        { label: 'Profile', href: '/profile', icon: '◎' },
      ]},
    ];
  };

  const navSections = getNavItems();

  // Show loading while checking auth
  if (!mounted || !authChecked) {
    return (
      <div className="lms-loading-page">
        <div>Loading...</div>
      </div>
    );
  }

  // Session expired or not authenticated - show message, NO auto-redirect
  if (!isAuthenticated || !user) {
    return (
      <div className="lms-loading-page" style={{ flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>
          Session Expired
        </div>
        <div style={{ color: '#6b7280' }}>
          Your session has expired or you are not logged in.
        </div>
        <a 
          href="/login" 
          style={{ 
            display: 'inline-block',
            padding: '12px 24px', 
            backgroundColor: '#1e40af', 
            color: 'white', 
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: '500',
            marginTop: '8px'
          }}
        >
          Login Again
        </a>
      </div>
    );
  }

  return (
    <div className="lms-app">
      {/* Top Header */}
      <header className="lms-header">
        <div className="lms-header-left">
          <Link href={user?.role === 'admin' ? '/admin/dashboard' : '/my'} className="lms-logo">
            <span className="lms-logo-icon">PE</span>
            <div>
              <div className="lms-logo-text">ProctoredExam</div>
              <div className="lms-logo-subtitle">Secure Exam Portal</div>
            </div>
          </Link>
        </div>
        <div className="lms-header-right">
          <div className="lms-header-time">{serverTime}</div>
          <div className="lms-user-info">
            <span>{user?.firstName} {user?.lastName}</span>
            <span className="lms-user-role">{user?.role}</span>
          </div>
          <button onClick={handleLogout} className="lms-logout-btn">
            Logout
          </button>
        </div>
      </header>

      <div className="lms-body">
        {/* Left Sidebar */}
        <aside className="lms-sidebar">
          {navSections.map((section, idx) => (
            <div key={idx} className="lms-sidebar-section">
              <div className="lms-sidebar-title">{section.section}</div>
              <ul className="lms-nav">
                {section.items.map((item) => (
                  <li key={item.href} className="lms-nav-item">
                    <Link
                      href={item.href}
                      className={`lms-nav-link ${pathname === item.href ? 'active' : ''}`}
                    >
                      <span className="lms-nav-icon">{item.icon}</span>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>

        {/* Main Content */}
        <main className="lms-main">
          {(pageTitle || breadcrumbs) && (
            <div className="lms-page-header">
              {pageTitle && <h1 className="lms-page-title">{pageTitle}</h1>}
              {breadcrumbs && (
                <div className="lms-breadcrumb">
                  <Link href="/">Home</Link>
                  {breadcrumbs.map((crumb, idx) => (
                    <span key={idx}>
                      <span>/</span>
                      {crumb.href ? (
                        <Link href={crumb.href}>{crumb.label}</Link>
                      ) : (
                        <span>{crumb.label}</span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Footer */}
      <footer className="lms-footer">
        <div>&copy; 2026 ProctoredExam - Secure Exam Portal</div>
        <div>
          <Link href="/profile">Profile</Link>
        </div>
      </footer>
    </div>
  );
}
