'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  // Extract a user-friendly message from the error
  const getUserMessage = () => {
    const msg = error?.message || '';
    if (msg.includes('toUpperCase') || msg.includes('toLowerCase') || msg.includes('Cannot read properties of undefined') || msg.includes('Cannot read properties of null')) {
      return 'A data loading error occurred. Some information may be temporarily unavailable.';
    }
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('ECONNREFUSED')) {
      return 'Unable to connect to the server. Please check your connection and try again.';
    }
    if (msg.includes('401') || msg.includes('Unauthorized')) {
      return 'Your session has expired. Please log in again.';
    }
    if (msg.includes('403') || msg.includes('Forbidden')) {
      return 'You do not have permission to access this page.';
    }
    if (msg.includes('404') || msg.includes('Not Found')) {
      return 'The requested resource was not found.';
    }
    return 'An unexpected error occurred. Please try again.';
  };

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
          maxWidth: '520px',
          width: '100%',
          textAlign: 'center',
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#fff3f3',
            marginBottom: '16px',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc3545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#212529', margin: '0 0 8px 0' }}>
            Something Went Wrong
          </h1>
          <p style={{ fontSize: '14px', color: '#6c757d', lineHeight: 1.6, margin: '0 0 20px 0' }}>
            {getUserMessage()}
          </p>
          
          {/* Error details (always available, toggle to show) */}
          {error?.message && (
            <div style={{ marginBottom: '20px' }}>
              <button
                onClick={() => setShowDetails(!showDetails)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6c757d',
                  cursor: 'pointer',
                  fontSize: '12px',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                {showDetails ? 'Hide Details' : 'Show Error Details'}
              </button>
              {showDetails && (
                <div style={{
                  marginTop: '10px',
                  padding: '10px 14px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: '#495057',
                  fontFamily: 'monospace',
                  textAlign: 'left',
                  wordBreak: 'break-all',
                  maxHeight: '120px',
                  overflowY: 'auto',
                }}>
                  <code>{error.message}</code>
                  {error.digest && (
                    <div style={{ marginTop: '4px', color: '#868e96' }}>
                      Error ID: {error.digest}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                // Clear any stale state before retrying
                try {
                  reset();
                } catch {
                  window.location.reload();
                }
              }}
              style={{
                padding: '10px 28px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#ffffff',
                backgroundColor: '#1d4f91',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 28px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#495057',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Reload Page
            </button>
            <Link href="/" style={{
              padding: '10px 28px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#1d4f91',
              backgroundColor: '#ffffff',
              border: '1px solid #1d4f91',
              borderRadius: '4px',
              textDecoration: 'none',
              display: 'inline-block',
            }}>
              Go to Home
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
