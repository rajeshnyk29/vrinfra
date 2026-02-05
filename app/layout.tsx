import './globals.css'

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <body>
        <div>
          <h1 className="text-2xl font-bold p-3 bg-blue-900 text-white">
            VR Infra Expense
          </h1>

          {children}
        </div>
      </body>
    </html>
  )
}
