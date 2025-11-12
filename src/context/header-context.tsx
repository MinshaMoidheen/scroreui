'use client'

import React, { createContext, useContext, useState } from 'react'

interface HeaderContextType {
  header: React.ReactNode | null
  setHeader: (header: React.ReactNode | null) => void
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined)

export function HeaderProvider({ children }: { children: React.ReactNode }) {
  const [header, setHeader] = useState<React.ReactNode | null>(null)

  const contextValue = React.useMemo(() => ({
    header,
    setHeader
  }), [header])

  return (
    <HeaderContext.Provider value={contextValue}>
      <div className="flex flex-col w-full">
        {header}
        {children}
      </div>
    </HeaderContext.Provider>
  )
}

export function useHeader() {
  const context = useContext(HeaderContext)
  if (context === undefined) {
    throw new Error('useHeader must be used within a HeaderProvider')
  }
  return context
}
