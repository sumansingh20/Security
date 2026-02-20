import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/components/providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ProctoredExam - Secure Exam Portal',
  description: 'A fully secured proctored online examination system for students, teachers, and administrators.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="bg-gray-50 text-gray-900 min-h-screen antialiased" suppressHydrationWarning>
        <ThemeProvider defaultTheme="light" storageKey="proctorexam-theme">
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              className: 'text-sm',
              style: {
                background: '#1f2937',
                color: '#f9fafb',
                borderRadius: '0.5rem',
                padding: '12px 16px',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#f9fafb',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#f9fafb',
                },
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
