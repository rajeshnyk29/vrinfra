import './globals.css'

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html>
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