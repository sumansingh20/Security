import Link from 'next/link';
import PublicLayout from '@/components/layouts/PublicLayout';

export default function HomePage() {
  return (
    <PublicLayout>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3">
          <h1 className="text-xl font-normal text-gray-900 mb-4 pb-2 border-b border-gray-300">
            Secure Online Examination Portal
          </h1>

          <div className="prose prose-sm max-w-none text-gray-700">
            <p className="mb-4">
              ProctoredExam is a fully secured, proctored online examination portal designed for 
              educational institutions. This system provides a tamper-proof environment for 
              conducting secure assessments and examinations online.
            </p>

            <h2 className="text-lg font-normal text-gray-900 mt-6 mb-3">For Students</h2>
            <ul className="list-disc list-inside mb-4 text-sm space-y-1">
              <li>Access scheduled examinations securely</li>
              <li>Take proctored exams in a secure browser environment</li>
              <li>View exam results and performance reports</li>
              <li>Real-time violation monitoring for exam integrity</li>
            </ul>

            <h2 className="text-lg font-normal text-gray-900 mt-6 mb-3">For Teachers</h2>
            <ul className="list-disc list-inside mb-4 text-sm space-y-1">
              <li>Create and manage examinations with various question types</li>
              <li>Set up question banks for randomized tests</li>
              <li>Monitor exams live with real-time proctoring</li>
              <li>View detailed analytics and violation reports</li>
            </ul>

            <h2 className="text-lg font-normal text-gray-900 mt-6 mb-3">For Administrators</h2>
            <ul className="list-disc list-inside mb-4 text-sm space-y-1">
              <li>Manage users, exams, and question banks</li>
              <li>Configure exam batches and scheduling</li>
              <li>Monitor all active exam sessions in real-time</li>
              <li>Access audit logs, reports, and system settings</li>
            </ul>

            <h2 className="text-lg font-normal text-gray-900 mt-6 mb-3">Getting Started</h2>
            <p className="mb-4">
              To access the examination portal, you need valid credentials provided by your institution. 
              If you are a registered user, please <Link href="/login" className="text-[#0066cc] hover:underline">log in</Link> to 
              access your dashboard. New users should contact their institution&apos;s administrator 
              for account creation.
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* Login Box */}
          <div className="border border-gray-300 bg-gray-50 mb-4">
            <div className="bg-gray-200 px-4 py-2 border-b border-gray-300">
              <h2 className="text-sm font-semibold text-gray-800">Exam Portal Login</h2>
            </div>
            <div className="p-4">
              <p className="text-xs text-gray-600 mb-3">
                Registered users can log in to access their examinations.
              </p>
              <Link 
                href="/login" 
                className="block w-full text-center py-2 px-4 bg-[#1d4f91] text-white text-sm hover:bg-[#163d73]"
              >
                Log in
              </Link>
            </div>
          </div>

          {/* Security Features */}
          <div className="border border-gray-300 bg-gray-50 mb-4">
            <div className="bg-gray-200 px-4 py-2 border-b border-gray-300">
              <h2 className="text-sm font-semibold text-gray-800">Security Features</h2>
            </div>
            <div className="p-4">
              <ul className="text-sm space-y-2 text-gray-700">
                <li>&#x1F512; Secure browser lockdown</li>
                <li>&#x1F4F9; Live proctoring &amp; monitoring</li>
                <li>&#x26A0;&#xFE0F; Violation detection system</li>
                <li>&#x1F510; Anti-cheating measures</li>
                <li>&#x1F4CA; Audit trail &amp; logging</li>
              </ul>
            </div>
          </div>

          {/* System Status */}
          <div className="border border-gray-300 bg-gray-50">
            <div className="bg-gray-200 px-4 py-2 border-b border-gray-300">
              <h2 className="text-sm font-semibold text-gray-800">System Status</h2>
            </div>
            <div className="p-4">
              <table className="w-full text-xs">
                <tbody>
                  <tr>
                    <td className="py-1 text-gray-600">Server:</td>
                    <td className="py-1 text-green-700">Online</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-gray-600">Exam Engine:</td>
                    <td className="py-1 text-green-700">Active</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-gray-600">Proctoring:</td>
                    <td className="py-1 text-green-700">Enabled</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
