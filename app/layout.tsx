import './globals.css'

export const metadata = {
  title: 'VR Infra Expense Manager',
  description: 'Manage expenses, track payments and view analytics',
}

export const viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
}

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen">
        <div className="min-h-screen">
          <header className="bg-slate-900/95 backdrop-blur border-b border-white/10 sticky top-0 z-10">
            <div className="max-w-6xl mx-auto px-4 py-3">
              <a href="/" className="block">
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  VR Infra
                </h1>
              </a>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  )
}