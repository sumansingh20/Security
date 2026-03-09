import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <header style={{ backgroundColor: '#1d4f91', color: '#ffffff' }}>
        <div style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          height: '56px',
        }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: '#ffffff' }}>
            <div style={{
              width: '36px',
              height: '36px',
              backgroundColor: '#ffffff',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '15px',
              color: '#1d4f91',
              lineHeight: 1,
            }}>
              PE
            </div>
            <span style={{ fontWeight: 700, fontSize: '16px' }}>ProctoredExam</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          padding: '40px',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
        }}>
          <div style={{
            display: 'inline-block',
            fontSize: '48px',
            fontWeight: 700,
            color: '#1d4f91',
            marginBottom: '12px',
            lineHeight: 1,
          }}>
            404
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#212529', margin: '0 0 8px 0' }}>
            Page Not Found
          </h1>
          <p style={{ fontSize: '14px', color: '#6c757d', lineHeight: 1.6, margin: '0 0 24px 0' }}>
            The requested page does not exist or has been moved.
            Please check the URL or navigate using the links below.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link href="/" style={{
              padding: '10px 28px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#ffffff',
              backgroundColor: '#1d4f91',
              border: 'none',
              borderRadius: '4px',
              textDecoration: 'none',
            }}>
              Go to Home
            </Link>
            <Link href="/login" style={{
              padding: '10px 28px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#1d4f91',
              backgroundColor: '#ffffff',
              border: '1px solid #1d4f91',
              borderRadius: '4px',
              textDecoration: 'none',
            }}>
              Sign In
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        backgroundColor: '#ffffff',
        borderTop: '1px solid #dee2e6',
        padding: '16px',
        textAlign: 'center',
      }}>
        <p style={{ margin: 0, fontSize: '12px', color: '#868e96' }}>
          &copy; {new Date().getFullYear()} ProctoredExam &middot; All Rights Reserved
        </p>
      </footer>
    </div>
  );
}
