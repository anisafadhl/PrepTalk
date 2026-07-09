import { Outfit } from 'next/font/google'
import Header from '../components/Header'
import './globals.css'

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })

export const metadata = {
  title: 'PrepTalk - Simulasi Wawancara Kerja AI',
  description: 'Platform cerdas untuk melatih skill wawancara kerjamu.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={outfit.variable}>
      <body>
        <div className="app-bg-mesh"></div>
        <Header />
        <main className="container main-content">
          {children}
        </main>
      </body>
    </html>
  )
}
