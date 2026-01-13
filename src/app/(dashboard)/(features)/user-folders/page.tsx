'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
 
  File, 
  Folder, 
  FolderOpen,
  Search,
  Download,
 
  Eye,
  Users,
  BookOpen,
  GraduationCap,
 
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  
  Play,
  Pause,
  Pen,
  LogOut,
  
} from 'lucide-react'
import { useAuth } from '@/context/auth-context'
import { useToast } from '@/hooks/use-toast'
import { ReactPdfViewer } from '@/components/react-pdf-viewer'
import { RrwebRecordingControls } from '@/components/rrweb-recording-controls'
import { RrwebSessionViewer } from '@/components/rrweb-session-viewer'
import { CanvasAnnotation } from '@/components/canvas-annotation'
import { useRrwebRecording } from '@/hooks/use-rrweb-recording'
import { 
  useGetFoldersQuery,
  useGetSubfoldersQuery,
  useGetStudentFoldersQuery,
  useGetStudentSubfoldersQuery,
  Folder as FolderType,
} from '@/store/api/folderApi'
import {
  useGetFilesByFolderQuery,
  useGetFileByIdQuery,
  useCreateFileMutation,
  useUpdateFileMutation,
  useDeleteFileMutation,
  FileItem,

  FileUploadProgress
} from '@/store/api/fileApi'
import { useUpdateTeacherSessionMutation, useGetSectionsBySessionQuery } from '@/store/api/teacherSessionApi'
import { useLogoutMutation } from '@/store/api/authApi'
import { useRouter } from 'next/navigation'



