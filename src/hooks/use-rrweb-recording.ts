'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { record } from 'rrweb'
import {  useGetSectionsBySessionQuery } from '@/store/api/teacherSessionApi'

// Define types locally since rrweb exports are complex
export interface eventWithTime {
  type: number
  data: unknown
  timestamp: number
}

export interface RecordOptions {
  recordCanvas?: boolean
  recordCrossOriginIframes?: boolean
  recordAfter?: number
  recordBefore?: number
  sampling?: {
    scroll?: number
    mouseInteraction?: boolean
    input?: "all" | "last"
    media?: number
    mousemove?: number | boolean
    canvas?: number | "all"
  }
  emit?: (event: eventWithTime) => void
}

export interface RecordingSession {
  id: string
  startTime: string
  endTime?: string
  events: eventWithTime[]
  duration?: number
}

export interface UseRecordingOptions {
  autoStart?: boolean
  recordCanvas?: boolean
  recordCrossOriginIframes?: boolean
  recordAfter?: number
  recordBefore?: number
  sampling?: {
    scroll?: number
    mouseInteraction?: boolean
    input?: "all" | "last"
    media?: number
    mousemove?: number | boolean
    canvas?: number | "all"
  }
}

export function useRrwebRecording(options: UseRecordingOptions = {}) {
  const [isRecording, setIsRecording] = useState(false)
  const [currentSession, setCurrentSession] = useState<RecordingSession | null>(null)
  const [sessions, setSessions] = useState<RecordingSession[]>([])
  const stopRecordingRef = useRef<(() => void) | null>(null)
  const eventsRef = useRef<eventWithTime[]>([])

  // Get session ID from localStorage
    const sessionId = useMemo(() => {
      const storedSession = localStorage.getItem('teacherSession')
      if (storedSession) {
        const session = JSON.parse(storedSession)
        return session?.session?._id || session._id || session.id || null
      }
      return null
    }, [])
    
    // Fetch sections for current session
    const { data: sectionsData } = useGetSectionsBySessionQuery(sessionId || '', {
      skip: !sessionId,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
    })

    // console.log("sectionsData",sectionsData)

  const defaultOptions: RecordOptions = {
    recordCanvas: options.recordCanvas ?? true,
    recordCrossOriginIframes: options.recordCrossOriginIframes ?? false,
    recordAfter: options.recordAfter ?? 0,
    recordBefore: options.recordBefore ?? 0,
    sampling: {
      scroll: options.sampling?.scroll ?? 10,
      mouseInteraction: options.sampling?.mouseInteraction ?? true,
      input: options.sampling?.input ?? "all",
      media: options.sampling?.media ?? 10,
      mousemove: options.sampling?.mousemove ?? 5,
      canvas: options.sampling?.canvas ?? 10,
    },
  }

  const startRecording = useCallback(() => {
    if (isRecording) return

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const startTime = new Date().toISOString()
    
    // Clear previous events
    eventsRef.current = []

    const stopFn = record({
      ...defaultOptions,
      emit(event) {
        eventsRef.current.push(event)
        
        // Log mouse events for debugging
        if (event.type === 2 || event.type === 3 || event.type === 4) { // Mouse events
          console.log('Mouse event captured:', {
            type: event.type,
            timestamp: event.timestamp,
            data: event.data
          })
        }
      },
    })

    stopRecordingRef.current = stopFn || null
    setIsRecording(true)
    
    const newSession: RecordingSession = {
      id: sessionId,
      startTime,
      events: [],
    }
    
    setCurrentSession(newSession)
    
    // Save to localStorage (guarded)
    if (typeof window !== 'undefined') {
      try {
        const existingSessions = JSON.parse(localStorage.getItem('rrweb_sessions') || '[]')
        existingSessions.push(newSession)
        localStorage.setItem('rrweb_sessions', JSON.stringify(existingSessions))
      } catch (e) {
        try {
          // Fallback: store just the new session list
          localStorage.setItem('rrweb_sessions', JSON.stringify([newSession]))
        } catch (e2) {
          // As a last resort, clear the key to avoid throwing
          console.warn('RRWeb: unable to initialize rrweb_sessions in storage')
          try { localStorage.removeItem('rrweb_sessions') } catch {}
        }
      }
    }
  }, [isRecording, defaultOptions])

  const stopRecording = useCallback(() => {
    if (!isRecording || !stopRecordingRef.current) return

    stopRecordingRef.current()
    stopRecordingRef.current = null
    setIsRecording(false)

    const endTime = new Date().toISOString()
    const duration = eventsRef.current.length > 0 
      ? eventsRef.current[eventsRef.current.length - 1].timestamp - eventsRef.current[0].timestamp
      : 0

    const completedSession: RecordingSession = {
      ...currentSession!,
      endTime,
      events: [...eventsRef.current],
      duration,
    }

    console.log('RRWeb: Recording stopped, events captured:', eventsRef.current.length)
    console.log('RRWeb: Completed session:', completedSession)

    setCurrentSession(completedSession)
    
    // Update localStorage with safeguards against quota exceeded
    if (typeof window !== 'undefined') {
      const existingSessions = JSON.parse(localStorage.getItem('rrweb_sessions') || '[]')
      const updatedSessions = existingSessions.map((session: RecordingSession) => 
        session.id === completedSession.id ? completedSession : session
      )
      try {
        localStorage.setItem('rrweb_sessions', JSON.stringify(updatedSessions))
        setSessions(updatedSessions)
      } catch (e) {
        console.warn('RRWeb: localStorage quota exceeded, truncating events and retrying')
        // Fallback: truncate events to reduce size and retry
        const MAX_EVENTS = 1000
        const slimCompleted: RecordingSession = {
          ...completedSession,
          events: completedSession.events.slice(-MAX_EVENTS),
        }
        const slimUpdated = existingSessions.map((session: RecordingSession) => 
          session.id === completedSession.id ? slimCompleted : session
        )
        try {
          localStorage.setItem('rrweb_sessions', JSON.stringify(slimUpdated))
          localStorage.setItem('rrweb_sessions_truncated', '1')
          setSessions(slimUpdated)
        } catch (e2) {
          console.warn('RRWeb: Failed to persist even truncated sessions; clearing storage fallback')
          // Last resort: try to store only current slim session
          try {
            localStorage.setItem('rrweb_sessions', JSON.stringify([slimCompleted]))
          } catch (e3) {
            // Give up on storage; keep in memory only
            console.warn('RRWeb: Unable to persist rrweb_sessions at all; keeping in memory')
          }
          setSessions([slimCompleted])
        }
      }
    }
  }, [isRecording, currentSession])

  const saveSession = useCallback((session: RecordingSession) => {
    if (typeof window === 'undefined') return

    try {
      const existingSessions = JSON.parse(localStorage.getItem('rrweb_sessions') || '[]')
      const updatedSessions = [...existingSessions, session]
      localStorage.setItem('rrweb_sessions', JSON.stringify(updatedSessions))
      setSessions(updatedSessions)
    } catch (e) {
      // Fallback: store only last one, and if fails, keep memory only
      try {
        localStorage.setItem('rrweb_sessions', JSON.stringify([session]))
      } catch (e2) {
        console.warn('RRWeb: saveSession failed to persist; keeping in memory')
      }
      setSessions((prev) => [...prev, session])
    }
  }, [])

  const loadSessions = useCallback(() => {
    if (typeof window === 'undefined') return

    const savedSessions = JSON.parse(localStorage.getItem('rrweb_sessions') || '[]')
    setSessions(savedSessions)
  }, [])

  const clearSessions = useCallback(() => {
    if (typeof window === 'undefined') return

    localStorage.removeItem('rrweb_sessions')
    setSessions([])
    setCurrentSession(null)
  }, [])

  // Expose a synchronous snapshot of the current events buffer
  const getEventsSnapshot = useCallback((): eventWithTime[] => {
    return [...eventsRef.current]
  }, [])

  // Build a completed session snapshot from current refs (for immediate consumers)
  const buildCompletedSessionSnapshot = useCallback((): RecordingSession | null => {
    if (!currentSession) return null
    const endTime = new Date().toISOString()
    const evts = [...eventsRef.current]
    const duration = evts.length > 0 
      ? evts[evts.length - 1].timestamp - evts[0].timestamp
      : 0
    return {
      id: currentSession.id,
      startTime: currentSession.startTime,
      endTime,
      events: evts,
      duration,
    }
  }, [currentSession])

  const exportSession = useCallback((sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId)
    if (!session) return null

    const dataStr = JSON.stringify(session.events, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `rrweb_session_${sessionId}.json`
    link.click()
    
    URL.revokeObjectURL(url)
  }, [sessions])

  // Auto-start recording if enabled
  useEffect(() => {
    if (options.autoStart) {
      startRecording()
    }
  }, [options.autoStart, startRecording])

  // Load sessions on mount
  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRecording && stopRecordingRef.current) {
        stopRecordingRef.current()
      }
    }
  }, [isRecording])

  return {
    isRecording,
    currentSession,
    sessions,
    startRecording,
    stopRecording,
    saveSession,
    loadSessions,
    clearSessions,
    exportSession,
    getEventsSnapshot,
    buildCompletedSessionSnapshot,
  }
}
