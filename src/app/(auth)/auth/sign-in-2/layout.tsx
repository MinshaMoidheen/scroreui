'use client'

interface Props {
  children: React.ReactNode
}

export default function SignIn2Layout({ children }: Props) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {children}
    </div>
  )
}
