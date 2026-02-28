import Link from 'next/link';

export default function HelpPage() {
  return (
    <div className="login-page">
      <header className="login-header">
        <div className="login-header-inner">
          <Link href="/" className="login-header-home">
            <div className="login-logo">
              <span className="login-logo-text">PE</span>
            </div>
            <div className="login-institute">
              <div className="login-institute-name">ProctoredExam</div>
              <div className="login-institute-sub">Help &amp; Support</div>
            </div>
          </Link>
        </div>
      </header>

      <main className="login-main">
        <div className="help-container">

          <div className="help-section">
            <h2 className="help-heading">Quick Start Guide</h2>
            <div className="help-grid">
              <div className="help-card">
                <h3 className="help-card-title">For Students</h3>
                <ol className="help-list">
                  <li>Login with your Student ID and Date of Birth</li>
                  <li>Go to <strong>My Exams</strong> to see available exams</li>
                  <li>Click on an exam to view instructions</li>
                  <li>Start the exam when the window opens</li>
                  <li>Submit before the timer runs out</li>
                </ol>
              </div>
              <div className="help-card">
                <h3 className="help-card-title">For Teachers</h3>
                <ol className="help-list">
                  <li>Login with your email and password</li>
                  <li>Create exams from the <strong>Exams</strong> section</li>
                  <li>Add questions to your question bank</li>
                  <li>Monitor live exams in real-time</li>
                  <li>View results and violation reports</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="help-section">
            <h2 className="help-heading">Exam Rules</h2>
            <div className="help-rules">
              <div className="help-rule">
                <strong>Secure Browser</strong>
                <p>Do not switch tabs, open new windows, or use keyboard shortcuts during the exam. All actions are monitored.</p>
              </div>
              <div className="help-rule">
                <strong>Time Limit</strong>
                <p>Each exam has a strict time limit. Your exam will be auto-submitted when the timer expires.</p>
              </div>
              <div className="help-rule">
                <strong>Violations</strong>
                <p>Tab switching, copy-paste, right-click, and other suspicious activities are flagged. Too many violations may lead to auto-termination.</p>
              </div>
              <div className="help-rule">
                <strong>Question Navigation</strong>
                <p>Use the question palette to navigate between questions. You can mark questions for review and return to them later.</p>
              </div>
              <div className="help-rule">
                <strong>Auto-Save</strong>
                <p>Your answers are saved automatically. If you lose connection, you can resume from where you left off.</p>
              </div>
              <div className="help-rule">
                <strong>Calculator</strong>
                <p>If enabled by the teacher, an on-screen calculator is available during the exam.</p>
              </div>
            </div>
          </div>

          <div className="help-section">
            <h2 className="help-heading">FAQ</h2>
            <div className="help-faq-list">
              <details className="help-faq">
                <summary>What format should I enter my Date of Birth?</summary>
                <p>Enter as DDMMYYYY. For example, if your birthday is June 15, 1995, enter <strong>15061995</strong>.</p>
              </details>
              <details className="help-faq">
                <summary>My account is locked. What should I do?</summary>
                <p>After 5 failed login attempts, accounts are temporarily locked. Wait for the lockout period (2 hours) or contact your exam administrator.</p>
              </details>
              <details className="help-faq">
                <summary>I got disconnected during my exam. Can I resume?</summary>
                <p>Yes. Log back in and navigate to the exam. Your answers are auto-saved and you can continue from where you left off, provided the exam time hasn&apos;t expired.</p>
              </details>
              <details className="help-faq">
                <summary>Can I go back to previous questions?</summary>
                <p>Yes, you can navigate freely between questions using the question palette on the side.</p>
              </details>
              <details className="help-faq">
                <summary>What happens if I accidentally close the browser?</summary>
                <p>A tab-switch violation will be recorded. Log back in immediately and resume the exam. Multiple violations may result in exam termination.</p>
              </details>
            </div>
          </div>

          <div className="help-section">
            <h2 className="help-heading">Contact Support</h2>
            <div className="help-grid">
              <div className="help-card">
                <strong>Email</strong>
                <p>support@proctoredexam.com</p>
              </div>
              <div className="help-card">
                <strong>Phone</strong>
                <p>+91-XXX-XXXXXXX (During exam hours)</p>
              </div>
            </div>
          </div>

          <div className="help-actions">
            <Link href="/" className="help-btn help-btn-outline">Back to Home</Link>
            <Link href="/login" className="help-btn help-btn-primary">Login to Portal</Link>
          </div>
        </div>
      </main>

      <footer className="login-footer">
        <p>&copy; {new Date().getFullYear()} ProctoredExam. All rights reserved.</p>
      </footer>
    </div>
  );
}
