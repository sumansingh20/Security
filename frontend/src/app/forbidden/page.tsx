'use client';

import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <div className="error-page">
      <header className="error-header">
        <Link href="/" className="error-header-link">ProctoredExam</Link>
      </header>
      <main className="error-main">
        <div className="error-card animate-scaleIn">
          <div className="error-code error-code-amber">403</div>
          <h1 className="error-title">Access Forbidden</h1>
          <p className="error-desc">
            You do not have permission to access this resource.
            This may be due to insufficient privileges or the resource being restricted.
          </p>
          <div className="error-info-box">
            <strong>Possible reasons:</strong>
            <ul>
              <li>Your session has expired</li>
              <li>You are not enrolled in this examination</li>
              <li>The examination window has not started</li>
              <li>Your account has been temporarily locked</li>
            </ul>
          </div>
          <div className="error-actions">
            <Link href="/login" className="error-btn error-btn-primary">Login Again</Link>
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
