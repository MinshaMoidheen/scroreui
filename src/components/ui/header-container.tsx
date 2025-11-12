import { type ReactNode } from 'react'

interface HeaderContainerProps {
  children: ReactNode
}

export function HeaderContainer({ children }: HeaderContainerProps) {
  return (
    <div className='mb-2 flex items-center justify-between space-y-2 flex-wrap gap-x-4'>
      {children}
    </div>
  )
}
