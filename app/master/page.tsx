import Link from 'next/link'

export default function MasterDataPage() {
  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Master Data</h1>
      <div className="space-y-2">
        <Link href="/master/categories" className="block p-3 border rounded-lg hover:bg-gray-50 font-medium">
          📁 Categories (Labour, Cement, Diesel, etc.)
        </Link>
        <Link href="/master/sites" className="block p-3 border rounded-lg hover:bg-gray-50 font-medium">
          🏗️ Sites (PNC, GR Infra, DRN, etc.)
        </Link>
        <Link href="/master/vendors" className="block p-3 border rounded-lg hover:bg-gray-50 font-medium">
          🏪 Vendors (Balaji Fuels, etc.)
        </Link>
        <Link href="/master/users" className="block p-3 border rounded-lg hover:bg-gray-50 font-medium">
          👤 Users (Rithesh, Vineet, etc.)
        </Link>
      </div>
      <Link href="/dashboard" className="block mt-4 text-sm text-blue-600">← Back to Dashboard</Link>
    </div>
  )
}