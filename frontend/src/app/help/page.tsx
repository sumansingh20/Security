import Link from 'next/link';

export default function HelpPage() {
  const sectionHeading: React.CSSProperties = {
    fontSize: '17px',
    fontWeight: 600,
    color: '#1a1a1a',
    marginBottom: '14px',
    paddingBottom: '10px',
    borderBottom: '1px solid #dee2e6',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    border: '1px solid #dee2e6',
    borderRadius: '6px',
    padding: '20px',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9fa' }}>

      {/* Top Bar */}
      <header style={{ backgroundColor: '#1d4f91', color: '#ffffff' }}>
        <div style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
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
              flexShrink: 0,
            }}>
              PE
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '16px', lineHeight: 1.2 }}>ProctoredExam</div>
              <div style={{ fontSize: '11px', opacity: 0.75, lineHeight: 1.2 }}>Help &amp; Support</div>
            </div>
          </Link>
          <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
            <Link href="/login" style={{ color: '#bee3f8', textDecoration: 'none' }}>Sign In</Link>
            <Link href="/" style={{ color: '#bee3f8', textDecoration: 'none' }}>Home</Link>
          </div>
        </div>
      </header>

      {/* Secondary Nav */}
      <nav style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #dee2e6' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', display: 'flex', gap: '0' }}>
          {[
            { label: 'Home', href: '/' },
            { label: 'Help & Documentation', href: '/help', active: true },
            { label: 'Sign In', href: '/login' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: '10px 16px',
                fontSize: '13px',
                color: item.active ? '#1d4f91' : '#495057',
                textDecoration: 'none',
                borderBottom: item.active ? '2px solid #1d4f91' : '2px solid transparent',
                fontWeight: item.active ? 600 : 400,
                marginBottom: '-1px',
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Page Header */}
      <div style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #dee2e6', padding: '24px 0' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 600, color: '#1a1a1a' }}>Help &amp; Documentation</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6c757d' }}>
            User guides, exam rules, and frequently asked questions
          </p>
        </div>
      </div>

      {/* Content */}
      <main style={{ flex: 1 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '28px 24px' }}>

          {/* Quick Start Guide */}
          <section style={{ marginBottom: '28px' }}>
            <h2 style={sectionHeading}>Quick Start Guide</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={cardStyle}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: 600, color: '#1a1a1a' }}>For Students</h3>
                <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#495057', lineHeight: 2 }}>
                  <li>Login with your Student ID and Date of Birth</li>
                  <li>Go to <strong>My Exams</strong> to see available exams</li>
                  <li>Click on an exam to view instructions</li>
                  <li>Start the exam when the window opens</li>
                  <li>Submit before the timer runs out</li>
                </ol>
              </div>
              <div style={cardStyle}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', fontWeight: 600, color: '#1a1a1a' }}>For Teachers</h3>
                <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#495057', lineHeight: 2 }}>
                  <li>Login with your email and password</li>
                  <li>Create exams from the <strong>Exams</strong> section</li>
                  <li>Add questions to your question bank</li>
                  <li>Monitor live exams in real-time</li>
                  <li>View results and violation reports</li>
                </ol>
              </div>
            </div>
          </section>

          {/* Exam Rules */}
          <section style={{ marginBottom: '28px' }}>
            <h2 style={sectionHeading}>Exam Rules</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              {[
                { title: 'Secure Browser', desc: 'Do not switch tabs, open new windows, or use keyboard shortcuts during the exam. All actions are monitored.' },
                { title: 'Time Limit', desc: 'Each exam has a strict time limit. Your exam will be auto-submitted when the timer expires.' },
                { title: 'Violations', desc: 'Tab switching, copy-paste, right-click, and other suspicious activities are flagged. Too many violations may lead to auto-termination.' },
                { title: 'Question Navigation', desc: 'Use the question palette to navigate between questions. You can mark questions for review and return to them later.' },
                { title: 'Auto-Save', desc: 'Your answers are saved automatically. If you lose connection, you can resume from where you left off.' },
                { title: 'Calculator', desc: 'If enabled by the teacher, an on-screen calculator is available during the exam.' },
              ].map((rule) => (
                <div key={rule.title} style={{ ...cardStyle, padding: '16px 18px' }}>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 600, color: '#1a1a1a' }}>{rule.title}</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#6c757d', lineHeight: 1.6 }}>{rule.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section style={{ marginBottom: '28px' }}>
            <h2 style={sectionHeading}>Frequently Asked Questions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { q: 'What format should I enter my Date of Birth?', a: 'Enter as DDMMYYYY. For example, if your birthday is June 15, 1995, enter 15061995.' },
                { q: 'My account is locked. What should I do?', a: 'After 5 failed login attempts, accounts are temporarily locked. Wait for the lockout period (2 hours) or contact your exam administrator.' },
                { q: 'I got disconnected during my exam. Can I resume?', a: 'Yes. Log back in and navigate to the exam. Your answers are auto-saved and you can continue from where you left off, provided the exam time hasn\'t expired.' },
                { q: 'Can I go back to previous questions?', a: 'Yes, you can navigate freely between questions using the question palette on the side.' },
                { q: 'What happens if I accidentally close the browser?', a: 'A tab-switch violation will be recorded. Log back in immediately and resume the exam. Multiple violations may result in exam termination.' },
              ].map((faq) => (
                <details
                  key={faq.q}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #dee2e6',
                    borderRadius: '6px',
                    overflow: 'hidden',
                  }}
                >
                  <summary style={{
                    padding: '12px 18px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#1a1a1a',
                    cursor: 'pointer',
                    listStyle: 'none',
                  }}>
                    {faq.q}
                  </summary>
                  <div style={{
                    padding: '0 18px 14px 18px',
                    fontSize: '13px',
                    color: '#495057',
                    lineHeight: 1.7,
                    borderTop: '1px solid #f1f5f9',
                  }}>
                    <p style={{ margin: '12px 0 0 0' }}>{faq.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* Contact Support */}
          <section style={{ marginBottom: '28px' }}>
            <h2 style={sectionHeading}>Contact Support</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={cardStyle}>
                <strong style={{ fontSize: '14px', color: '#1a1a1a' }}>Email</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#495057' }}>support@proctoredexam.com</p>
              </div>
              <div style={cardStyle}>
                <strong style={{ fontSize: '14px', color: '#1a1a1a' }}>Phone</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#495057' }}>+91-XXX-XXXXXXX (During exam hours)</p>
              </div>
            </div>
          </section>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', paddingTop: '8px' }}>
            <Link href="/" style={{
              padding: '10px 28px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#1d4f91',
              backgroundColor: '#ffffff',
              border: '1px solid #1d4f91',
              borderRadius: '4px',
              textDecoration: 'none',
            }}>
              Back to Home
            </Link>
            <Link href="/login" style={{
              padding: '10px 28px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#ffffff',
              backgroundColor: '#1d4f91',
              border: 'none',
              borderRadius: '4px',
              textDecoration: 'none',
            }}>
              Login to Portal
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
          &copy; {new Date().getFullYear()} ProctoredExam &middot; Secure Online Examination System
        </p>
      </footer>
    </div>
  );
}