export default function UserFoldersPage() {
  const { isAuthenticated, isLoading: authLoading, user, logout } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [logoutMutation, { isLoading: isLoggingOut }] = useLogoutMutation()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [selectedVideoFile, setSelectedVideoFile] = useState<FileItem | null>(null)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [selectedPdfFile, setSelectedPdfFile] = useState<FileItem | null>(null)
  const [isPdfRecording, setIsPdfRecording] = useState(false)
  const [pdfRecordingSession, setPdfRecordingSession] = useState<any>(null)
  const [recordingPdfInfo, setRecordingPdfInfo] = useState<{src: string, type: string} | null>(null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [selectedImageFile, setSelectedImageFile] = useState<FileItem | null>(null)
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null)
  const [isImageRecording, setIsImageRecording] = useState(false)
  const [imageRecordingSession, setImageRecordingSession] = useState<any>(null)
  const [recordingImageInfo, setRecordingImageInfo] = useState<{src: string, type: string} | null>(null)
  const [isSessionViewerOpen, setIsSessionViewerOpen] = useState(false)
  const [selectedSection, setSelectedSection] = useState<any>(null)

  console.log(isUploading)
  
  // Get session ID from localStorage
  const sessionId = useMemo(() => {
    const storedSession = localStorage.getItem('teacherSession')
    if (storedSession) {
      const session = JSON.parse(storedSession)
      return session?.session?._id || session._id || session.id || null
    }
    return null
  }, [])
  
  // Fetch sections for current session (only for teachers, not students)
  const { data: sectionsData, isLoading: isSectionsLoading } = useGetSectionsBySessionQuery(sessionId || '', {
    skip: !sessionId || user?.role === 'student',
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  })
  
  // console.log('Fetched sectionsData from API:', sectionsData)
  const [isVideoRecording, setIsVideoRecording] = useState(false)
  const [videoRecordingSession, setVideoRecordingSession] = useState<any>(null)
  const [recordingVideoInfo, setRecordingVideoInfo] = useState<{src: string, type: string} | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // RRWeb recording for video fullscreen sessions
  const {
    isRecording: isRrwebRecording,
    currentSession: rrwebCurrentSession,
    sessions: rrwebSessions,
    startRecording: startRrwebRecording,
    stopRecording: stopRrwebRecording,
    saveSession: saveRrwebSession,
    buildCompletedSessionSnapshot,
  } = useRrwebRecording({
    autoStart: false,
    recordCanvas: true,
    sampling: {
      scroll: 10,           // More frequent scroll recording
      mouseInteraction: true,
      input: "all",
      media: 10,
      mousemove: 5,         // More frequent mouse movement recording
      canvas: 10,
    }
  })

  console.log(isRrwebRecording, rrwebCurrentSession, rrwebSessions,saveRrwebSession)

  // PDF Recording Hook
  const {
    isRecording: isPdfRecordingActive,
    currentSession: pdfCurrentSession,
    sessions: pdfSessions,
    startRecording: startPdfRecording,
    stopRecording: stopPdfRecording,
    saveSession: savePdfSession,
  } = useRrwebRecording({
    autoStart: false,
    recordCanvas: true,
    sampling: {
      scroll: 10,
      mouseInteraction: true,
      input: "all",
      media: 10,
      mousemove: 5,
      canvas: 10,
    }
  })

  // RRWeb recording for Image fullscreen sessions
  const {
    isRecording: isImageRrwebRecording,
    currentSession: imageCurrentSession,
    sessions: imageSessions,
    startRecording: startImageRecording,
    stopRecording: stopImageRecording,
    saveSession: saveImageSession,
  } = useRrwebRecording({
    autoStart: false,
    recordCanvas: true,
    sampling: {
      scroll: 10,
      mouseInteraction: true,
      input: "all",
      media: 10,
      mousemove: 5,
      canvas: 10,
    }
  })

  // Video activity tracking state
  const [videoActiveTime, setVideoActiveTime] = useState(0)
  const [videoIdleTime, setVideoIdleTime] = useState(0)
  const [videoStartTime, setVideoStartTime] = useState<number | null>(null)
  const [videoPlayStartTime, setVideoPlayStartTime] = useState<number | null>(null)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [videoTotalOpenTime, setVideoTotalOpenTime] = useState(0)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [showCanvas, setShowCanvas] = useState(false)
  const [canvasData, setCanvasData] = useState<string | null>(null)
  const [canvasWidth, setCanvasWidth] = useState(800)
  const [canvasHeight, setCanvasHeight] = useState(400)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser' | 'clear'>('pen')
  const [pdfContainerRect, setPdfContainerRect] = useState<DOMRect | null>(null)
  const videoContainerRef = useRef<HTMLDivElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const pdfContainerRef = useRef<HTMLDivElement | null>(null)
  const imageContainerRef = useRef<HTMLDivElement | null>(null)
  
  // File open tracking
  const [fileOpenStartTime, setFileOpenStartTime] = useState<number | null>(null)
  const [currentOpenedFile, setCurrentOpenedFile] = useState<FileItem | null>(null)
  
  // Mouse movement tracking for Image/PDF (idle/active time calculation)
  const [lastMouseMoveTime, setLastMouseMoveTime] = useState<number | null>(null)
  const [mouseActiveTime, setMouseActiveTime] = useState(0) // Accumulated time when mouse is moving
  const [mouseIdleTime, setMouseIdleTime] = useState(0) // Accumulated time when mouse is not moving
  const [mouseActiveStartTime, setMouseActiveStartTime] = useState<number | null>(null) // When mouse movement started
  const [mouseIdleStartTime, setMouseIdleStartTime] = useState<number | null>(null) // When mouse idle period started
  const MOUSE_IDLE_THRESHOLD = 2000 // 2 seconds of no movement = idle

  // Load video activity data from localStorage
  useEffect(() => {
    const savedVideoActiveTime = localStorage.getItem('videoActiveTime')
    const savedVideoIdleTime = localStorage.getItem('videoIdleTime')
    const savedVideoTotalOpenTime = localStorage.getItem('videoTotalOpenTime')
    
    if (savedVideoActiveTime) {
      setVideoActiveTime(parseInt(savedVideoActiveTime))
    }
    if (savedVideoIdleTime) {
      setVideoIdleTime(parseInt(savedVideoIdleTime))
    }
    if (savedVideoTotalOpenTime) {
      setVideoTotalOpenTime(parseInt(savedVideoTotalOpenTime))
    }
  }, [])

  // Save video activity data to localStorage
  const saveVideoActivityToLocalStorage = () => {
    localStorage.setItem('videoActiveTime', videoActiveTime.toString())
    localStorage.setItem('videoIdleTime', videoIdleTime.toString())
    localStorage.setItem('videoTotalOpenTime', videoTotalOpenTime.toString())
    
    // Debug: Log what's being saved
    console.log('Saving to localStorage:', {
      videoActiveTime: Math.round(videoActiveTime / 1000) + 's',
      videoIdleTime: Math.round(videoIdleTime / 1000) + 's',
      videoTotalOpenTime: Math.round(videoTotalOpenTime / 1000) + 's'
    })
    
    // Save detailed video activity log
    const videoActivityLog = {
      timestamp: new Date().toISOString(),
      videoActiveTime,
      videoIdleTime,
      videoTotalOpenTime,
      isVideoPlaying,
      sessionId: rrwebCurrentSession?.id || 'unknown'
    }
    
    const existingLogs = JSON.parse(localStorage.getItem('videoActivityLogs') || '[]')
    existingLogs.push(videoActivityLog)
    
    // Keep only last 100 entries
    if (existingLogs.length > 100) {
      existingLogs.splice(0, existingLogs.length - 100)
    }
    
    localStorage.setItem('videoActivityLogs', JSON.stringify(existingLogs))
  }

  // Handle video play event
  const handleVideoPlay = () => {
    const now = Date.now()
    setIsVideoPlaying(true)
    setVideoPlayStartTime(now)
    
    // Start RRWeb recording when video starts playing
    if (!isVideoRecording) {
      setIsVideoRecording(true)
      startRrwebRecording()
      console.log('Video started playing - RRWeb recording started')
    }
    
    console.log('Video started playing - Active time tracking started')
  }

  // Handle video pause event
  const handleVideoPause = () => {
    const now = Date.now()
    if (isVideoPlaying && videoPlayStartTime) {
      const playDuration = now - videoPlayStartTime
      setVideoActiveTime(prev => {
        const newActiveTime = prev + playDuration
        console.log('Video paused - Added', Math.round(playDuration / 1000), 'seconds to active time. Total active time:', Math.round(newActiveTime / 1000), 'seconds')
        // Save immediately when active time changes
        setTimeout(() => saveVideoActivityToLocalStorage(), 100)
        return newActiveTime
      })
    }
    setIsVideoPlaying(false)
    setVideoPlayStartTime(null)
    // Do NOT stop RRWeb recording on pause; keep it running during pause
    // Recording will stop when the modal closes
  }

  // Handle video modal open
  const handleVideoModalOpen = () => {
    const now = Date.now()
    setVideoStartTime(now)
    console.log('Video modal opened - Total time tracking started')
  }

  // Handle video modal close
  const handleVideoModalClose = async () => {
    const now = Date.now()
    
    // Capture rrweb session with events BEFORE stopping/clearing
    let capturedRrwebSession: any = null
    if (isVideoRecording) {
      // Capture current session state before stopping (has events in memory)
      if (rrwebCurrentSession && Array.isArray(rrwebCurrentSession.events) && rrwebCurrentSession.events.length > 0) {
        capturedRrwebSession = rrwebCurrentSession
        console.log('Captured rrweb session BEFORE stop with', capturedRrwebSession.events.length, 'events')
      } else if (Array.isArray(rrwebSessions) && rrwebSessions.length > 0) {
        const lastSession = rrwebSessions[rrwebSessions.length - 1]
        if (Array.isArray(lastSession?.events) && lastSession.events.length > 0) {
          capturedRrwebSession = lastSession
          console.log('Captured last rrweb session BEFORE stop with', capturedRrwebSession.events.length, 'events')
        }
      }
      
      setIsVideoRecording(false)
      stopRrwebRecording()
      console.log('Modal closing - RRWeb recording stopped')
      // Give rrweb a moment to flush events into localStorage and update state
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Re-check hook state after delay (in case it updated)
      if (!capturedRrwebSession || !capturedRrwebSession.events?.length) {
        const snapshot = buildCompletedSessionSnapshot?.()
        if (snapshot && Array.isArray(snapshot.events) && snapshot.events.length > 0) {
          capturedRrwebSession = snapshot
          console.log('Captured rrweb session AFTER stop via snapshot with', capturedRrwebSession.events.length, 'events')
        } else if (rrwebCurrentSession && Array.isArray(rrwebCurrentSession.events) && rrwebCurrentSession.events.length > 0) {
          capturedRrwebSession = rrwebCurrentSession
          console.log('Captured rrweb session AFTER stop with', capturedRrwebSession.events.length, 'events')
        }
      }
      
      // Log hook state for debugging
      console.log('After stop - rrwebCurrentSession events:', rrwebCurrentSession?.events?.length || 0)
      console.log('After stop - rrwebSessions count:', rrwebSessions?.length || 0)
      console.log('Captured session events:', capturedRrwebSession?.events?.length || 0)
    }
    
    if (videoStartTime) {
      const currentSessionOpenTime = now - videoStartTime
      
      // Add current session open time to cumulative total
      setVideoTotalOpenTime(prev => prev + currentSessionOpenTime)
      
      // If video was playing when modal closes, add the remaining play time
      if (isVideoPlaying && videoPlayStartTime) {
        const remainingPlayTime = now - videoPlayStartTime
        setVideoActiveTime(prev => prev + remainingPlayTime)
        console.log('Video was playing when closed - Added remaining play time:', Math.round(remainingPlayTime / 1000), 'seconds')
      }
      
      // Calculate idle time for this session: Current session open time - Active time
      const currentActiveTime = isVideoPlaying && videoPlayStartTime ? 
        videoActiveTime + (now - videoPlayStartTime) : 
        videoActiveTime
      
      const currentSessionIdleTime = currentSessionOpenTime - currentActiveTime
      setVideoIdleTime(prev => prev + currentSessionIdleTime)
      
      console.log('Video modal closed - Current session open time:', Math.round(currentSessionOpenTime / 1000), 'seconds')
      console.log('Video active time for this session:', Math.round(currentActiveTime / 1000), 'seconds')
      console.log('Video idle time for this session:', Math.round(currentSessionIdleTime / 1000), 'seconds')
      console.log('Total cumulative idle time:', Math.round((videoIdleTime + currentSessionIdleTime) / 1000), 'seconds')
    }
    setVideoStartTime(null)
    setIsVideoPlaying(false)
    setVideoPlayStartTime(null)
    setCanvasData(null)
    setCurrentTool('pen')
    setShowCanvas(false) // Reset canvas state when modal closes
    
    // Save data to localStorage BEFORE reading from it
    saveVideoActivityToLocalStorage()
    
    // Now read from localStorage and update session with file info
    if (currentOpenedFile && fileOpenStartTime) {
      console.log("file modal close")
      const fileOpenDuration = now - fileOpenStartTime
      await updateFileOpenTime(currentOpenedFile, fileOpenDuration, capturedRrwebSession)
      console.log("file modal close after")
      // Clear rrweb sessions after saving to backend
      localStorage.setItem('rrweb_sessions', '[]')
    }
    
    setFileOpenStartTime(null)
    setCurrentOpenedFile(null)
    
      // Reset video tracking state for next video
      setVideoActiveTime(0)
      setVideoIdleTime(0)
      setVideoTotalOpenTime(0)
      
      // Reset localStorage for next video
      localStorage.setItem('videoActiveTime', '0')
      localStorage.setItem('videoIdleTime', '0')
      localStorage.setItem('videoTotalOpenTime', '0')
      
      // Clear rrweb sessions after saving to backend
      // localStorage.setItem('rrweb_sessions', '[]')
      
      console.log('Reset video tracking state and rrweb sessions for next video')
      
      // Refresh the page after modal closes
      window.location.reload()
  }
  
  // Function to update file open time in teacher session
  const updateFileOpenTime = async (file: FileItem, duration: number, capturedRrwebSession?: any) => {
    try {
      const storedSession = localStorage.getItem('teacherSession')
      if (!storedSession) {
        console.log('No teacher session found')
        return
      }
      
      const parsedSession = JSON.parse(storedSession)
      // Create a mutable copy of the session to avoid read-only property errors
      const session: any = JSON.parse(JSON.stringify(parsedSession))
      // Session can have _id directly or be nested in a session property
      const sessionId = session?.session?._id || session._id || session.id
      
      if (!sessionId) {
        console.log('No session ID found. Session object:', session)
        return
      }
      
      // Ensure arrays are mutable
      if (!session.fileAccessLog || !Array.isArray(session.fileAccessLog)) {
        session.fileAccessLog = []
      } else {
        session.fileAccessLog = [...session.fileAccessLog]
      }
      if (!session.section || !Array.isArray(session.section)) {
        session.section = []
      } else {
        session.section = [...session.section]
      }
      
      // Deduplicate fileAccessLog entries BEFORE processing (remove duplicates from localStorage/backend)
      if (session.fileAccessLog && Array.isArray(session.fileAccessLog) && session.fileAccessLog.length > 0) {
        const dedupByIdMap = new Map<string, any>()
        const logsWithoutId: any[] = []
        
        session.fileAccessLog.forEach((log: any) => {
          if (log && log._id) {
            const existing = dedupByIdMap.get(log._id)
            if (!existing) {
              dedupByIdMap.set(log._id, log)
            } else {
              // Keep the more complete entry
              const existingHasClosed = !!existing.closedAt
              const currentHasClosed = !!log.closedAt
              const existingDur = existing.duration || 0
              const currentDur = log.duration || 0
              if (
                (currentHasClosed && !existingHasClosed) ||
                (currentHasClosed === existingHasClosed && currentDur >= existingDur)
              ) {
                dedupByIdMap.set(log._id, log)
              }
            }
          } else if (log) {
            logsWithoutId.push(log)
          }
        })
        
        // Deduplicate by fileId+openedAt as well
        const allLogs = [...Array.from(dedupByIdMap.values()), ...logsWithoutId]
        const dedupByKeyMap = new Map<string, any>()
        allLogs.forEach((log: any) => {
          const key = `${log.fileId}_${log.openedAt}`
          const existing = dedupByKeyMap.get(key)
          if (!existing) {
            dedupByKeyMap.set(key, log)
          } else {
            // Prefer entry with _id, closedAt, longer duration
            const existingHasId = !!existing._id
            const currentHasId = !!log._id
            const existingHasClosed = !!existing.closedAt
            const currentHasClosed = !!log.closedAt
            const existingDur = existing.duration || 0
            const currentDur = log.duration || 0
            
            if (
              (currentHasId && !existingHasId) ||
              (currentHasId === existingHasId && currentHasClosed && !existingHasClosed) ||
              (currentHasId === existingHasId && currentHasClosed === existingHasClosed && currentDur >= existingDur)
            ) {
              dedupByKeyMap.set(key, log)
            }
          }
        })
        
        session.fileAccessLog = Array.from(dedupByKeyMap.values())
        console.log('Deduplicated fileAccessLog from session - before:', allLogs.length, 'after:', session.fileAccessLog.length)
      }
      
      // console.log('=== UPDATE FILE OPEN TIME ===')
      // console.log('Session ID:', sessionId)
      // console.log('Current fileAccessLog entries in session:', (session.fileAccessLog || []).length)
      // console.log('Current session.fileAccessLog:', session.fileAccessLog)
      
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      
      // Check file type early (needed for rrweb session selection)
      const isImageOrPdfFile = file.mimetype?.startsWith('image/') || file.mimetype === 'application/pdf'
      
      // Get idle and active times from localStorage
      const videoIdleTime = parseInt(localStorage.getItem('videoIdleTime') || '0')
      const videoActiveTime = parseInt(localStorage.getItem('videoActiveTime') || '0')
      
      // Priority order: 1) Captured session (passed parameter), 2) Hook state (video/PDF/Image specific), 3) localStorage
      let rrwebSessionsFromStorage: any[] = []
      
      if (capturedRrwebSession && Array.isArray(capturedRrwebSession.events) && capturedRrwebSession.events.length > 0) {
        // First priority: Use captured session (most reliable, captured before stop)
        console.log('Using CAPTURED rrweb session with', capturedRrwebSession.events.length, 'events')
        rrwebSessionsFromStorage = [capturedRrwebSession]
      } else {
        // Fallback to localStorage first
        rrwebSessionsFromStorage = JSON.parse(localStorage.getItem('rrweb_sessions') || '[]')
        
        // Check if localStorage sessions have events
        const storageHasEvents = Array.isArray(rrwebSessionsFromStorage) && 
          rrwebSessionsFromStorage.some((s: any) => Array.isArray(s.events) && s.events.length > 0)
        
        // Fallback: prioritize in-memory current session if it has events, then check other sessions
        if (!storageHasEvents) {
          // For videos: check video hook sessions
          if (!isImageOrPdfFile && rrwebCurrentSession && Array.isArray((rrwebCurrentSession as any).events) && (rrwebCurrentSession as any).events.length > 0) {
            console.log('Using rrwebCurrentSession from video hook with', (rrwebCurrentSession as any).events.length, 'events')
            rrwebSessionsFromStorage = [rrwebCurrentSession]
          } 
          // For PDF: check PDF hook sessions
          else if (isImageOrPdfFile && file.mimetype === 'application/pdf' && pdfCurrentSession && Array.isArray(pdfCurrentSession.events) && pdfCurrentSession.events.length > 0) {
            console.log('Using pdfCurrentSession from PDF hook with', pdfCurrentSession.events.length, 'events')
            rrwebSessionsFromStorage = [pdfCurrentSession]
          }
          // For Image: check Image hook sessions
          else if (isImageOrPdfFile && file.mimetype?.startsWith('image/') && imageCurrentSession && Array.isArray(imageCurrentSession.events) && imageCurrentSession.events.length > 0) {
            console.log('Using imageCurrentSession from Image hook with', imageCurrentSession.events.length, 'events')
            rrwebSessionsFromStorage = [imageCurrentSession]
          }
          // Third priority: sessions array from hook (check appropriate hook based on file type)
          else if (!isImageOrPdfFile && Array.isArray(rrwebSessions) && rrwebSessions.length > 0) {
            const sessionsWithEvents = rrwebSessions.filter((s: any) => Array.isArray(s.events) && s.events.length > 0)
            if (sessionsWithEvents.length > 0) {
              console.log('Using rrwebSessions from video hook with', sessionsWithEvents.length, 'sessions')
              rrwebSessionsFromStorage = sessionsWithEvents
            }
          } else if (isImageOrPdfFile && file.mimetype === 'application/pdf' && Array.isArray(pdfSessions) && pdfSessions.length > 0) {
            const sessionsWithEvents = pdfSessions.filter((s: any) => Array.isArray(s.events) && s.events.length > 0)
            if (sessionsWithEvents.length > 0) {
              console.log('Using pdfSessions from PDF hook with', sessionsWithEvents.length, 'sessions')
              rrwebSessionsFromStorage = sessionsWithEvents
            }
          } else if (isImageOrPdfFile && file.mimetype?.startsWith('image/') && Array.isArray(imageSessions) && imageSessions.length > 0) {
            const sessionsWithEvents = imageSessions.filter((s: any) => Array.isArray(s.events) && s.events.length > 0)
            if (sessionsWithEvents.length > 0) {
              console.log('Using imageSessions from Image hook with', sessionsWithEvents.length, 'sessions')
              rrwebSessionsFromStorage = sessionsWithEvents
            }
          }
        }
      }
      
      // Log what we're using
      if (rrwebSessionsFromStorage.length > 0) {
        const totalEvents = rrwebSessionsFromStorage.reduce((sum: number, s: any) => sum + (Array.isArray(s.events) ? s.events.length : 0), 0)
        console.log('RRWeb sessions for save:', rrwebSessionsFromStorage.length, 'sessions,', totalEvents, 'total events')
      } else {
        console.warn('No rrweb sessions found with events in captured session, localStorage, or memory!')
      }
      
      // Calculate idle and active time for THIS specific file session
      // For videos: use videoActiveTime/videoIdleTime (based on play/pause)
      // For images/PDFs: use mouseActiveTime/mouseIdleTime (based on mouse movement)
      // Note: isImageOrPdfFile already declared above
      let fileIdleTime = 0
      let fileActiveTime = 0
      
      if (isImageOrPdfFile) {
        // For image/PDF: calculate based on mouse movement tracking
        const now = Date.now()
        let finalMouseActiveTime = mouseActiveTime
        let finalMouseIdleTime = mouseIdleTime
        
        // If mouse is currently active, add the current active period
        if (mouseActiveStartTime) {
          finalMouseActiveTime += (now - mouseActiveStartTime)
        }
        // If mouse is currently idle, add the current idle period
        else if (mouseIdleStartTime) {
          finalMouseIdleTime += (now - mouseIdleStartTime)
        }
        // If neither is set but file was open, treat as idle
        else if (fileOpenStartTime) {
          finalMouseIdleTime = duration // Entire duration is idle if no mouse tracking
        }
        
        fileIdleTime = finalMouseIdleTime
        fileActiveTime = finalMouseActiveTime
        
        console.log('Image/PDF mouse tracking - Active:', Math.round(fileActiveTime / 1000) + 's', 'Idle:', Math.round(fileIdleTime / 1000) + 's')
      } else {
        // For videos: use video tracking
        fileIdleTime = videoIdleTime
        fileActiveTime = videoActiveTime
      }
      
      // console.log('Adding file access log entry for file:', file._id, file.filename)
      // console.log('Existing fileAccessLog entries count:', (session.fileAccessLog || []).length)
      // console.log('RRWeb sessions from localStorage:', rrwebSessionsFromStorage.length)
      
      // Use a deterministic openedAt for this open/close window
      const openedAtString = fileOpenStartTime ? new Date(fileOpenStartTime).toISOString() : new Date().toISOString()
      
      // Find existing OPEN log (duration=0, no closedAt) for this file and openedAt to UPDATE it
      // Create a mutable copy to avoid read-only errors
      const existingLogs: any[] = Array.isArray(session.fileAccessLog) ? [...session.fileAccessLog] : []
      const logKey = `${file._id}_${openedAtString}`
      const existingOpenLogIndex = existingLogs.findIndex(
        (log) => log && `${log.fileId}_${log.openedAt}` === logKey && (log.duration === 0 || !log.closedAt)
      )
      
      let updatedFileAccessLog: any[]
      
      if (existingOpenLogIndex !== -1) {
        // UPDATE the existing open log with close data (preserve _id if it exists)
        const existingOpenLog = existingLogs[existingOpenLogIndex]
        updatedFileAccessLog = existingLogs.map((log, i) => {
          if (i === existingOpenLogIndex) {
            return {
              ...existingOpenLog, // Preserve _id and all other fields
              fileName: file.filename, // Update fileName
              openedAt: openedAtString, // Update openedAt to ensure consistency
              duration: duration,
              closedAt: new Date().toISOString(),
              idleTime: fileIdleTime,
              activeTime: fileActiveTime,
              accessedAt: new Date(), // Update accessedAt to current time
            }
          }
          return log
        })
        console.log('Updating existing open log entry at index', existingOpenLogIndex, 'with close data (including fileName and openedAt)')
      } else {
        // No open log found - create a complete entry (shouldn't happen if logFileAccess worked)
        console.warn('No open log found to update, creating complete entry')
        const newFileAccessEntry = {
          fileId: file._id,
          fileName: file.filename,
          folderId: file.folder,
          accessedAt: new Date(),
          openedAt: openedAtString,
          duration: duration,
          closedAt: new Date().toISOString(),
          idleTime: fileIdleTime,
          activeTime: fileActiveTime,
        }
        updatedFileAccessLog = [...existingLogs, newFileAccessEntry]
      }
      
      // Final deduplication: remove duplicates by _id first, then by fileId+openedAt
      // Step 1: Deduplicate by _id (most reliable identifier)
      const dedupByIdMap = new Map<string, any>()
      const logsWithoutId: any[] = []
      
      updatedFileAccessLog.forEach((log) => {
        if (log._id) {
          const existing = dedupByIdMap.get(log._id)
          if (!existing) {
            dedupByIdMap.set(log._id, log)
          } else {
            // Prefer the more complete entry (has closedAt, longer duration)
            const existingHasClosed = !!existing.closedAt
            const currentHasClosed = !!log.closedAt
            const existingDur = existing.duration || 0
            const currentDur = log.duration || 0
            if (
              (currentHasClosed && !existingHasClosed) ||
              (currentHasClosed === existingHasClosed && currentDur >= existingDur)
            ) {
              dedupByIdMap.set(log._id, log)
            }
          }
        } else {
          logsWithoutId.push(log)
        }
      })
      
      // Step 2: Combine entries with _id and without _id, then deduplicate by fileId+openedAt
      const allLogs = [...Array.from(dedupByIdMap.values()), ...logsWithoutId]
      const deduplicatedByKeyMap = new Map<string, any>()
      allLogs.forEach((log) => {
        const key = `${log.fileId}_${log.openedAt}`
        const existing = deduplicatedByKeyMap.get(key)
        if (!existing) {
          deduplicatedByKeyMap.set(key, log)
        } else {
          // Prefer the one with _id, then closedAt, then longer duration
          const existingHasId = !!existing._id
          const currentHasId = !!log._id
          const existingHasClosed = !!existing.closedAt
          const currentHasClosed = !!log.closedAt
          const existingDur = existing.duration || 0
          const currentDur = log.duration || 0
          
          if (
            (currentHasId && !existingHasId) ||
            (currentHasId === existingHasId && currentHasClosed && !existingHasClosed) ||
            (currentHasId === existingHasId && currentHasClosed === existingHasClosed && currentDur >= existingDur)
          ) {
            deduplicatedByKeyMap.set(key, log)
          }
        }
      })
      
      updatedFileAccessLog = Array.from(deduplicatedByKeyMap.values())
      
      console.log('After deduplication - fileAccessLog entries:', updatedFileAccessLog.length)
      
      // console.log('=== FILE ACCESS LOG UPDATE ===')
      // console.log('Previous fileAccessLog count:', (session.fileAccessLog || []).length)
      // console.log('Updated fileAccessLog count:', updatedFileAccessLog.length)
      // console.log('All fileAccessLog entries:', JSON.stringify(updatedFileAccessLog, null, 2))
      // console.log('New entry:', JSON.stringify(newFileAccessEntry, null, 2))
      
      // Build exactly ONE section per open/close using a deterministic id
      // Ensure we have a mutable copy
      const existingSections: any[] = Array.isArray(session.section) ? [...session.section] : []
      const deterministicSectionId = `${sessionId}_${file._id}_${openedAtString}`

      // Merge rrweb sessions overlapping [openedAt..now] for ALL file types (including image/PDF)
      // All files should save events in sections, just like videos
      const openedAtMs = fileOpenStartTime ? fileOpenStartTime : Date.now() - duration
      const nowMs = Date.now()
      const mergedEvents: any[] = []
      let mergedStart: string | null = null
      let mergedEnd: string | null = null
      
      if (rrwebSessionsFromStorage.length > 0) {
        console.log('Merging rrweb sessions for', isImageOrPdfFile ? 'Image/PDF' : 'Video', '. OpenedAt:', new Date(openedAtMs).toISOString(), 'Now:', new Date(nowMs).toISOString())
        
        rrwebSessionsFromStorage.forEach((s: any, idx: number) => {
          const sStart = s.startTime ? new Date(s.startTime).getTime() : null
          const sEnd = s.endTime ? new Date(s.endTime).getTime() : null
          const events = Array.isArray(s.events) ? s.events : []
          
          console.log(`Session ${idx}:`, {
            id: s.id,
            startTime: s.startTime,
            endTime: s.endTime,
            eventsCount: events.length,
            sStart,
            sEnd,
            openedAtMs,
            nowMs,
            overlaps: sStart && sEnd && sEnd >= openedAtMs && sStart <= nowMs
          })
          
          // Include session if it has events and overlaps with file open window (with 30s buffer for timing issues)
          const BUFFER_MS = 30000
          if (events.length > 0 && sStart && sEnd) {
            // More lenient overlap check with buffer
            if (sEnd >= (openedAtMs - BUFFER_MS) && sStart <= (nowMs + BUFFER_MS)) {
              mergedEvents.push(...events)
              mergedStart = mergedStart ? (sStart < new Date(mergedStart).getTime() ? s.startTime : mergedStart) : s.startTime
              mergedEnd = mergedEnd ? (sEnd > new Date(mergedEnd).getTime() ? s.endTime : mergedEnd) : s.endTime
              console.log(`  -> Included ${events.length} events from session ${idx}`)
            } else {
              console.log(`  -> Excluded session ${idx} (no overlap)`)
            }
          } else if (events.length === 0) {
            console.warn(`  -> Session ${idx} has no events, skipping`)
          }
        })
        
        // Final fallback: if nothing merged but we still have sessions with events,
        // concatenate all events and derive start/end from them so DB never gets empty events
        if (mergedEvents.length === 0) {
          const sessionsWithEvents = rrwebSessionsFromStorage.filter((s: any) => Array.isArray(s.events) && s.events.length > 0)
          if (sessionsWithEvents.length > 0) {
            let minStart: number | null = null
            let maxEnd: number | null = null
            for (const s of sessionsWithEvents) {
              const sStart = s.startTime ? new Date(s.startTime).getTime() : null
              const sEnd = s.endTime ? new Date(s.endTime).getTime() : null
              if (sStart && (minStart === null || sStart < minStart)) minStart = sStart
              if (sEnd && (maxEnd === null || sEnd > maxEnd)) maxEnd = sEnd
              mergedEvents.push(...(Array.isArray(s.events) ? s.events : []))
            }
            if (minStart) mergedStart = new Date(minStart).toISOString()
            if (maxEnd) mergedEnd = new Date(maxEnd).toISOString()
            console.warn('Fallback merge used: concatenated events from in-memory/local sessions. Total events:', mergedEvents.length)
          }
        }
      } else {
        console.warn('No rrweb sessions found for', isImageOrPdfFile ? 'Image/PDF' : 'Video')
      }
      
      // Create section for ALL file types with events (same logic for all)
      // Set start/end times
      if (!mergedStart) mergedStart = new Date(openedAtMs).toISOString()
      if (!mergedEnd) mergedEnd = new Date(nowMs).toISOString()
      const mergedDuration = Math.max(0, new Date(mergedEnd).getTime() - new Date(mergedStart).getTime())
      
      console.log('Merged result for', isImageOrPdfFile ? 'Image/PDF' : 'Video', ':', {
        totalEvents: mergedEvents.length,
        startTime: mergedStart,
        endTime: mergedEnd,
        duration: mergedDuration,
        activeTime: isImageOrPdfFile ? Math.round(fileActiveTime / 1000) + 's' : Math.round(fileActiveTime / 1000) + 's',
        idleTime: isImageOrPdfFile ? Math.round(fileIdleTime / 1000) + 's' : Math.round(fileIdleTime / 1000) + 's'
      })
      
      // Create section with events for ALL file types (videos and image/PDF both save events)
      const newSingleSection = {
        id: deterministicSectionId,
        startTime: mergedStart,
        endTime: mergedEnd,
        duration: mergedDuration,
        events: mergedEvents.map((event: any) => ({ type: event.type, data: event.data, timestamp: event.timestamp })),
      }
      
      // IMPORTANT: Only send the NEW/updated section, not the entire array
      // This prevents payload size issues and 16MB MongoDB limit errors
      // The backend will use $push with $slice to add it and maintain limits
      // Save section for ALL file types WITH events (same as videos)
      const sectionArray = [newSingleSection]
      const totalEvents = newSingleSection.events?.length || 0
      
      console.log('Sending section to backend for', isImageOrPdfFile ? 'Image/PDF' : 'Video', ':', {
        sectionId: deterministicSectionId,
        eventsCount: totalEvents,
        existingSectionsInMemory: existingSections.length
      })
      
      // Create update request - only include NEW fileAccessLog entry and NEW section
      // Backend will handle merging with existing data using MongoDB $push operators
      const updateData: any = {
        username: session.username || user.username,
        sessionToken: session.sessionToken,
        // Only send the NEW fileAccessLog entry, not entire array
        // Backend will use $push to add it and $slice to maintain limits
        fileAccessLog: updatedFileAccessLog.slice(-1), // Only last entry (the new/updated one)
        // Include section for ALL file types (with empty events array for image/PDF)
        section: sectionArray // Backend will use $push to add it
      }
      // Only include these IDs if truthy to avoid backend ObjectId cast errors
      const courseIdToSend = teacherCourseClassId || session.courseClassName
      const sectionIdToSend = teacherSectionId || session.sectionName
      const subjectIdToSend = teacherSubjectId || session.subjectName
      if (courseIdToSend) updateData.courseClassName = courseIdToSend
      if (sectionIdToSend) updateData.sectionName = sectionIdToSend
      if (subjectIdToSend) updateData.subjectName = subjectIdToSend
      
      // console.log('Update data before sending:', {
      //   username: updateData.username,
      //   courseClassName: updateData.courseClassName,
      //   sectionName: updateData.sectionName,
      //   subjectName: updateData.subjectName
      // })
      
      // Log payload size - only warn if too large, but don't truncate
      // Let backend handle truncation to ensure all valid events are saved
      let payloadSize = JSON.stringify(updateData).length
      let payloadSizeMB = (payloadSize / (1024 * 1024)).toFixed(2)
      const MAX_PAYLOAD_SIZE_MB = 9 // Max 9MB to stay under typical 10MB limits
      const MAX_PAYLOAD_SIZE_BYTES = MAX_PAYLOAD_SIZE_MB * 1024 * 1024
      
      console.log('Payload size:', payloadSizeMB, 'MB, Events:', totalEvents)
      
      // Warn if payload is large, but don't truncate - let backend handle it
      // Backend has proper truncation logic that preserves as many events as possible
      if (payloadSize > MAX_PAYLOAD_SIZE_BYTES) {
        console.warn(`Payload size (${payloadSizeMB}MB) exceeds limit, but sending all events. Backend will handle if needed.`)
        // Don't truncate - send all events and let backend handle size limits properly
      }
      
      console.log('Sending update request with data:', {
        fileAccessLogLength: updatedFileAccessLog.length,
        sectionArrayLength: sectionArray.length,
        totalEvents: sectionArray[0]?.events?.length || 0,
        payloadSizeMB,
        hasIdleActiveTime: updatedFileAccessLog.some(log => log.idleTime !== undefined && log.activeTime !== undefined)
      })
      
      const result = await updateTeacherSession({
        id: sessionId,
        data: updateData
      }).unwrap()

      console.log("Modal close with update data")
      
      // Update localStorage with the response session (result contains complete updated session)
      if (result) {
        console.log('=== BACKEND RESPONSE ===')
        console.log('Backend returned fileAccessLog entries:', (result.fileAccessLog || []).length)
        console.log('Backend returned section entries:', (result.section || []).length)
        console.log('Backend fileAccessLog data:', JSON.stringify(result.fileAccessLog, null, 2))
        
        // Create a mutable copy of result to avoid read-only property errors
        const mutableResult: any = JSON.parse(JSON.stringify(result))
        
        // Deduplicate backend response before saving to localStorage
        if (mutableResult.fileAccessLog && Array.isArray(mutableResult.fileAccessLog)) {
          const dedupByIdMap = new Map<string, any>()
          const logsWithoutId: any[] = []
          
          mutableResult.fileAccessLog.forEach((log: any) => {
            if (log && log._id) {
              const existing = dedupByIdMap.get(log._id)
              if (!existing) {
                dedupByIdMap.set(log._id, log)
              } else {
                const existingHasClosed = !!existing.closedAt
                const currentHasClosed = !!log.closedAt
                const existingDur = existing.duration || 0
                const currentDur = log.duration || 0
                if (
                  (currentHasClosed && !existingHasClosed) ||
                  (currentHasClosed === existingHasClosed && currentDur >= existingDur)
                ) {
                  dedupByIdMap.set(log._id, log)
                }
              }
            } else if (log) {
              logsWithoutId.push(log)
            }
          })
          
          const allLogs = [...Array.from(dedupByIdMap.values()), ...logsWithoutId]
          const dedupByKeyMap = new Map<string, any>()
          allLogs.forEach((log: any) => {
            const key = `${log.fileId}_${log.openedAt}`
            const existing = dedupByKeyMap.get(key)
            if (!existing) {
              dedupByKeyMap.set(key, log)
            } else {
              const existingHasId = !!existing._id
              const currentHasId = !!log._id
              const existingHasClosed = !!existing.closedAt
              const currentHasClosed = !!log.closedAt
              const existingDur = existing.duration || 0
              const currentDur = log.duration || 0
              
              if (
                (currentHasId && !existingHasId) ||
                (currentHasId === existingHasId && currentHasClosed && !existingHasClosed) ||
                (currentHasId === existingHasId && currentHasClosed === existingHasClosed && currentDur >= existingDur)
              ) {
                dedupByKeyMap.set(key, log)
              }
            }
          })
          
          mutableResult.fileAccessLog = Array.from(dedupByKeyMap.values())
          console.log('Deduplicated backend response - before:', allLogs.length, 'after:', mutableResult.fileAccessLog.length)
        }
        
        // Safely persist teacherSession without exceeding storage limits
        try {
          localStorage.setItem('teacherSession', JSON.stringify(mutableResult))
        } catch (e) {
          console.warn('localStorage quota hit while saving teacherSession. Saving compact version instead.')
          // Remove heavy rrweb events to fit into storage
          const compactSections = (mutableResult.section || []).map((sec: any) => ({
            id: sec.id,
            startTime: sec.startTime,
            endTime: sec.endTime,
            duration: sec.duration,
            eventsCount: Array.isArray(sec.events) ? sec.events.length : 0,
          }))
          const compactSession = {
            ...mutableResult,
            section: compactSections,
          }
          try {
            localStorage.setItem('teacherSession', JSON.stringify(compactSession))
          } catch (e2) {
            console.error('Failed to store compact teacherSession; storing minimal metadata only.')
            const minimal = {
              id: (mutableResult as any)?.session?._id || (mutableResult as any)?._id || (mutableResult as any)?.id,
              fileAccessLogCount: (mutableResult.fileAccessLog || []).length,
              sectionCount: (mutableResult.section || []).length,
              lastSavedAt: new Date().toISOString(),
            }
            try {
              localStorage.setItem('teacherSession', JSON.stringify(minimal))
            } catch (e3) {
              // As a last resort, skip persisting to localStorage
              console.error('Unable to persist teacherSession to localStorage at all. Proceeding without cache.')
            }
          }
        }
        // Ensure rrweb_sessions are cleared after a successful save to avoid re-sending
        try { localStorage.setItem('rrweb_sessions', '[]') } catch {}
        console.log('Updated localStorage with backend response (safe mode)')
        console.log('localStorage now has fileAccessLog entries:', (mutableResult.fileAccessLog || []).length)
      }
      
      console.log('File access updated in fileAccessLog array:', {
        fileId: file._id,
        fileName: file.filename,
        duration: Math.round(duration / 1000) + 's',
        idleTime: Math.round(fileIdleTime / 1000) + 's',
        activeTime: Math.round(fileActiveTime / 1000) + 's',
        closedAt: new Date().toISOString()
      })
    } catch (error: any) {
      console.error('Error updating file open time:', error)
      console.error('Error details:', {
        message: error?.message,
        data: error?.data,
        status: error?.status,
        error: error?.error
      })
      
      // Log the full error response if available
      if (error?.data) {
        console.error('Backend error response:', JSON.stringify(error.data, null, 2))
      }
      
      // Show error to user with more details
      const errorMessage = error?.data?.message || error?.data?.error || error?.message || "Failed to update session data"
      toast({
        title: "Session Update Failed",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  // Update video total open time and calculate idle time every second when modal is open
  useEffect(() => {
    if (videoStartTime && isVideoModalOpen) {
      const interval = setInterval(() => {
        const now = Date.now()
        setCurrentTime(now) // Update current time for UI refresh
        
        const currentOpenTime = now - videoStartTime
        
        // Calculate current active time
        let currentActiveTime = videoActiveTime
        if (isVideoPlaying && videoPlayStartTime) {
          currentActiveTime = videoActiveTime + (now - videoPlayStartTime)
        }
        
        // Calculate current idle time
        const currentIdleTime = currentOpenTime - currentActiveTime
        
        // Update states - don't accumulate during session, just track current session
        setVideoIdleTime(prev => {
          // Calculate the idle time for this session only
          const sessionIdleTime = currentOpenTime - currentActiveTime
          return sessionIdleTime
        })
        
        // Save to localStorage every second for real-time persistence
        saveVideoActivityToLocalStorage()
        
        console.log('Real-time update - Open time:', Math.round(currentOpenTime / 1000), 's, Active time:', Math.round(currentActiveTime / 1000), 's, Idle time:', Math.round(currentIdleTime / 1000), 's')
      }, 1000)
      
      return () => clearInterval(interval)
    }
  }, [videoStartTime, isVideoModalOpen, videoActiveTime, isVideoPlaying, videoPlayStartTime])

  // Save to localStorage whenever active or idle time changes
  useEffect(() => {
    if (videoActiveTime > 0 || videoIdleTime > 0) {
      saveVideoActivityToLocalStorage()
    }
  }, [videoActiveTime, videoIdleTime])

  // Save data when component unmounts or page is about to unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveVideoActivityToLocalStorage()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // Save data when component unmounts
      saveVideoActivityToLocalStorage()
    }
  }, [videoActiveTime, videoIdleTime, videoTotalOpenTime])

  // Mouse idle detection for Image/PDF - check every second if mouse is idle
  useEffect(() => {
    if ((isImageModalOpen || isPdfModalOpen) && fileOpenStartTime) {
      const interval = setInterval(() => {
        const now = Date.now()
        
        // If mouse hasn't moved in threshold time, mark as idle
        if (lastMouseMoveTime && (now - lastMouseMoveTime) > MOUSE_IDLE_THRESHOLD) {
          // Mouse is now idle
          if (mouseActiveStartTime) {
            // Transition from active to idle - add active period
            setMouseActiveTime(prev => prev + (now - mouseActiveStartTime))
            setMouseActiveStartTime(null)
            setMouseIdleStartTime(now)
          } else if (!mouseIdleStartTime) {
            // Start idle period if not already idle
            setMouseIdleStartTime(now)
          }
        }
      }, 1000) // Check every second
      
      return () => clearInterval(interval)
    }
  }, [isImageModalOpen, isPdfModalOpen, fileOpenStartTime, lastMouseMoveTime, mouseActiveStartTime, mouseIdleStartTime])

  // Export video activity data
  const exportVideoActivityData = () => {
    const videoActivityData = {
      timestamp: new Date().toISOString(),
      videoActiveTime: getTotalActiveTime(),
      videoIdleTime: getTotalIdleTime(),
      videoTotalOpenTime,
      isVideoPlaying,
      sessionId: rrwebCurrentSession?.id || 'unknown',
      videoActivityLogs: JSON.parse(localStorage.getItem('videoActivityLogs') || '[]'),
      // Additional metrics
      currentSessionOpenTime: videoStartTime ? Date.now() - videoStartTime : 0,
      isModalOpen: isVideoModalOpen,
      currentSessionIdleTime: getCurrentIdleTime() - videoIdleTime
    }
    
    const blob = new Blob([JSON.stringify(videoActivityData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `video-activity-data-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Clear video activity data
  const clearVideoActivityData = () => {
    localStorage.removeItem('videoActiveTime')
    localStorage.removeItem('videoIdleTime')
    localStorage.removeItem('videoTotalOpenTime')
    localStorage.removeItem('videoActivityLogs')
    setVideoActiveTime(0)
    setVideoIdleTime(0)
    setVideoTotalOpenTime(0)
  }

  // Calculate current idle time for display
  const getCurrentIdleTime = () => {
    // If modal is closed, return the cumulative idle time
    if (!videoStartTime || !isVideoModalOpen) return videoIdleTime
    
    const now = Date.now()
    const currentOpenTime = now - videoStartTime
    
    // Calculate current active time
    let currentActiveTime = videoActiveTime
    if (isVideoPlaying && videoPlayStartTime) {
      currentActiveTime = videoActiveTime + (now - videoPlayStartTime)
    }
    
    // Calculate current idle time for this session
    const currentSessionIdleTime = currentOpenTime - currentActiveTime
    
    // Return cumulative idle time (previous sessions + current session)
    return videoIdleTime + Math.max(0, currentSessionIdleTime)
  }

  // Calculate current total open time for display
  const getCurrentTotalOpenTime = () => {
    if (!videoStartTime) return videoTotalOpenTime
    
    const now = Date.now()
    const currentOpenTime = now - videoStartTime
    return currentOpenTime // Return current session open time, not cumulative
  }

  // Get total cumulative idle time across all sessions
  const getTotalIdleTime = () => {
    return videoIdleTime
  }

  // Get total cumulative active time across all sessions
  const getTotalActiveTime = () => {
    return videoActiveTime
  }

  // Canvas annotation functions
  const handleCanvasSave = (imageData: string) => {
    setCanvasData(imageData)
    console.log('Canvas annotation saved:', imageData.substring(0, 50) + '...')
  }

  const toggleCanvas = () => {
    setShowCanvas(!showCanvas)
    console.log('Canvas toggled:', !showCanvas)
    console.log('Canvas state:', showCanvas)
  }

  const clearCanvasData = () => {
    setCanvasData(null)
  }

  // PDF error handler
  const handlePdfError = (error: Error) => {
    console.error('PDF Error in modal:', error)
    setPdfError(error.message)
  }

  // Reset canvas state when modals are closed
  const handleModalClose = (setModalOpen: (open: boolean) => void) => {
    setModalOpen(false)
    setCanvasData(null)
  }

  // Update canvas width based on window size
  useEffect(() => {
    const updateCanvasWidth = () => {
      const baseWidth = Math.min(1200, window.innerWidth - 80)
      setCanvasWidth(baseWidth)
      // Try to match current container height if available
      const activeContainer = videoContainerRef.current || pdfContainerRef.current || imageContainerRef.current
      if (activeContainer) {
        const rect = activeContainer.getBoundingClientRect()
        setCanvasHeight(Math.max(200, Math.min(800, Math.floor(rect.height))))
      }
    }
    
    updateCanvasWidth()
    window.addEventListener('resize', updateCanvasWidth)
    
    return () => window.removeEventListener('resize', updateCanvasWidth)
  }, [])

  // Update PDF container rect on scroll and resize for fixed canvas positioning
  useEffect(() => {
    if (!isPdfModalOpen || !pdfContainerRef.current) {
      setPdfContainerRect(null)
      return
    }

    const updateRect = () => {
      if (pdfContainerRef.current) {
        const rect = pdfContainerRef.current.getBoundingClientRect()
        setPdfContainerRect(rect)
      }
    }

    // Initial update
    updateRect()

    // Update on scroll (listen to scroll events on the inner PDF viewer scrollable container)
    const innerScrollContainer = document.querySelector('.pdf-container')
    if (innerScrollContainer) {
      innerScrollContainer.addEventListener('scroll', updateRect, { passive: true })
    }
    
    // Update on window resize and scroll
    window.addEventListener('resize', updateRect)
    window.addEventListener('scroll', updateRect, { passive: true })
    
    // Update periodically to catch any position changes
    const interval = setInterval(updateRect, 50)

    return () => {
      if (innerScrollContainer) {
        innerScrollContainer.removeEventListener('scroll', updateRect)
      }
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect)
      clearInterval(interval)
    }
  }, [isPdfModalOpen])

  // Cleanup fullscreen event listeners when modal closes
  // Video modal management
  useEffect(() => {
    if (isVideoModalOpen && selectedVideoFile) {
      console.log('Video modal opened for:', selectedVideoFile.filename);
      setShowCanvas(false) // Hide canvas by default for video
    }
  }, [isVideoModalOpen, selectedVideoFile])

  // PDF Fullscreen change handler
  // PDF modal management
  useEffect(() => {
    if (isPdfModalOpen && selectedPdfFile) {
      console.log('PDF modal opened for:', selectedPdfFile.filename);
      setShowCanvas(false) // Hide canvas by default for PDF - user clicks button to show it
    }
  }, [isPdfModalOpen, selectedPdfFile]);

  // Image modal management
  useEffect(() => {
    if (isImageModalOpen && selectedImageFile) {
      console.log('Image modal opened for:', selectedImageFile.filename);
      setShowCanvas(false) // Hide canvas by default for image
    }
  }, [isImageModalOpen, selectedImageFile]);

  // Load image as blob when image modal opens to avoid MIME/header issues
  useEffect(() => {
    const loadImageBlob = async () => {
      if (!isImageModalOpen || !selectedImageFile) return
      try {
        const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/files/serve/${encodeURIComponent(selectedImageFile.filename)}`
        const response = await fetch(url)
        if (!response.ok) {
          console.error('Image fetch failed:', response.status, response.statusText)
          setImageObjectUrl(null)
          return
        }
        const blob = await response.blob()
        const objectUrl = URL.createObjectURL(blob)
        setImageObjectUrl(objectUrl)
      } catch (err) {
        console.error('Image fetch error:', err)
        setImageObjectUrl(null)
      }
    }

    loadImageBlob()

    return () => {
      if (imageObjectUrl) {
        URL.revokeObjectURL(imageObjectUrl)
      }
      setImageObjectUrl(null)
    }
  }, [isImageModalOpen, selectedImageFile])

  // Fullscreen detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(document.fullscreenElement || 
                          (document as any).webkitFullscreenElement || 
                          (document as any).mozFullScreenElement || 
        (document as any).msFullscreenElement);
      
      setIsFullscreen(isCurrentlyFullscreen)
      console.log('Fullscreen state changed:', isCurrentlyFullscreen)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [])

  // Handle recording session completion
  useEffect(() => {
    console.log('RRWeb: Current session changed:', rrwebCurrentSession);
    if (rrwebCurrentSession && rrwebCurrentSession.events && rrwebCurrentSession.events.length > 0) {
      console.log('Recording session completed:', rrwebCurrentSession);
      console.log('Events in session:', rrwebCurrentSession.events.length);
      
      // Add video info to the session
      const sessionWithVideo = {
        ...rrwebCurrentSession,
        videoInfo: recordingVideoInfo
      };
      
      console.log('Session with video info:', sessionWithVideo);
      console.log('Recording video info:', recordingVideoInfo);
      
      setVideoRecordingSession(sessionWithVideo);
      
      // Show toast notification
      toast({
        title: "Screen Recording Complete",
        description: `Recorded ${rrwebCurrentSession.events.length} events during video playback`,
      });
    } else if (rrwebCurrentSession) {
      console.log('Recording session completed but no events:', rrwebCurrentSession);
    }
  }, [rrwebCurrentSession, toast, recordingVideoInfo])

  // Handle PDF recording session completion
  useEffect(() => {
    console.log('PDF RRWeb: Current session changed:', pdfCurrentSession);
    if (pdfCurrentSession && pdfCurrentSession.events && pdfCurrentSession.events.length > 0) {
      console.log('PDF Recording session completed:', pdfCurrentSession);
      console.log('PDF Events in session:', pdfCurrentSession.events.length);
      
      // Add PDF info to the session
      const sessionWithPdf = {
        ...pdfCurrentSession,
        pdfInfo: recordingPdfInfo
      };
      
      console.log('Session with PDF info:', sessionWithPdf);
      console.log('Recording PDF info:', recordingPdfInfo);
      
      setPdfRecordingSession(sessionWithPdf);
      
      // Show toast notification
      toast({
        title: "PDF Screen Recording Complete",
        description: `Recorded ${pdfCurrentSession.events.length} events during PDF viewing`,
      });
    } else if (pdfCurrentSession) {
      console.log('PDF Recording session completed but no events:', pdfCurrentSession);
    }
  }, [pdfCurrentSession, toast, recordingPdfInfo])

  // Handle Image recording session completion
  useEffect(() => {
    console.log('Image RRWeb: Current session changed:', imageCurrentSession);
    if (imageCurrentSession && imageCurrentSession.events && imageCurrentSession.events.length > 0) {
      console.log('Image Events in session:', imageCurrentSession.events.length);
      
      // Add Image info to the session
      const sessionWithImage = {
        ...imageCurrentSession,
        imageInfo: recordingImageInfo
      };
      
      console.log('Session with Image info:', sessionWithImage);
      console.log('Recording Image info:', recordingImageInfo);
      
      setImageRecordingSession(sessionWithImage);
      
      // Show toast notification
      toast({
        title: "Image Screen Recording Complete",
        description: `Recorded ${imageCurrentSession.events.length} events during Image viewing`,
      });
    } else if (imageCurrentSession) {
      console.log('Image Recording session completed but no events:', imageCurrentSession);
    }
  }, [imageCurrentSession, toast, recordingImageInfo])

  // Get teacher's assigned class, section, and subject from localStorage (for teachers)
  const teacherCourseClassId = typeof window !== 'undefined' ? localStorage.getItem('courseclass') : null
  const teacherSectionId = typeof window !== 'undefined' ? localStorage.getItem('section') : null
  const teacherSubjectId = typeof window !== 'undefined' ? localStorage.getItem('subject') : null
  
  // Get student's class and section from user object (for students)
  const studentCourseClassId = user?.role === 'student' 
    ? (typeof user.courseClass === 'object' ? user.courseClass._id : user.courseClass)
    : null
  const studentSectionId = user?.role === 'student'
    ? (typeof user.section === 'object' ? user.section._id : user.section)
    : null
  
  // Build query params for folder filtering
  const folderQueryParams = useMemo(() => {
    // For students: filter by class and section only (no subject)
    if (user?.role === 'student') {
      if (!studentCourseClassId || !studentSectionId) return undefined
      
      return {
        courseClass: studentCourseClassId,
        section: studentSectionId
        // No subject for students
      }
    }
    
    // For teachers: filter by class, section, and subject
    if (!teacherCourseClassId || !teacherSectionId || !teacherSubjectId) return undefined
    
    return {
      courseClass: teacherCourseClassId,
      section: teacherSectionId,
      subject: teacherSubjectId
    }
  }, [user?.role, studentCourseClassId, studentSectionId, teacherCourseClassId, teacherSectionId, teacherSubjectId])
  
  // Determine skip condition based on user role
  const shouldSkipFolders = useMemo(() => {
    if (!isAuthenticated || authLoading) return true
    
    if (user?.role === 'student') {
      return !studentCourseClassId || !studentSectionId
    }
    
    // For teachers
    return !teacherCourseClassId || !teacherSectionId || !teacherSubjectId
  }, [isAuthenticated, authLoading, user?.role, studentCourseClassId, studentSectionId, teacherCourseClassId, teacherSectionId, teacherSubjectId])
  
  // API hooks - get folders filtered by user's assigned class/section (and subject for teachers)
  // Use student-specific endpoints for students, regular endpoints for teachers
  const isStudent = user?.role === 'student'
  
  const { data: teacherFolders = [], isLoading: isLoadingTeacherFolders, error: teacherFoldersError, refetch: refetchTeacherFolders } = useGetFoldersQuery(folderQueryParams, {
    skip: shouldSkipFolders || isStudent,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  })
  
  const { data: studentFolders = [], isLoading: isLoadingStudentFolders, error: studentFoldersError, refetch: refetchStudentFolders } = useGetStudentFoldersQuery(undefined, {
    skip: shouldSkipFolders || !isStudent,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  })
  
  // Combine folders based on role
  const folders = isStudent ? studentFolders : teacherFolders
  const isLoading = isStudent ? isLoadingStudentFolders : isLoadingTeacherFolders
  const error = isStudent ? studentFoldersError : teacherFoldersError
  const refetchFolders = isStudent ? refetchStudentFolders : refetchTeacherFolders
  
  // console.log('Folder query params:', folderQueryParams)
  // console.log('folders data:', folders);
  
  const { data: teacherSubfolders = [], isLoading: isLoadingTeacherSubfolders, refetch: refetchTeacherSubfolders } = useGetSubfoldersQuery(selectedFolder!, {
    skip: !isAuthenticated || authLoading || !selectedFolder || isStudent,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  })
  
  const { data: studentSubfolders = [], isLoading: isLoadingStudentSubfolders, refetch: refetchStudentSubfolders } = useGetStudentSubfoldersQuery(selectedFolder!, {
    skip: !isAuthenticated || authLoading || !selectedFolder || !isStudent,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  })
  
  // Combine subfolders based on role
  const subfolders = isStudent ? studentSubfolders : teacherSubfolders
  const isLoadingSubfolders = isStudent ? isLoadingStudentSubfolders : isLoadingTeacherSubfolders
  const refetchSubfolders = isStudent ? refetchStudentSubfolders : refetchTeacherSubfolders

  // File API hooks
  const { data: folderFiles = [], isLoading: isLoadingFolderFiles } = useGetFilesByFolderQuery(selectedFolder!, {
    skip: !isAuthenticated || authLoading || !selectedFolder,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  })
  const [createFile, { isLoading: isCreatingFile }] = useCreateFileMutation()
  const [updateFile, { isLoading: isUpdatingFile }] = useUpdateFileMutation()
  const [deleteFile, { isLoading: isDeletingFile }] = useDeleteFileMutation()

  // Teacher session update mutation
  const [updateTeacherSession] = useUpdateTeacherSessionMutation()

  // Get specific file data for modals
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const { data: modalFileData, isLoading: isLoadingModalFile } = useGetFileByIdQuery(selectedFileId || '', {
    skip: !selectedFileId,
    refetchOnMountOrArgChange: true,
  })

  // Debug logging
  // console.log('User Folders - folders data:', folders)
  // console.log('User Folders - subfolders data:', subfolders)
  // console.log('User Folders - selectedFolder:', selectedFolder)
  // console.log('User Folders - user role:', user?.role)

  // Filter folders based on search term (simplified for users)
  const filteredFolders = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return folders.filter(folder => 
      folder.folderName.toLowerCase().includes(term) ||
      folder.courseClass?.name.toLowerCase().includes(term) ||
      folder.section?.name.toLowerCase().includes(term) ||
      folder.subject?.name.toLowerCase().includes(term)
    )
  }, [folders, searchTerm])

  // Get folders for the current view (root folders or subfolders)
  const currentFolders = useMemo(() => {
    if (selectedFolder) {
      return subfolders
    }
    return filteredFolders.filter(folder => !folder.parent)
  }, [filteredFolders, subfolders, selectedFolder])

  // No static files - files should only appear in their assigned folders

  // Get files for the selected folder
  const currentFiles = useMemo(() => {
    if (!selectedFolder) return []
    return folderFiles || []
  }, [folderFiles, selectedFolder])

  // Get parent folder path
  const getParentPath = (folderId: string): string[] => {
    const folder = folders.find(f => f._id === folderId)
    if (!folder || !folder.parent) return [folderId]
    return [...getParentPath(folder.parent), folderId]
  }

  const getFolderPath = (): FolderType[] => {
    if (!selectedFolder) return []
    const pathIds = getParentPath(selectedFolder)
    return pathIds.map(id => folders.find(f => f._id === id)!).filter(Boolean)
  }

  const handleViewFile = async (file: FileItem) => {
    // console.log('Opening file:', file)
    // console.log('File path:', file.path)
    // console.log('Full URL:', `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${file.path}`)
    
    // Track file open time
    setFileOpenStartTime(Date.now())
    setCurrentOpenedFile(file)
    
    // Set selected file ID for modal data
    setSelectedFileId(file._id)
    
    if (file.mimetype.startsWith('video/')) {
      setSelectedVideoFile(file)
      setVideoError(null)
      setIsVideoModalOpen(true)
      handleVideoModalOpen()
    } else if (file.mimetype === 'application/pdf') {
      setSelectedPdfFile(file)
      setPdfError(null) // Clear any previous PDF errors
      setIsPdfModalOpen(true)
      // Start recording immediately for PDF
      setRecordingPdfInfo({
        src: file.path,
        type: file.mimetype
      });
      startPdfRecording();
      setIsPdfRecording(true);
      // PDF modal opened - no auto fullscreen
    } else if (file.mimetype.startsWith('image/')) {
      setSelectedImageFile(file)
      setIsImageModalOpen(true)
      // Start recording immediately for Image
      setRecordingImageInfo({
        src: file.path,
        type: file.mimetype
      });
      startImageRecording();
      setIsImageRecording(true);
    } else if (file.mimetype.includes('spreadsheet') || file.mimetype.includes('excel') || file.filename.endsWith('.xlsx') || file.filename.endsWith('.xls')) {
      // Handle Excel files - open in new tab for now
      const serveUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/files/serve/${encodeURIComponent(file.filename)}`
      window.open(serveUrl, '_blank')
    }
    
    console.log("File view opened for:", file.filename)
  }
  
  // Function to log file access to teacher session
  const logFileAccess = async (file: FileItem) => {
    console.log("inside logFileAccess")
    try {
      const storedSession = localStorage.getItem('teacherSession')
      if (!storedSession) {
        console.log('No teacher session found')
        return
      }
      
      const session = JSON.parse(storedSession)
      const sessionId = session?.session?._id || session.id || session._id
      
      if (!sessionId) {
        console.log('No session ID found. Session object:', session)
        return
      }
      
      console.log('Logging file access for session ID:', sessionId)
      
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      
      // Use a deterministic openedAt for this file open
      const openedAtString = fileOpenStartTime ? new Date(fileOpenStartTime).toISOString() : new Date().toISOString()
      
      // Check if there's already an OPEN log (duration=0, no closedAt) for this file and openedAt
      const existingLogs: any[] = session.fileAccessLog || []
      const logKey = `${file._id}_${openedAtString}`
      const existingOpenLog = existingLogs.find(
        (log) => `${log.fileId}_${log.openedAt}` === logKey && (log.duration === 0 || !log.closedAt)
      )
      
      // Only create a new open log if one doesn't exist
      if (existingOpenLog) {
        console.log('Open log already exists for this file and openedAt, skipping duplicate')
        return
      }
      
      // Prepare file access log entry with open time
      const newFileAccessLog = {
        fileId: file._id,
        fileName: file.filename,
        folderId: file.folder,
        accessedAt: new Date(), // Date object, not string
        openedAt: openedAtString,
        duration: 0 // Will be updated when file is closed
      }
      
      // Create update request - append only if no open log exists
      const updateData = {
        username: session.username || user.username,
        courseClassName:teacherCourseClassId|| session.courseClassName || '',
        sectionName:teacherSectionId || session.sectionName || '',
        subjectName:teacherSubjectId || session.subjectName || '',
        sessionToken: session.sessionToken,
        fileAccessLog: [...existingLogs, newFileAccessLog]
      }
      
      const result = await updateTeacherSession({
        id: sessionId,
        data: updateData
      }).unwrap()
      
      // Update localStorage with the response session
      if (result) {
        localStorage.setItem('teacherSession', JSON.stringify(result))
        console.log('Updated localStorage with new session data')
      }
      
      // console.log('File access logged successfully with open time:', newFileAccessLog.openedAt)
    } catch (error) {
      console.error('Error logging file access:', error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    if (!selectedFolder) {
      toast({
        title: "No Folder Selected",
        description: "Please select a folder before uploading files.",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    const progressItems: FileUploadProgress[] = files.map(file => ({
      file,
      progress: 0,
      status: 'uploading'
    }))
    setUploadProgress(progressItems)

    try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
        // Update progress
        setUploadProgress(prev => 
          prev.map((item, index) => 
            index === i ? { ...item, progress: 25 } : item
          )
        )

        // Upload file using API
        const result = await createFile({
          file,
          folder: selectedFolder,
          allowedUsers: []
        }).unwrap()

        // Update progress
      setUploadProgress(prev => 
        prev.map((item, index) => 
            index === i ? { ...item, progress: 100, status: 'completed' } : item
          )
        )

        console.log('File uploaded successfully:', result)
      }

      toast({
        title: "Upload Complete",
        description: `Successfully uploaded ${files.length} file(s)`,
      })
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: "Upload Failed",
        description: "Failed to upload files. Please try again.",
        variant: "destructive",
      })
      
      // Mark all as error
      setUploadProgress(prev => 
        prev.map(item => ({ ...item, status: 'error' }))
      )
    } finally {
    setIsUploading(false)
      setTimeout(() => setUploadProgress([]), 2000)
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      }
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Handle logout
  const handleLogout = async () => {
    try {
      await logoutMutation().unwrap()
      logout()
      toast({
        title: 'Logged out successfully',
        description: 'You have been logged out of your account.',
      })
      router.push('/auth/sign-in')
    } catch (error: any) {
      // Even if the API call fails, we should still logout locally
      logout()
      toast({
        title: 'Logged out',
        description: 'You have been logged out of your account.',
      })
      router.push('/auth/sign-in')
    }
  }

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith('video/')) return '🎥'
    if (mimetype.startsWith('audio/')) return '🎵'
    if (mimetype.includes('pdf')) return '📄'
    if (mimetype.includes('word') || mimetype.includes('document')) return '📝'
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return '📊'
    if (mimetype.includes('image/')) return '🖼️'
    return '📁'
  }

  const renderGridView = () => {
    const allItems = [
      ...currentFolders.map(folder => ({ ...folder, type: 'folder' as const })),
      ...currentFiles.map(file => ({ ...file, type: 'file' as const }))
    ]

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {allItems.map((item) => {
          if (item.type === 'folder') {
            const folder = item as FolderType & { type: 'folder' }
            return (
              <Card key={folder._id} className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Folder className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm font-medium truncate">
                        {folder.folderName}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent 
                  className="pt-0 cursor-pointer"
                  onClick={() => setSelectedFolder(folder._id)}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <BookOpen className="h-3 w-3" />
                      {folder.courseClass?.name || 'No Class'}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {folder.section?.name || 'No Section'}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <GraduationCap className="h-3 w-3" />
                      {folder.subject?.name || 'No Subject'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          } else {
            const file = item as FileItem & { type: 'file' }
            return (
              <Card key={file._id} className="hover:shadow-md transition-shadow group">
                <CardHeader className="pb-3">
                  <div className="flex justify-between">
                    <div className="flex gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg h-12">
                        <span className="text-2xl">{getFileIcon(file.mimetype)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-medium truncate" title={file.filename}>
                          {file.filename.length > 10 ? `${file.filename.slice(0, 10)}...` : file.filename}
                        </CardTitle>
                        <div className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </div>
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewFile(file)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(file.uploadedAt).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {file.owner?.username || 'Unknown'}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <File className="h-3 w-3" />
                      {file.mimetype}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          }
        })}
      </div>
    )
  }

  const renderListView = () => {
    const allItems = [
      ...currentFolders.map(folder => ({ ...folder, type: 'folder' as const })),
      ...currentFiles.map(file => ({ ...file, type: 'file' as const }))
    ]

    return (
      <div className="space-y-2">
        {allItems.map((item) => {
          if (item.type === 'folder') {
            const folder = item as FolderType & { type: 'folder' }
            return (
              <Card key={folder._id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Folder className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <div className="font-medium">{folder.folderName}</div>
                        <div className="text-sm text-muted-foreground">
                          {folder.courseClass?.name} • {folder.section?.name} • {folder.subject?.name}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedFolder(folder._id)}
                      >
                        <FolderOpen className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          } else {
            const file = item as FileItem & { type: 'file' }
            return (
              <Card key={file._id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{getFileIcon(file.mimetype)}</span>
                      <div className="flex-1">
                        <div className="font-medium" title={file.filename}>
                          {file.filename.length > 10 ? `${file.filename.slice(0, 10)}...` : file.filename}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {file.owner?.username || 'Unknown'} • {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {file.mimetype}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewFile(file)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const link = document.createElement('a')
                          link.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/files/serve/${encodeURIComponent(file.filename)}`
                          link.download = file.filename
                          link.click()
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          }
        })}
      </div>
    )
  }

  // Show loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    )
  }

  if (isLoading || (selectedFolder && isLoadingSubfolders)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {selectedFolder ? 'Loading subfolders...' : 'Loading folders...'}
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error loading folders: {JSON.stringify(error)}</p>
          <Button onClick={() => refetchFolders()}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Folders</h1>
          {/* <p className="text-muted-foreground">
            View and access your assigned folders and files
          </p> */}
        </div>
        <div className="flex items-center gap-2">
          {/* <Button
            variant="outline"
            onClick={() => {
              refetchFolders()
              if (selectedFolder) {
                refetchSubfolders()
              }
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button> */}
          <Button
            variant="outline"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? 'List View' : 'Grid View'}
          </Button>
          {/* Logout button - only show on root page (when selectedFolder is null) */}
          {!selectedFolder && (
            <Button
              variant="destructive"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </Button>
          )}
        </div>
      </div>

        {/* Session Information */}
        {/* <UserSessionInfo /> */}

      

        {/* Activity Recording Controls */}
        {/* <RrwebRecordingControls 
          onViewSession={(session) => {
            setSelectedSection(session)
            setIsSessionViewerOpen(true)
          }}
          sectionsData={sectionsData}
          isSectionsLoading={isSectionsLoading}
        /> */}

        {/* Video Recording Status */}
        {isVideoRecording && (
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">
                    Recording Video Session
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Screen recording is active
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Video Recording Session Viewer */}
        {videoRecordingSession && (
          <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">
                      Video Session Recorded
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      {videoRecordingSession.events.length} events captured
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedSection(videoRecordingSession)
                    setIsSessionViewerOpen(true)
                  }}
                >
                  View Recording
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PDF Recording Status */}
        {isPdfRecording && (
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">
                    PDF Screen Recording Active
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Recording user interactions with PDF
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Image Recording Status */}
        {isImageRecording && (
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">
                    Image Screen Recording Active
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Recording user interactions with Image
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PDF Recording Session Viewer */}
        {pdfRecordingSession && (
          <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">
                      PDF Session Recorded
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      {pdfRecordingSession.events.length} events captured
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedSection(pdfRecordingSession)
                    setIsSessionViewerOpen(true)
                  }}
                >
                  View Recording
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Image Recording Session Viewer */}
        {imageRecordingSession && (
          <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">
                      Image Session Recorded
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      {imageRecordingSession.events.length} events captured
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedSection(imageRecordingSession)
                    setIsSessionViewerOpen(true)
                  }}
                >
                  View Recording
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Breadcrumb */}
      {selectedFolder && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFolder(null)}
            >
              <Folder className="h-4 w-4 mr-1" />
              Root
            </Button>
            {getFolderPath().map((folder, index) => (
              <div key={folder._id} className="flex items-center gap-2">
                <span>/</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFolder(folder._id)}
                >
                  {folder.folderName}
                </Button>
              </div>
            ))}
          </div>
          {/* <div className="flex items-center gap-2">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              size="sm"
              variant="outline"
            >
              <Upload className="mr-2 h-4 w-4" />
              {isUploading ? 'Uploading...' : 'Upload Files'}
            </Button>
          </div> */}
        </div>
      )}

      {/* Search - Simple search for users */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search folders and files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Uploading Files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {uploadProgress.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">{item.file.name}</span>
                  <span className="text-muted-foreground">
                    {item.status === 'uploading' && `${item.progress}%`}
                    {item.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {item.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                  </span>
                </div>
                <Progress value={item.progress} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileUpload}
        className="hidden"
        accept="*/*"
      />

      {/* Folders List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {selectedFolder ? 'Contents' : 'Folders & Files'} ({currentFolders.length + currentFiles.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {currentFolders.length === 0 && currentFiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {selectedFolder ? 'No contents found' : 'No folders or files found'}
            </div>
          ) : (
            viewMode === 'grid' ? renderGridView() : renderListView()
          )}
        </CardContent>
      </Card>

      {/* Video Modal */}
      <Dialog open={isVideoModalOpen}         onOpenChange={(open) => {
          if (!open) {
            handleVideoModalClose()
          }
          setIsVideoModalOpen(open)
        }}>
        <DialogContent className="max-w-[98vw] max-h-[98vh] w-full h-full overflow-y-auto">
         
            <DialogTitle className="flex items-center justify-between w-full">
              {/* {selectedVideoFile?.filename} */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const v = videoRef.current
                    if (v) {
                      v.play().catch(() => {})
                    }
                  }}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Play
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const v = videoRef.current
                    if (v) {
                      v.pause()
                    }
                  }}
                >
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </Button>
              </div>
              <Button
                variant={showCanvas ? "default" : "outline"}
                size="sm"
                onClick={toggleCanvas}
              >
                <Pen className="h-4 w-4 mr-1" />
                {showCanvas ? "Hide" : "Draw"}
              </Button>
            </DialogTitle>
           
          <div className="flex-1 min-h-0">
            {isLoadingModalFile ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading video...</p>
                </div>
              </div>
            ) : (modalFileData || selectedVideoFile) && (
              <div ref={videoContainerRef} className="relative w-full h-[85vh] flex items-center justify-center video-container">
                {videoError ? (
                  <div className="text-center p-8">
                    <div className="text-red-500 mb-4">
                      <p className="text-lg font-semibold">Video Error</p>
                      <p className="text-sm">{videoError}</p>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>Video URL: {`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/files/serve/${encodeURIComponent((modalFileData || selectedVideoFile)?.filename || '')}`}</p>
                      <p>Try opening the video in a new tab or check if the file exists.</p>
                    </div>
                    <div className="mt-4 space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const file = modalFileData || selectedVideoFile
                          if (file) {
                            window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/files/serve/${encodeURIComponent(file.filename)}`, '_blank')
                          }
                        }}
                      >
                        Open in New Tab
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setVideoError(null)}
                      >
                        Try Again
                      </Button>
                    </div>
                  </div>
                ) : (modalFileData || selectedVideoFile) && (
                  <div className="relative w-full h-full video-container">
                    <video
                      ref={videoRef}
                  controls
                      className="w-full h-auto max-h-[80vh] rounded-lg"
                  preload="metadata"
                      playsInline
                      crossOrigin="anonymous"
                  autoPlay
                      onError={(e) => {
                        console.error('Video load error:', e)
                        console.error('Video src (original):', `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${(modalFileData || selectedVideoFile)?.path}`)
                        console.error('Video src (encoded):', `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${encodeURI((modalFileData || selectedVideoFile)?.path || '')}`)
                        console.error('Video src (serve endpoint):', `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/files/serve/${encodeURIComponent((modalFileData || selectedVideoFile)?.filename || '')}`)
                        console.error('Video element:', e.target)
                        console.error('Error details:', e.nativeEvent)
                        console.error('Video error code:', e.currentTarget.error?.code)
                        console.error('Video error message:', e.currentTarget.error?.message)
                        console.error('Network state:', e.currentTarget.networkState)
                        console.error('Ready state:', e.currentTarget.readyState)
                        
                        const errorCode = e.currentTarget.error?.code
                        const errorMessage = e.currentTarget.error?.message
                        const networkState = e.currentTarget.networkState
                        const readyState = e.currentTarget.readyState
                        
                        let errorText = `Video failed to load. Error ${errorCode}: ${errorMessage || 'Unknown error'}`
                        if (networkState === 3) {
                          errorText += ' (Network error - possible CORS issue)'
                        }
                        if (readyState === 0) {
                          errorText += ' (No data loaded)'
                        }
                        
                        setVideoError(errorText)
                      }}
                      onLoadStart={() => {
                        console.log('Video load started')
                      }}
                      onLoadedMetadata={(e) => {
                        console.log('Video metadata loaded')
                        console.log('Video duration:', e.currentTarget.duration)
                        console.log('Video dimensions:', e.currentTarget.videoWidth, 'x', e.currentTarget.videoHeight)
                      }}
                      onCanPlay={() => {
                        console.log('Video can play')
                      }}
                      onCanPlayThrough={(e) => {
                        console.log('Video can play through')
                        // Try to play the video automatically
                        const video = e.currentTarget
                        video.play().then(() => {
                          console.log('Video auto-play started successfully')
                        }).catch((playError) => {
                          console.log('Auto-play failed:', playError.message)
                        })
                      }}
                      onLoadedData={() => {
                        console.log('Video data loaded')
                      }}
                      onPlay={() => {
                        console.log('Video started playing')
                        handleVideoPlay()
                      }}
                      onPause={() => {
                        console.log('Video paused')
                        handleVideoPause()
                      }}
                      onEnded={() => {
                        console.log('Video ended')
                        handleVideoPause()
                      }}
                      onSeeked={() => {
                        console.log('Video seeked')
                        // Pause active time tracking during seek
                        if (isVideoPlaying) {
                          handleVideoPause()
                        }
                      }}
                      onWaiting={() => {
                        console.log('Video waiting for data')
                      }}
                      onStalled={() => {
                        console.log('Video stalled')
                      }}
                      onSuspend={() => {
                        console.log('Video suspended')
                      }}
                    >
                      <source 
                        src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/files/serve/${encodeURIComponent((modalFileData || selectedVideoFile)?.filename || '')}`} 
                        type={(modalFileData || selectedVideoFile)?.mimetype} 
                      />
                      <source 
                        src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/files/serve/${encodeURIComponent((modalFileData || selectedVideoFile)?.filename || '')}`} 
                        type="video/mp4" 
                      />
                  Your browser does not support the video tag.
                </video>

                {/* Canvas overlay on video for drawing */}
                {showCanvas && (
                  <div className="absolute inset-0 z-[100]">
                      <CanvasAnnotation
                        width={canvasWidth}
                        height={canvasHeight}
                        onSave={handleCanvasSave}
                        className="w-full h-full"
                      />
              </div>
            )}
                    
                    {videoError && (
                      <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded-lg">
                        <p className="text-sm text-red-600">
                          <strong>Error:</strong> {videoError}
                        </p>
                        <p className="text-sm text-red-600 mt-2">
                          Try opening the video directly: <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/files/serve/${encodeURIComponent((modalFileData || selectedVideoFile)?.filename || '')}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            Open Video
                          </a>
                        </p>
                      </div>
                    )}
                    
                  </div>
                )}
              </div>
            )}
            
            
            <div className="flex items-center justify-between text-sm text-muted-foreground mt-4">
              <div className="flex items-center gap-4">
                <span>{selectedVideoFile?.filename}</span>
                {/* <span>Uploaded: {(modalFileData || selectedVideoFile) && new Date((modalFileData || selectedVideoFile)!.uploadedAt).toLocaleDateString()}</span> */}
              </div>
              {/* <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const file = modalFileData || selectedVideoFile
                    if (file) {
                      const link = document.createElement('a')
                      link.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5010'}/api/v1/files/serve/${encodeURIComponent(file.filename)}`
                      link.download = file.filename
                      link.click()
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div> */}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Modal */}
      <Dialog open={isPdfModalOpen} onOpenChange={async (open) => {
        if (!open) {
          // Capture rrweb session BEFORE stopping/clearing (same as video)
          let capturedRrwebSession: any = null
          
          // Try to get session from hook state first
          if (pdfCurrentSession && Array.isArray(pdfCurrentSession.events) && pdfCurrentSession.events.length > 0) {
            capturedRrwebSession = pdfCurrentSession
            console.log('Captured PDF rrweb session BEFORE stop with', capturedRrwebSession.events.length, 'events')
          } else if (Array.isArray(pdfSessions) && pdfSessions.length > 0) {
            const lastSession = pdfSessions[pdfSessions.length - 1]
            if (lastSession && Array.isArray(lastSession.events) && lastSession.events.length > 0) {
              capturedRrwebSession = lastSession
              console.log('Captured last PDF rrweb session BEFORE stop with', capturedRrwebSession.events.length, 'events')
            }
          }
          
          // Stop recording
          if (isPdfRecordingActive) {
            stopPdfRecording()
            await new Promise(resolve => setTimeout(resolve, 150))
          }
          
          // Try to get session after stopping if we didn't capture it before
          if (!capturedRrwebSession || !capturedRrwebSession.events?.length) {
            // Try localStorage
            try {
              const storedSessions = JSON.parse(localStorage.getItem('rrweb_sessions') || '[]')
              if (Array.isArray(storedSessions) && storedSessions.length > 0) {
                const sessionWithEvents = storedSessions.find((s: any) => Array.isArray(s.events) && s.events.length > 0)
                if (sessionWithEvents) {
                  capturedRrwebSession = sessionWithEvents
                  console.log('Captured PDF rrweb session AFTER stop from localStorage with', capturedRrwebSession.events.length, 'events')
                }
              }
            } catch (e) {
              console.warn('Failed to read rrweb sessions from localStorage:', e)
            }
          }
          
          // Finalize mouse tracking before closing
          const now = Date.now()
          if (mouseActiveStartTime) {
            setMouseActiveTime(prev => prev + (now - mouseActiveStartTime))
            setMouseActiveStartTime(null)
          } else if (!mouseIdleStartTime && lastMouseMoveTime && (now - lastMouseMoveTime) > MOUSE_IDLE_THRESHOLD) {
            // Mouse has been idle, add the idle period
            setMouseIdleTime(prev => prev + (now - lastMouseMoveTime))
          }
          
          // Update session when PDF modal closes - pass captured session
          if (currentOpenedFile && fileOpenStartTime) {
            const fileOpenDuration = Date.now() - fileOpenStartTime
            await updateFileOpenTime(currentOpenedFile, fileOpenDuration, capturedRrwebSession)
            localStorage.setItem('rrweb_sessions', '[]')
          }
          
          // Reset mouse tracking
          setLastMouseMoveTime(null)
          setMouseActiveTime(0)
          setMouseIdleTime(0)
          setMouseActiveStartTime(null)
          setMouseIdleStartTime(null)
          
          setFileOpenStartTime(null)
          setCurrentOpenedFile(null)
          setCanvasData(null)
          setShowCanvas(false) // Reset canvas state when modal closes
          setIsPdfRecording(false)
          
          // Refresh the page after modal closes
          window.location.reload()
        } else {
          // Initialize mouse tracking when modal opens
          setLastMouseMoveTime(Date.now())
          setMouseActiveTime(0)
          setMouseIdleTime(0)
          setMouseActiveStartTime(Date.now()) // Start as active when opening
          setMouseIdleStartTime(null)
        }
        setIsPdfModalOpen(open)
      }}>
        <DialogContent className="max-w-[98vw] max-h-[98vh] w-full h-full overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between w-full">
              <span>{selectedPdfFile?.filename}</span>
              <Button
                variant={showCanvas ? "default" : "outline"}
                size="sm"
                onClick={toggleCanvas}
              >
                <Pen className="h-4 w-4 mr-1" />
                {showCanvas ? "Hide" : "Draw"}
              </Button>
            </DialogTitle>
          </DialogHeader>
         
          <div className="flex-1 min-h-0">
            {isLoadingModalFile ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading PDF...</p>
                </div>
              </div>
            ) : (modalFileData || selectedPdfFile) && (
              <div className="relative w-full h-[85vh]">
                <div 
                  ref={pdfContainerRef}
                  className="w-full h-full border rounded-lg overflow-hidden relative"
                  onMouseMove={(e) => {
                    // Track mouse movement for idle/active time calculation
                    const now = Date.now()
                    
                    if (!lastMouseMoveTime || (now - lastMouseMoveTime) > MOUSE_IDLE_THRESHOLD) {
                      // Mouse just started moving (transition from idle to active)
                      if (mouseIdleStartTime) {
                        // Add the idle period that just ended
                        setMouseIdleTime(prev => prev + (now - mouseIdleStartTime))
                        setMouseIdleStartTime(null)
                      }
                      setMouseActiveStartTime(now)
                    }
                    
                    setLastMouseMoveTime(now)
                    
                    // Update canvas position when mouse moves
                    if (pdfContainerRef.current) {
                      const rect = pdfContainerRef.current.getBoundingClientRect()
                      setPdfContainerRect(rect)
                    }
                  }}
                >
                  <ReactPdfViewer
                    src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/files/serve/${encodeURIComponent((modalFileData || selectedPdfFile)?.filename || '')}`}
                    className="w-full h-full"
                    onError={handlePdfError}
                  />
                </div>
                {showCanvas && pdfContainerRect ? (
                  <div 
                    className="fixed z-[100] pointer-events-none" 
                    style={{
                      left: `${pdfContainerRect.left}px`,
                      top: `${pdfContainerRect.top}px`,
                      width: `${pdfContainerRect.width}px`,
                      height: `${pdfContainerRect.height}px`,
                    }}
                  >
                    <div className="w-full h-full pointer-events-auto">
                      <CanvasAnnotation
                        width={Math.floor(pdfContainerRect.width) || canvasWidth}
                        height={Math.floor(pdfContainerRect.height) || canvasHeight}
                        onSave={handleCanvasSave}
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            )}
            {/* Note: PDF canvas overlay is scoped inside the PDF container above */}
            
            <div className="flex items-center justify-between text-sm text-muted-foreground mt-4">
              <div className="flex items-center gap-4">
                <span> {selectedPdfFile?.filename}</span>
                {/* <span>Uploaded: {(modalFileData || selectedPdfFile) && new Date((modalFileData || selectedPdfFile)!.uploadedAt).toLocaleDateString()}</span> */}
              </div>
              {/* <div className="flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 min-w-[140px]"
                  onClick={() => {
                    const file = modalFileData || selectedPdfFile
                    if (file) {
                      window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5010'}/api/v1/files/serve/${encodeURIComponent(file.filename)}`, '_blank')
                    }
                  }}
                >
                  <Eye className="h-4 w-4" />
                  Open in New Tab
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 min-w-[100px]"
                  onClick={() => {
                    const file = modalFileData || selectedPdfFile
                    if (file) {
                      const link = document.createElement('a')
                      link.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5010'}/api/v1/files/serve/${encodeURIComponent(file.filename)}`
                      link.download = file.filename
                      link.click()
                    }
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div> */}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Modal */}
      <Dialog open={isImageModalOpen} onOpenChange={async (open) => {
        if (!open) {
          // Capture rrweb session BEFORE stopping/clearing (same as video)
          let capturedRrwebSession: any = null
          
          // Try to get session from hook state first
          if (imageCurrentSession && Array.isArray(imageCurrentSession.events) && imageCurrentSession.events.length > 0) {
            capturedRrwebSession = imageCurrentSession
            console.log('Captured Image rrweb session BEFORE stop with', capturedRrwebSession.events.length, 'events')
          } else if (Array.isArray(imageSessions) && imageSessions.length > 0) {
            const lastSession = imageSessions[imageSessions.length - 1]
            if (lastSession && Array.isArray(lastSession.events) && lastSession.events.length > 0) {
              capturedRrwebSession = lastSession
              console.log('Captured last Image rrweb session BEFORE stop with', capturedRrwebSession.events.length, 'events')
            }
          }
          
          // Stop recording
          if (isImageRecording) {
            stopImageRecording()
            await new Promise(resolve => setTimeout(resolve, 150))
          }
          
          // Try to get session after stopping if we didn't capture it before
          if (!capturedRrwebSession || !capturedRrwebSession.events?.length) {
            // Try localStorage
            try {
              const storedSessions = JSON.parse(localStorage.getItem('rrweb_sessions') || '[]')
              if (Array.isArray(storedSessions) && storedSessions.length > 0) {
                const sessionWithEvents = storedSessions.find((s: any) => Array.isArray(s.events) && s.events.length > 0)
                if (sessionWithEvents) {
                  capturedRrwebSession = sessionWithEvents
                  console.log('Captured Image rrweb session AFTER stop from localStorage with', capturedRrwebSession.events.length, 'events')
                }
              }
            } catch (e) {
              console.warn('Failed to read rrweb sessions from localStorage:', e)
            }
          }
          
          // Finalize mouse tracking before closing
          const now = Date.now()
          if (mouseActiveStartTime) {
            setMouseActiveTime(prev => prev + (now - mouseActiveStartTime))
            setMouseActiveStartTime(null)
          } else if (!mouseIdleStartTime && lastMouseMoveTime && (now - lastMouseMoveTime) > MOUSE_IDLE_THRESHOLD) {
            // Mouse has been idle, add the idle period
            setMouseIdleTime(prev => prev + (now - lastMouseMoveTime))
          }
          
          // Update session when Image modal closes - pass captured session
          if (currentOpenedFile && fileOpenStartTime) {
            const fileOpenDuration = Date.now() - fileOpenStartTime
            await updateFileOpenTime(currentOpenedFile, fileOpenDuration, capturedRrwebSession)
            localStorage.setItem('rrweb_sessions', '[]')
          }
          
          // Reset mouse tracking
          setLastMouseMoveTime(null)
          setMouseActiveTime(0)
          setMouseIdleTime(0)
          setMouseActiveStartTime(null)
          setMouseIdleStartTime(null)
          
          setFileOpenStartTime(null)
          setCurrentOpenedFile(null)
          setCanvasData(null)
          setShowCanvas(false) // Reset canvas state when modal closes
          setIsImageRecording(false)
          
          // Refresh the page after modal closes
          window.location.reload()
        } else {
          // Initialize mouse tracking when modal opens
          setLastMouseMoveTime(Date.now())
          setMouseActiveTime(0)
          setMouseIdleTime(0)
          setMouseActiveStartTime(Date.now()) // Start as active when opening
          setMouseIdleStartTime(null)
        }
        setIsImageModalOpen(open)
      }}>
        <DialogContent className="max-w-[98vw] max-h-[98vh] w-full h-full overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between w-full">
              <span>{modalFileData?.filename || selectedImageFile?.filename}</span>
              <Button
                variant={showCanvas ? "default" : "outline"}
                size="sm"
                onClick={toggleCanvas}
              >
                <Pen className="h-4 w-4 mr-1" />
                {showCanvas ? "Hide" : "Draw"}
              </Button>
            </DialogTitle>
            {/* <DialogDescription>
              Image File • {modalFileData ? formatFileSize(modalFileData.size) : selectedImageFile && formatFileSize(selectedImageFile.size)}
            </DialogDescription> */}
          </DialogHeader>
          <div className="space-y-4">
            {isLoadingModalFile ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading image...</p>
                </div>
              </div>
            ) : (modalFileData || selectedImageFile) && (
              <div 
                ref={imageContainerRef} 
                className="relative w-full flex justify-center image-container"
                onMouseMove={(e) => {
                  // Track mouse movement for idle/active time calculation
                  const now = Date.now()
                  
                  if (!lastMouseMoveTime || (now - lastMouseMoveTime) > MOUSE_IDLE_THRESHOLD) {
                    // Mouse just started moving (transition from idle to active)
                    if (mouseIdleStartTime) {
                      // Add the idle period that just ended
                      setMouseIdleTime(prev => prev + (now - mouseIdleStartTime))
                      setMouseIdleStartTime(null)
                    }
                    setMouseActiveStartTime(now)
                  }
                  
                  setLastMouseMoveTime(now)
                }}
              >
                <img
                  src={imageObjectUrl || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/files/serve/${encodeURIComponent((modalFileData || selectedImageFile)?.filename || '')}`}
                  alt={(modalFileData || selectedImageFile)?.filename}
                  className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-lg"
                  onError={(e) => {
                    console.error('Image load error:', e)
                    console.error('Image src:', imageObjectUrl || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/files/serve/${encodeURIComponent((modalFileData || selectedImageFile)?.filename || '')}`)
                  }}
                />
                {showCanvas && (
                  <div className="absolute inset-0 z-[100]">
                      <CanvasAnnotation
                        width={canvasWidth}
                        height={canvasHeight}
                        onSave={handleCanvasSave}
                        className="w-full h-full"
                      />
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>{modalFileData?.filename || selectedImageFile?.filename}</span>
                {/* <span>Uploaded: {(modalFileData || selectedImageFile) && new Date((modalFileData || selectedImageFile)!.uploadedAt).toLocaleDateString()}</span> */}
              </div>
              {/* <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const file = modalFileData || selectedImageFile
                    if (file) {
                      window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5010'}/api/v1/files/serve/${encodeURIComponent(file.filename)}`, '_blank')
                    }
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const file = modalFileData || selectedImageFile
                    if (file) {
                      const link = document.createElement('a')
                      link.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5010'}/api/v1/files/serve/${encodeURIComponent(file.filename)}`
                      link.download = file.filename
                      link.click()
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div> */}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Session Viewer Modal */}
      {isSessionViewerOpen && selectedSection && (
        <Dialog open={isSessionViewerOpen} onOpenChange={setIsSessionViewerOpen}>
          <DialogContent className="max-w-[98vw] max-h-[98vh] w-full h-full overflow-y-auto">
            <DialogTitle className="sr-only">
              Session Replay - {selectedSection.id}
            </DialogTitle>
            <RrwebSessionViewer
              events={selectedSection.events}
              sessionId={selectedSection.id}
              videoSrc={selectedVideoFile?.path}
              videoType={selectedVideoFile?.mimetype}
              onClose={() => {
                setIsSessionViewerOpen(false)
                setSelectedSection(null)
              }}
            />
            {/* Debug info */}
            <div className="text-xs text-gray-500 mt-2">
              Session ID: {selectedSection.id} | 
              Events: {selectedSection.events?.length || 0} | 
              Duration: {Math.round((selectedSection.duration || 0) / 1000)}s
            </div>
          </DialogContent>
        </Dialog>
      )}


    </div>
  )
}

