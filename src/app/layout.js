import { Outfit } from 'next/font/google'
import Header from '../components/Header'
import Footer from '../components/Footer'
import './globals.css'

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata = {
  title: 'PrepTalk - Simulasi Wawancara Kerja AI',
  description: 'Platform cerdas untuk melatih skill wawancara kerjamu dan mengevaluasi jawaban secara instan.',
  keywords: ['wawancara kerja', 'simulasi wawancara', 'AI interview', 'persiapan kerja'],
  authors: [{ name: 'Kelompok 2' }],
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🧠</text></svg>',
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={outfit.variable}>
      <body suppressHydrationWarning>
        <div className="app-bg-mesh"></div>
        <Header />
        <main className="container main-content">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
