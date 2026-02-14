'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

// Icons as simple SVG components
const Icons = {
  Dashboard: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  Users: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  FileText: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10,9 9,9 8,9" />
    </svg>
  ),
  List: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  Clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12,6 12,12 16,14" />
    </svg>
  ),
  Settings: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  BarChart: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  Eye: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Award: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21,13.89 7,23 12,20 17,23 15.79,13.88" />
    </svg>
  ),
  Logout: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16,17 21,12 16,7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
};

const getNavSections = (role: string): NavSection[] => {
  if (role === 'admin') {
    return [
      {
        title: 'Main',
        items: [
          { label: 'Dashboard', href: '/admin/dashboard', icon: <Icons.Dashboard /> },
          { label: 'Users', href: '/admin/users', icon: <Icons.Users /> },
        ],
      },
      {
        title: 'Examinations',
        items: [
          { label: 'Exams', href: '/admin/exams', icon: <Icons.FileText /> },
          { label: 'Question Bank', href: '/admin/questions', icon: <Icons.List /> },
          { label: 'Results', href: '/admin/results', icon: <Icons.Award /> },
        ],
      },
      {
        title: 'Proctoring',
        items: [
          { label: 'Live Monitor', href: '/admin/monitor', icon: <Icons.Eye /> },
          { label: 'Sessions', href: '/admin/sessions', icon: <Icons.Clock /> },
          { label: 'Audit Logs', href: '/admin/reports/logins', icon: <Icons.BarChart /> },
        ],
      },
      {
        title: 'System',
        items: [
          { label: 'Settings', href: '/admin/settings', icon: <Icons.Settings /> },
          { label: 'Reports', href: '/admin/reports', icon: <Icons.BarChart /> },
        ],
      },
    ];
  }

  if (role === 'teacher') {
    return [
      {
        title: 'Main',
        items: [
          { label: 'Dashboard', href: '/teacher', icon: <Icons.Dashboard /> },
        ],
      },
      {
        title: 'Examinations',
        items: [
          { label: 'My Exams', href: '/teacher/exams', icon: <Icons.FileText /> },
          { label: 'Question Bank', href: '/teacher/questions', icon: <Icons.List /> },
          { label: 'Live Monitor', href: '/teacher/monitor', icon: <Icons.Eye /> },
        ],
      },
      {
        title: 'Reports',
        items: [
          { label: 'Results', href: '/teacher/results', icon: <Icons.Award /> },
          { label: 'Reports', href: '/teacher/reports', icon: <Icons.BarChart /> },
        ],
      },
    ];
  }

  // Student - Exam Portal Only
  return [
    {
      title: 'Exam Portal',
      items: [
        { label: 'Dashboard', href: '/my', icon: <Icons.Dashboard /> },
        { label: 'My Exams', href: '/my/exams', icon: <Icons.FileText /> },
        { label: 'Results', href: '/my/results', icon: <Icons.Award /> },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'Profile', href: '/profile', icon: <Icons.Users /> },
      ],
    },
  ];
};

export default function SidebarLayout({ children, pageTitle, breadcrumbs }: SidebarLayoutProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const navSections = getNavSections(user?.role || 'student');

  const handleLogout = async () => {
    await logout();
    // Use window.location for full navigation - no redirect loops
    window.location.href = '/login';
  };

  const isActive = (href: string) => {
    if (href === '/admin/dashboard' || href === '/teacher' || href === '/my') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="inst-layout">
      {/* Sidebar */}
      <aside className={`inst-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="inst-sidebar-header">
          <div className="inst-sidebar-logo">
            <span className="inst-sidebar-logo-icon">PE</span>
            {!collapsed && <span>ProctoredExam</span>}
          </div>
        </div>

        <nav className="inst-sidebar-nav">
          {navSections.map((section, idx) => (
            <div key={idx}>
              {!collapsed && <div className="inst-sidebar-section">{section.title}</div>}
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inst-sidebar-item ${isActive(item.href) ? 'active' : ''}`}
                >
                  {item.icon}
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="inst-sidebar-footer">
          {!collapsed && (
            <>
              <div>Version 1.0.0</div>
              <div>© 2026 ProctoredExam</div>
            </>
          )}
        </div>
      </aside>

      {/* Header */}
      <header className="inst-header">
        <div className="inst-header-left">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="inst-header-breadcrumb">
              {breadcrumbs.map((bc, idx) => (
                <span key={idx}>
                  {bc.href ? (
                    <Link href={bc.href}>{bc.label}</Link>
                  ) : (
                    <span>{bc.label}</span>
                  )}
                  {idx < breadcrumbs.length - 1 && <span> / </span>}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="inst-header-right">
          <div className="inst-header-user">
            <span className="inst-header-user-name">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="inst-header-user-role">{user?.role}</span>
          </div>
          <button className="inst-header-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="inst-main">
        {pageTitle && <h1 className="page-title">{pageTitle}</h1>}
        {children}
      </main>
    </div>
  );
}
