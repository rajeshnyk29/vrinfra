import Link from 'next/link'

export default function MasterPage() {
  return (
    <div className="p-4 max-w-2xl mx-auto">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 mb-4 block font-medium">
        ← Back to Home
      </Link>

      <h1 className="text-xl font-bold mb-4">Master Data</h1>
      <p className="text-sm text-slate-600 mb-6">
        Manage Categories, Sites, Vendors, and Users
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/master/categories"
          className="block p-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-300 transition-colors"
        >
          <span className="text-2xl mb-2 block">📂</span>
          <span className="font-semibold text-slate-800">Categories</span>
          <p className="text-xs text-slate-500 mt-1">Manage expense categories</p>
        </Link>

        <Link
          href="/master/sites"
          className="block p-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-300 transition-colors"
        >
          <span className="text-2xl mb-2 block">📍</span>
          <span className="font-semibold text-slate-800">Sites</span>
          <p className="text-xs text-slate-500 mt-1">Manage project sites</p>
        </Link>

        <Link
          href="/master/vendors"
          className="block p-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-300 transition-colors"
        >
          <span className="text-2xl mb-2 block">🏢</span>
          <span className="font-semibold text-slate-800">Vendors</span>
          <p className="text-xs text-slate-500 mt-1">Manage vendors</p>
        </Link>

        <Link
          href="/master/users"
          className="block p-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-300 transition-colors"
        >
          <span className="text-2xl mb-2 block">👥</span>
          <span className="font-semibold text-slate-800">Users</span>
          <p className="text-xs text-slate-500 mt-1">Invite and manage users</p>
        </Link>
      </div>
    </div>
  )
}
