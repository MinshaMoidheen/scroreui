import { Inter } from 'next/font/google'
import AuthLayoutClient from './layout.client'

const inter = Inter({ subsets: ['latin'] })

export default function AuthRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${inter.className} min-h-screen bg-background`}>
      <AuthLayoutClient>
        {children}
      </AuthLayoutClient>
    </div>
  )
}
