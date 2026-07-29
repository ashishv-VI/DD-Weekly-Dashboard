export default function ReportsPage() {
  const planned = [
    { title: "Weekly SEO Summary", desc: "Automated PDF with top keywords, traffic, and health scores for each client. Sent every Monday.", status: "In Progress" },
    { title: "Client Performance Report", desc: "Month-over-month comparison: clicks, impressions, CTR, and position trends.", status: "Planned" },
    { title: "AI Visibility Report", desc: "How often each client appears in ChatGPT, Perplexity, Gemini, and other AI results.", status: "Planned" },
    { title: "Keyword Opportunity Report", desc: "Quick wins (pos 11-20), almost top 3 (pos 4-10), and untapped opportunities.", status: "Planned" },
    { title: "Landing Page Audit", desc: "Top pages by engagement, conversion rate, and bounce rate with SEO recommendations.", status: "Planned" },
  ]

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-400 mt-0.5">Automated and on-demand SEO reports</p>
      </div>

      <div className="max-w-2xl space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p className="text-sm text-blue-800">Weekly email reports are active and sent every Monday at 9:00 AM UTC to <strong>damcodigitalseo@gmail.com</strong>.</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {planned.map(r => (
            <div key={r.title} className="p-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{r.title}</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{r.desc}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${
                r.status === "In Progress" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"
              }`}>{r.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
