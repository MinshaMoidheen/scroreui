'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, LogIn, LogOut, Timer } from 'lucide-react'

export function UserSessionInfo() {
  const { user, getLoginTime, getLogoutTime, getSessionDuration } = useAuth()
  const [sessionDuration, setSessionDuration] = useState<number | null>(null)
  const [loginTime, setLoginTime] = useState<string | null>(null)
  const [logoutTime, setLogoutTime] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      setLoginTime(getLoginTime())
      setLogoutTime(getLogoutTime())
      setSessionDuration(getSessionDuration())
      
      // Update session duration every minute
      const interval = setInterval(() => {
        setSessionDuration(getSessionDuration())
      }, 60000) // Update every minute
      
      return () => clearInterval(interval)
    } else {
      setLoginTime(null)
      setLogoutTime(null)
      setSessionDuration(null)
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

  if (!user) {
    return null
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Session Information
        </CardTitle>
        <CardDescription>
          Current user session details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User Info */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">User:</span>
          <Badge variant="secondary">{user.username}</Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Role:</span>
          <Badge variant="outline">{user.role}</Badge>
        </div>

        {/* Login Time */}
        <div className="flex items-center gap-2">
          <LogIn className="h-4 w-4 text-green-500" />
          <div className="flex-1">
            <span className="text-sm font-medium">Login Time:</span>
            <p className="text-sm text-muted-foreground">
              {formatTime(loginTime)}
            </p>
          </div>
        </div>

        {/* Session Duration */}
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-blue-500" />
          <div className="flex-1">
            <span className="text-sm font-medium">Session Duration:</span>
            <p className="text-sm text-muted-foreground">
              {formatDuration(sessionDuration)}
            </p>
          </div>
        </div>

        {/* Last Logout Time (if available) */}
        {logoutTime && (
          <div className="flex items-center gap-2">
            <LogOut className="h-4 w-4 text-red-500" />
            <div className="flex-1">
              <span className="text-sm font-medium">Last Logout:</span>
              <p className="text-sm text-muted-foreground">
                {formatTime(logoutTime)}
              </p>
            </div>
          </div>
        )}

        {/* Additional Info */}
        {user.classsubject && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Class: {user.classsubject} | Section: {user.section} | Subject: {user.subject}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
