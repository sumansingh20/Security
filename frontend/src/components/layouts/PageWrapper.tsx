'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface PageWrapperProps {
  children: ReactNode;
  breadcrumbs?: { name: string; href?: string }[];
}

/**
 * Simple page wrapper that provides breadcrumb navigation
 * Used inside the main SidebarLayout
 */
export default function PageWrapper({ children, breadcrumbs }: PageWrapperProps) {
  return (
    <div className="w-full">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center text-sm mb-6">
          <Link 
            href="/" 
            className="text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Home
          </Link>
          {breadcrumbs.map((crumb, index) => (
            <span key={index} className="flex items-center">
              <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
              {crumb.href ? (
                <Link 
                  href={crumb.href} 
                  className="text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {crumb.name}
                </Link>
              ) : (
                <span className="text-gray-600 dark:text-gray-400">{crumb.name}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Page Content */}
      {children}
    </div>
  );
}
