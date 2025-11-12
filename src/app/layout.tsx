import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/context/auth-context'
import ReduxProvider from '@/store/ReduxProvider'
import { Toaster } from '@/components/ui/toaster'
import { ToastListener } from '@/components/toast-listener'


export const metadata: Metadata = {
  title: 'Sensei',
  description: 'Admin dashboard built with shadcn/ui',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="group/body" suppressHydrationWarning>
        <div id="root"></div>
        <ReduxProvider>
          <AuthProvider>
            {children}
            <Toaster />
            <ToastListener />
          </AuthProvider>
        </ReduxProvider>
      </body>
    </html>
  )
}
