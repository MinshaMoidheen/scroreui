'use client'

import { useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'

export function ToastListener() {
  const { toast } = useToast()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleShowToast = (event: CustomEvent) => {
      const { title, description, variant } = event.detail
      toast({
        title,
        description,
        variant: variant || 'default',
      })
    }

    window.addEventListener('showToast', handleShowToast as EventListener)
    
    return () => {
      window.removeEventListener('showToast', handleShowToast as EventListener)
    }
  }, [toast])

  return null
}

