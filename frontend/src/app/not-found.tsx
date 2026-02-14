import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="error-page">
      <header className="error-header">
        <Link href="/" className="error-header-link">ProctoredExam</Link>
      </header>
      <main className="error-main">
        <div className="error-card animate-scaleIn">
          <div className="error-code error-code-blue">404</div>
          <h1 className="error-title">Page Not Found</h1>
          <p className="error-desc">
            The requested page does not exist or has been moved.
            Please check the URL or navigate using the links below.
          </p>
          <div className="error-actions">
            <Link href="/" className="error-btn error-btn-primary">Go to Home</Link>
            <Link href="/login" className="error-btn error-btn-outline">Login</Link>
          </div>
        </div>
      </main>
      <footer className="error-footer">
        <p>&copy; {new Date().getFullYear()} ProctoredExam | All Rights Reserved</p>
      </footer>
    </div>
  );
}
