'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="error-page">
      <header className="error-header">
        <Link href="/" className="error-header-link">ProctoredExam</Link>
      </header>
      <main className="error-main">
        <div className="error-card animate-scaleIn">
          <div className="error-code error-code-red">500</div>
          <h1 className="error-title">Something Went Wrong</h1>
          <p className="error-desc">
            An unexpected error has occurred. This incident has been logged
            and our technical team will investigate.
          </p>
          {process.env.NODE_ENV === 'development' && error.message && (
            <div className="error-debug">
              <code>{error.message}</code>
            </div>
          )}
          <div className="error-actions">
            <button onClick={reset} className="error-btn error-btn-primary">Try Again</button>
            <Link href="/" className="error-btn error-btn-outline">Go to Home</Link>
          </div>
        </div>
      </main>
      <footer className="error-footer">
        <p>&copy; {new Date().getFullYear()} ProctoredExam | All Rights Reserved</p>
      </footer>
    </div>
  );
}
