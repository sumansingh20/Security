import Link from 'next/link';

export default function HelpPage() {
  return (
    <div className="error-page">
      <header className="error-header">
        <div className="error-header-inner">
          <Link href="/" className="error-header-link">ProctoredExam</Link>
          <nav className="help-nav">
            <Link href="/login" className="help-nav-link">Login</Link>
          </nav>
        </div>
      </header>
      <main className="help-main">
        <div className="help-container animate-fadeInUp">
          <h1 className="help-title">Help &amp; Support</h1>
          <p className="help-subtitle">Everything you need to know about using ProctoredExam</p>

          {/* Quick Start */}
          <section className="help-section">
            <h2 className="help-section-title">Quick Start Guide</h2>
            <div className="help-cards">
              <div className="help-card">
                <div className="help-card-icon">👨‍🎓</div>
                <h3>Students</h3>
                <ol className="help-steps">
                  <li>Login with your Student ID and Date of Birth</li>
                  <li>Go to <strong>My Exams</strong> to see available exams</li>
                  <li>Click on an exam to view instructions</li>
                  <li>Start the exam when the window opens</li>
                  <li>Submit before the timer runs out</li>
                </ol>
              </div>
              <div className="help-card">
                <div className="help-card-icon">👨‍🏫</div>
                <h3>Teachers</h3>
                <ol className="help-steps">
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
          <section className="help-section">
            <h2 className="help-section-title">Exam Rules &amp; Instructions</h2>
            <div className="help-rules">
              <div className="help-rule">
                <span className="help-rule-icon">🔒</span>
                <div>
                  <strong>Secure Browser</strong>
                  <p>Do not switch tabs, open new windows, or use keyboard shortcuts during the exam. All actions are monitored.</p>
                </div>
              </div>
              <div className="help-rule">
                <span className="help-rule-icon">⏱️</span>
                <div>
                  <strong>Time Limit</strong>
                  <p>Each exam has a strict time limit. Your exam will be auto-submitted when the timer expires.</p>
                </div>
              </div>
              <div className="help-rule">
                <span className="help-rule-icon">⚠️</span>
                <div>
                  <strong>Violations</strong>
                  <p>Tab switching, copy-paste, right-click, and other suspicious activities are flagged as violations. Too many violations may lead to auto-termination.</p>
                </div>
              </div>
              <div className="help-rule">
                <span className="help-rule-icon">📋</span>
                <div>
                  <strong>Question Navigation</strong>
                  <p>Use the question palette to navigate between questions. You can mark questions for review and return to them later.</p>
                </div>
              </div>
              <div className="help-rule">
                <span className="help-rule-icon">💾</span>
                <div>
                  <strong>Auto-Save</strong>
                  <p>Your answers are automatically saved. If you lose connection, you can resume from where you left off.</p>
                </div>
              </div>
              <div className="help-rule">
                <span className="help-rule-icon">🧮</span>
                <div>
                  <strong>Calculator</strong>
                  <p>If enabled by the teacher, an on-screen calculator is available during the exam.</p>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="help-section">
            <h2 className="help-section-title">FAQ</h2>
            <div className="help-faq">
              <details className="help-faq-item">
                <summary>What format should I enter my Date of Birth?</summary>
                <p>Enter as DDMMYYYY. For example, if your birthday is June 15, 1995, enter <strong>15061995</strong>.</p>
              </details>
              <details className="help-faq-item">
                <summary>My account is locked. What should I do?</summary>
                <p>After 5 failed login attempts, accounts are temporarily locked. Wait for the lockout period (2 hours) or contact your exam administrator.</p>
              </details>
              <details className="help-faq-item">
                <summary>I got disconnected during my exam. Can I resume?</summary>
                <p>Yes. Log back in and navigate to the exam. Your answers are auto-saved and you can continue from where you left off, provided the exam time hasn&apos;t expired.</p>
              </details>
              <details className="help-faq-item">
                <summary>Can I go back to previous questions?</summary>
                <p>Yes, you can navigate freely between questions using the question palette on the side.</p>
              </details>
              <details className="help-faq-item">
                <summary>What happens if I accidentally close the browser?</summary>
                <p>A tab-switch violation will be recorded. Log back in immediately and resume the exam. Multiple violations may result in exam termination.</p>
              </details>
            </div>
          </section>

          {/* Contact */}
          <section className="help-section">
            <h2 className="help-section-title">Contact Support</h2>
            <div className="help-contact">
              <div className="help-contact-item">
                <span className="help-contact-icon">📧</span>
                <div>
                  <strong>Email</strong>
                  <p>support@proctoredexam.com</p>
                </div>
              </div>
              <div className="help-contact-item">
                <span className="help-contact-icon">📞</span>
                <div>
                  <strong>Phone</strong>
                  <p>+91-XXX-XXXXXXX (During exam hours)</p>
                </div>
              </div>
            </div>
          </section>

          <div className="help-back">
            <Link href="/" className="error-btn error-btn-outline">← Back to Home</Link>
            <Link href="/login" className="error-btn error-btn-primary">Login to Portal</Link>
          </div>
        </div>
      </main>
      <footer className="error-footer">
        <p>&copy; {new Date().getFullYear()} ProctoredExam | All Rights Reserved</p>
      </footer>
    </div>
  );
}
