export default function SettingsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Platform configuration</p>
      </div>

      <div className="space-y-6 max-w-2xl">
        {/* Email Settings */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Email Reports</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-gray-500">Weekly report schedule</span>
              <span className="font-medium">Every Monday, 9:00 AM UTC</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-gray-500">Reports sent to</span>
              <span className="font-medium">damcodigitalseo@gmail.com</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500">Email provider</span>
              <span className="font-medium">Resend</span>
            </div>
          </div>
        </div>

        {/* Google Integration */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Google Integration</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-gray-500">Search Console API</span>
              <span className="text-emerald-600 font-medium">✓ Active</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-gray-500">Analytics GA4 API</span>
              <span className="text-emerald-600 font-medium">✓ Active</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500">Token auto-refresh</span>
              <span className="text-emerald-600 font-medium">✓ Enabled</span>
            </div>
          </div>
          <a href="/login"
            className="mt-4 inline-block text-sm text-blue-600 hover:underline font-medium">
            Reconnect Google Account →
          </a>
        </div>

        {/* App Info */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">About</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-gray-500">Platform</span>
              <span className="font-medium">Damco Digital SEO Intelligence</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500">Hosted on</span>
              <span className="font-medium">Vercel</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
