'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/login', label: 'Login' },
    { href: '/register', label: 'Register' },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top Bar */}
      <div className="bg-[#1d4f91] text-white text-xs">
        <div className="max-w-6xl mx-auto px-4 py-1 flex justify-end gap-4">
          <Link href="/login" className="hover:underline">Log in</Link>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-gray-300">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#1d4f91] rounded flex items-center justify-center text-white font-bold text-sm">
                PE
              </div>
              <span className="text-lg font-semibold text-gray-900">ProctoredExam</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-100 border-b border-gray-300">
        <div className="max-w-6xl mx-auto px-4">
          <ul className="flex">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`block px-4 py-2 text-sm border-b-2 -mb-[1px] ${
                      isActive
                        ? 'border-[#1d4f91] text-[#1d4f91] bg-white'
                        : 'border-transparent text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-2">
          <nav className="text-sm text-gray-600">
            <Link href="/" className="text-[#0066cc] hover:underline">Home</Link>
            {pathname !== '/' && (
              <>
                <span className="mx-1">/</span>
                <span className="capitalize">{pathname.slice(1).replace(/-/g, ' ')}</span>
              </>
            )}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 border-t border-gray-300 mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">ProctoredExam</h3>
              <p className="text-gray-600 text-xs">
                Secure Proctored Examination Portal for educational institutions.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Exam Portal</h3>
              <ul className="space-y-1 text-xs">
                <li><Link href="/login" className="text-[#0066cc] hover:underline">Login</Link></li>
                <li><Link href="/register" className="text-[#0066cc] hover:underline">Register</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Support</h3>
              <ul className="space-y-1 text-xs text-gray-600">
                <li>Email: support@proctoredexam.com</li>
              </ul>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
                        © {new Date().getFullYear()} ProctoredExam. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
