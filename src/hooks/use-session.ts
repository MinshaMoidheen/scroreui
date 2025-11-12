'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/auth-context'

export interface SessionInfo {
  loginTime: string | null
  logoutTime: string | null
  sessionDuration: number | null
  isActive: boolean
}

export function useSession() {
  const { user, getLoginTime, getLogoutTime, getSessionDuration } = useAuth()
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>({
    loginTime: null,
    logoutTime: null,
    sessionDuration: null,
    isActive: false
  })

  useEffect(() => {
    if (user) {
      const loginTime = getLoginTime()
      const logoutTime = getLogoutTime()
      const sessionDuration = getSessionDuration()
      
      setSessionInfo({
        loginTime,
        logoutTime,
        sessionDuration,
        isActive: true
      })
      
      // Update session duration every minute
      const interval = setInterval(() => {
        const currentDuration = getSessionDuration()
        setSessionInfo(prev => ({
          ...prev,
          sessionDuration: currentDuration
        }))
      }, 60000) // Update every minute
      
      return () => clearInterval(interval)
    } else {
      setSessionInfo({
        loginTime: null,
        logoutTime: null,
        sessionDuration: null,
        isActive: false
      })
    }
  }, [user, getLoginTime, getLogoutTime, getSessionDuration])

  const formatTime = (timeString: string | null): string => {
    if (!timeString) return 'N/A'
    try {
      const date = new Date(timeString)
      return date.toLocaleString()
    } catch (error) {
      console.log('Error formatting time:', error)
      return 'Invalid Date'
    }
  }

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return 'N/A'
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    } else {
      return `${remainingSeconds}s`
    }
  }

  const getSessionHistory = (): Array<{loginTime: string, logoutTime?: string}> => {
    if (typeof window === 'undefined') return []
    
    try {
      const history = localStorage.getItem('userLogoutData')
      if (history) {
        const parsed = JSON.parse(history)
        return [{
          loginTime: parsed.loginTime || '',
          logoutTime: parsed.lastLogoutTime
        }]
      }
    } catch (error) {
      console.error('Error reading session history:', error)
    }
    
    return []
  }

  const clearSessionHistory = (): void => {
    if (typeof window === 'undefined') return
    localStorage.removeItem('userLogoutData')
    localStorage.removeItem('lastLogoutTime')
  }

  return {
    sessionInfo,
    formatTime,
    formatDuration,
    getSessionHistory,
    clearSessionHistory
  }
}
