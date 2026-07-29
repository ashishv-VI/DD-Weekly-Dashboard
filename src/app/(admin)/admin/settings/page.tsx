type SItem = { label: string; value: string; green?: boolean }
type Section = { title: string; items: SItem[]; footer?: React.ReactNode }

import React from "react"

export default function SettingsPage() {
  const sections: Section[] = [
    {
      title: "Email Reports",
      items: [
        { label: "Weekly report schedule", value: "Every Monday, 9:00 AM UTC" },
        { label: "Reports sent to", value: "damcodigitalseo@gmail.com" },
        { label: "Email provider", value: "Resend" },
      ],
    },
    {
      title: "Google Integrations",
      items: [
        { label: "Search Console API", value: "✓ Active", green: true },
        { label: "Analytics GA4 API", value: "✓ Active", green: true },
        { label: "PageSpeed API", value: "✓ Active", green: true },
        { label: "Token auto-refresh", value: "✓ Enabled", green: true },
      ],
      footer: <a href="/login" className="text-sm text-blue-600 hover:underline font-medium">Reconnect Google Account →</a>,
    },
    {
      title: "Platform",
      items: [
        { label: "Application", value: "Damco Digital SEO Intelligence" },
        { label: "Framework", value: "Next.js 16 (App Router)" },
        { label: "Database", value: "PostgreSQL via Drizzle ORM" },
        { label: "Hosting", value: "Vercel" },
      ],
    },
  ]

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Platform configuration and integrations</p>
      </div>

      <div className="max-w-2xl space-y-4">
        {sections.map(s => (
          <div key={s.title} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 text-sm mb-4">{s.title}</h2>
            <div className="divide-y divide-gray-50">
              {s.items.map(item => (
                <div key={item.label} className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-gray-500">{item.label}</span>
                  <span className={`text-sm font-medium ${item.green ? "text-emerald-600" : "text-gray-900"}`}>{item.value}</span>
                </div>
              ))}
            </div>
            {s.footer && <div className="mt-4 pt-4 border-t border-gray-50">{s.footer}</div>}
          </div>
        ))}

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h2 className="font-semibold text-amber-800 text-sm mb-2">Coming Soon</h2>
          <ul className="text-xs text-amber-700 space-y-1">
            <li>• Custom branding & white-label options</li>
            <li>• API key management for PageSpeed</li>
            <li>• Notification preferences per client</li>
            <li>• Role-based access control (Admin / SEO Executive / Viewer)</li>
            <li>• Webhook integrations</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
