import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Flappy Bird Game',
  description: 'A complete Flappy Bird clone built with HTML5 Canvas, CSS, and JavaScript. Features realistic physics, collision detection, scoring system, and mobile-friendly controls.',
  keywords: ['flappy bird', 'game', 'html5', 'canvas', 'javascript', 'physics', 'mobile game'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen bg-gradient-to-b from-sky-400 to-sky-600">
          {children}
        </main>
      </body>
    </html>
  )
}