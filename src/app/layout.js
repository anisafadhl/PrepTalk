import { Outfit } from 'next/font/google'
import Header from '../components/Header'
import './globals.css'

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })

export const metadata = {
  title: 'PrepTalk - Simulasi Wawancara Kerja AI',
  description: 'Platform cerdas untuk melatih skill wawancara kerjamu.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🧠</text></svg>',
  }
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
