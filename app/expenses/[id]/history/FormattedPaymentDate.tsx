'use client'

export function FormattedPaymentDate({ isoString }: { isoString: string | null | undefined }) {
  if (!isoString) return <span className="text-slate-500">N/A</span>
  try {
    const date = new Date(isoString)
    const dateStr = date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
    // If value is date-only (e.g. "2026-02-15"), time is midnight UTC → 5:30 AM IST; don't show fake time
    const isDateOnly =
      /^\d{4}-\d{2}-\d{2}$/.test(isoString.trim()) ||
      (date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0)
    const timeStr = isDateOnly
      ? null
      : date.toLocaleTimeString('en-IN', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
    return (
      <span className="text-slate-500">
        {dateStr}
        {timeStr != null ? ` at ${timeStr}` : ''}
      </span>
    )
  } catch {
    return <span className="text-slate-500">{isoString}</span>
  }
}