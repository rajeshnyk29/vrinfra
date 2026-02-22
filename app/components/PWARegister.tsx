'use client'

import { useEffect } from 'react'

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope)
        setInterval(() => registration.update(), 60 * 60 * 1000)
      })
      .catch((err) => console.log('SW registration failed:', err))
  }, [])

  return null
}