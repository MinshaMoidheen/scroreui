'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { BASE_URL, TEACHERSESSION_URL } from '@/constants'

interface User {
  username: string
  email?: string
  role: string
  access?: string
  id?: string
  rollNumber?: string
  courseClass?: {
    _id: string
    name: string
  } | string
  section?: {
    _id: string
    name: string
  } | string
  classsubject?: string
  subject?: string
  loginTime?: string
  lastLogoutTime?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (user: User, token: string) => void
  logout: () => void
  getLoginTime: () => string | null
  getLogoutTime: () => string | null
  getSessionDuration: () => number | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if we're in the browser environment
    if (typeof window === 'undefined') {
      setIsLoading(false)
      return
    }

    // Check for stored user data on mount
    const storedUser = localStorage.getItem('user')
    const storedToken = localStorage.getItem('accessToken')
    
    if (storedUser && storedToken && storedUser !== 'null' && storedUser !== 'undefined') {
      try {
        const parsedUser = JSON.parse(storedUser)
        if (parsedUser && typeof parsedUser === 'object') {
          setUser(parsedUser)
        } else {
          // Invalid user data, clear it
          localStorage.removeItem('user')
          localStorage.removeItem('accessToken')
          localStorage.removeItem('teacherSession')
        }
      } catch (error) {
        console.error('Error parsing stored user data:', error)
        localStorage.removeItem('user')
        localStorage.removeItem('accessToken')
        localStorage.removeItem('teacherSession')
      }
    }
    
    setIsLoading(false)
  }, [])

  // Listen for token expiration events
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleTokenExpired = async () => {
      console.log('Token expired, logging out user and updating teacher session')
      
      // Update teacher session with logoutTime
      const currentTime = new Date().toISOString()
      const storedSession = localStorage.getItem('teacherSession')
      
      if (storedSession) {
        try {
          const session = JSON.parse(storedSession)
          const sessionId = session?.session?._id || session._id || session.id
          
          if (sessionId) {
            try {
              const response = await fetch(`${BASE_URL}${TEACHERSESSION_URL}/${sessionId}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  logoutAt: currentTime,
                  logoutTime: currentTime,
                  active: false
                })
              })
              
              if (!response.ok) {
                console.error('Failed to update teacher session on token expiration:', response.statusText)
              }
            } catch (error) {
              console.error('Error updating teacher session on token expiration:', error)
            }
          }
        } catch (error) {
          console.error('Error parsing teacher session:', error)
        }
      }
      
      setUser(null)
      // Clear any additional state if needed
    }

    window.addEventListener('tokenExpired', handleTokenExpired)
    
    return () => {
      window.removeEventListener('tokenExpired', handleTokenExpired)
    }
  }, [])

  const login = (userData: User, token: string) => {
    const currentTime = new Date().toISOString()
    const userWithLoginTime = {
      ...userData,
      loginTime: currentTime
    }
    
    setUser(userWithLoginTime)
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(userWithLoginTime))
      localStorage.setItem('accessToken', token)
      localStorage.setItem('loginTime', currentTime)
      // Dispatch custom event to update sidebar
      window.dispatchEvent(new CustomEvent('userDataChanged'))
    }
  }

  const logout = async () => {
    const currentTime = new Date().toISOString()
    
    // Update teacher session with logoutTime before clearing data
    if (typeof window !== 'undefined') {
      const storedSession = localStorage.getItem('teacherSession')
      if (storedSession) {
        try {
          const session = JSON.parse(storedSession)
          const sessionId = session?.session?._id || session._id || session.id
          
          if (sessionId) {
            // Update session with logoutTime
            try {
              const response = await fetch(`${BASE_URL}${TEACHERSESSION_URL}/${sessionId}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                },
                body: JSON.stringify({
                  logoutAt: currentTime,
                  logoutTime: currentTime,
                  active: false
                })
              })
              
              if (!response.ok) {
                console.error('Failed to update teacher session:', response.statusText)
              }
            } catch (error) {
              console.error('Error updating teacher session on logout:', error)
            }
          }
        } catch (error) {
          console.error('Error updating teacher session:', error)
        }
      }
      
      localStorage.setItem('lastLogoutTime', currentTime)
      
      // Update user data with logout time if user exists
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser)
          const userWithLogoutTime = {
            ...parsedUser,
            lastLogoutTime: currentTime
          }
          localStorage.setItem('userLogoutData', JSON.stringify(userWithLogoutTime))
          
        } catch (error) {
          console.error('Error saving logout time:', error)
        }
      }
    }
    
    setUser(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user')
      localStorage.removeItem('accessToken')
      localStorage.removeItem('loginTime')
      localStorage.removeItem('courseclass')
      localStorage.removeItem('section')
      localStorage.removeItem('subject')
      localStorage.removeItem('teacherSession')
      // Clear any rrweb recording residues on logout
      localStorage.setItem('rrweb_sessions', '[]')
      localStorage.removeItem('videoActiveTime')
      localStorage.removeItem('videoIdleTime')
      localStorage.removeItem('videoTotalOpenTime')
      // Dispatch custom event to update sidebar
      window.dispatchEvent(new CustomEvent('userDataChanged'))
    }
  }

  // Utility functions for login/logout time management
  const getLoginTime = (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('loginTime')
  }

  const getLogoutTime = (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('lastLogoutTime')
  }

  const getSessionDuration = (): number | null => {
    if (typeof window === 'undefined') return null
    
    const loginTime = localStorage.getItem('loginTime')
    if (!loginTime) return null
    
    const login = new Date(loginTime)
    const now = new Date()
    return Math.floor((now.getTime() - login.getTime()) / 1000) // Duration in seconds
  }

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    getLoginTime,
    getLogoutTime,
    getSessionDuration,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
