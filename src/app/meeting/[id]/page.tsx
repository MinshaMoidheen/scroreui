'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Square,
  LogOut,
  Play,
} from 'lucide-react'
import { useGetMeetingsQuery } from '@/store/api/meetingApi'
import { useAuth } from '@/context/auth-context'
import { toast } from '@/hooks/use-toast'
import {
  initWebRTC,
  startRecording,
  stopRecording,
  toggleMic,
  toggleVideo,
  shareScreen,
  stopScreenShare,
  closeAllPeerConnections,
  stopLocalStream,
  releaseAllMediaDevices,
  handleSignalingData,
  hasActiveAudioTrack,
  hasActiveVideoTrack,
  setTrackStateChangeCallback,
  cleanupInactiveTracks,
} from '@/lib/webrtc/webrtc'
import { connectWebSocket, disconnectWebSocket } from '@/lib/webrtc/websocket'

export default function MeetingRoomPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const meetingId = params.id as string
  const { user } = useAuth()
  const [isRecording, setIsRecording] = useState(false)
  
  // Get token from localStorage or URL query parameter
  const getToken = () => {
    // First check if token is in URL (from my-meetings page)
    const wsUrl = searchParams.get('wsUrl')
    if (wsUrl) {
      try {
        const url = new URL(wsUrl)
        const token = url.searchParams.get('token')
        if (token) return token
      } catch (e) {
        // Invalid URL, fall back to localStorage
      }
    }
    
    // Fall back to localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('accessToken')
    }
    return null
  }
  
  // Get user role from localStorage
  const getUserRole = () => {
    if (typeof window !== 'undefined') {
      try {
        const storedUser = localStorage.getItem('user')
        if (storedUser && storedUser !== 'null' && storedUser !== 'undefined') {
          const user = JSON.parse(storedUser)
          return user?.role || null
        }
      } catch (error) {
        console.error('Error parsing user data from localStorage:', error)
      }
    }
    return null
  }
  
  const [isMicMuted, setIsMicMuted] = useState(true)
  const [isVideoOff, setIsVideoOff] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [recordingSessionId, setRecordingSessionId] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const { data: meetings = [] } = useGetMeetingsQuery(undefined, {
    skip: !meetingId,
  })

  const meeting = meetings.find((m) => m._id === meetingId)
  const divisionId = meeting?.section?._id || meeting?.courseClass?._id || ''

  useEffect(() => {
    if (!meetingId || !user) return

    // Set up callback to update UI when tracks are disabled by browser
    setTrackStateChangeCallback(() => {
      setIsMicMuted(!hasActiveAudioTrack())
      setIsVideoOff(!hasActiveVideoTrack())
    })

    const initializeMeeting = async () => {
      try {
        // Initialize WebRTC
        await initWebRTC()
        setIsInitialized(true)
        
        // Update initial state based on actual track states
        setIsMicMuted(!hasActiveAudioTrack())
        setIsVideoOff(!hasActiveVideoTrack())

        // Connect to WebSocket with token
        const token = getToken()
        const ws = connectWebSocket(meetingId, async (message) => {
          await handleSignalingData(message)
        }, token || undefined)
        wsRef.current = ws

        toast({
          title: 'Success',
          description: 'Meeting room initialized successfully.',
        })
      } catch (error: any) {
        console.error('Error initializing meeting:', error)
        let errorMessage = 'Failed to initialize meeting room.'
        if (error.message) {
          errorMessage = error.message
        }
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        })
        // Set states to reflect no media access
        setIsMicMuted(true)
        setIsVideoOff(true)
      }
    }

    initializeMeeting()

    // Periodic check for track state changes (fallback for browsers that don't fire events)
    const trackStateCheckInterval = setInterval(async () => {
      // Clean up any inactive tracks first
      await cleanupInactiveTracks()
      
      const hasAudio = hasActiveAudioTrack()
      const hasVideo = hasActiveVideoTrack()
      
      // Update state to match actual track state
      // If track is active, mic/video should not be muted/off
      setIsMicMuted((prev) => {
        const shouldBeMuted = !hasAudio
        if (prev !== shouldBeMuted) {
          return shouldBeMuted
        }
        return prev
      })
      
      setIsVideoOff((prev) => {
        const shouldBeOff = !hasVideo
        if (prev !== shouldBeOff) {
          return shouldBeOff
        }
        return prev
      })
    }, 1000) // Check every second

    return () => {
      // Cleanup on unmount - release all media devices
      clearInterval(trackStateCheckInterval)
      if (wsRef.current) {
        disconnectWebSocket()
      }
      closeAllPeerConnections()
      if (isRecording) {
        stopRecording()
      }
      // Release all media devices to free up hardware for other apps
      releaseAllMediaDevices()
    }
  }, [meetingId, user])

  const handleStartRecording = async () => {
    if (!divisionId) {
      toast({
        title: 'Error',
        description: 'No division/section found for this meeting.',
        variant: 'destructive',
      })
      return
    }

    try {
      const token = getToken()
      const userRole = getUserRole()
      console.log('[Meeting Page] User role from localStorage:', userRole)
      const sessionId = await startRecording(divisionId, token || undefined, userRole || undefined)
      setRecordingSessionId(sessionId)
      setIsRecording(true)
      toast({
        title: 'Recording Started',
        description: 'Meeting recording has started.',
      })
    } catch (error: any) {
      console.error('Error starting recording:', error)
      let errorMessage = error.message || 'Failed to start recording.'
      
      // Provide helpful messages for different error types
      if (errorMessage.includes('Access token invalid') || errorMessage.includes('AuthenticationError') || errorMessage.includes('rejected the token')) {
        errorMessage = 'Token authentication failed. This usually means: 1) The JWT_SECRET values don\'t match (athenora-api uses JWT_ACCESS_SECRET, streaming server uses JWT_SECRET), OR 2) You\'re using an old token. Please: 1) Ensure both servers use the same secret value, 2) Restart both servers, 3) Log out and log back in to get a new token.'
      } else if (errorMessage.includes('insufficient permissions') || errorMessage.includes('AuthorizationError') || errorMessage.includes('Only teachers can')) {
        // Error message already includes helpful text from the proxy
        // Just keep the original message
      }
      
      toast({
        title: 'Recording Error',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  const handleStopRecording = () => {
    stopRecording()
    setIsRecording(false)
    setRecordingSessionId(null)
    toast({
      title: 'Recording Stopped',
      description: 'Meeting recording has been stopped.',
    })
  }

  const handleToggleMic = async () => {
    try {
      await toggleMic()
      // State will be updated via the trackStateChangeCallback
      // Use a small delay to ensure tracks are fully processed
      setTimeout(() => {
        setIsMicMuted(!hasActiveAudioTrack())
      }, 100)
    } catch (error: any) {
      console.error('Error toggling microphone:', error)
      toast({
        title: 'Microphone Error',
        description: error.message || 'Failed to toggle microphone',
        variant: 'destructive',
      })
      // Update state to reflect error (mic will be muted if error occurred)
      setIsMicMuted(true)
    }
  }

  const handleToggleVideo = async () => {
    try {
      await toggleVideo()
      // State will be updated via the trackStateChangeCallback
      // Use a small delay to ensure tracks are fully processed
      setTimeout(() => {
        setIsVideoOff(!hasActiveVideoTrack())
      }, 100)
    } catch (error: any) {
      console.error('Error toggling video:', error)
      toast({
        title: 'Camera Error',
        description: error.message || 'Failed to toggle camera',
        variant: 'destructive',
      })
      // Update state to reflect error (video will be off if error occurred)
      setIsVideoOff(true)
    }
  }

  const handleShareScreen = async () => {
    if (isScreenSharing) {
      await stopScreenShare()
      setIsScreenSharing(false)
    } else {
      await shareScreen()
      setIsScreenSharing(true)
    }
  }

  const handleLeaveMeeting = () => {
    if (isRecording) {
      stopRecording()
    }
    closeAllPeerConnections()
    stopLocalStream()
    disconnectWebSocket()
    router.push('/my-meetings')
  }

  if (!meeting) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading meeting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{meeting.title}</h1>
          <p className="text-sm text-gray-400">
            {meeting.courseClass?.name} {meeting.section?.name && `- ${meeting.section.name}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isRecording && (
            <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-sm">Recording</span>
            </div>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={handleLeaveMeeting}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Leave
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-6 gap-4">
        {/* Video Container */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Local Video */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">You</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden">
                <video
                  id="local-video"
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {isVideoOff && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <VideoOff className="h-12 w-12 text-gray-600" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Remote Videos Container */}
          <div id="videos-container" className="contents">
            {/* Video elements will be dynamically added here as grid items */}
          </div>

          {/* Screen Share Container */}
          <Card id="screen-share-container" className="hidden bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Screen Share</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden">
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant={isMicMuted ? 'destructive' : 'default'}
              size="lg"
              onClick={handleToggleMic}
              className="rounded-full"
            >
              {isMicMuted ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </Button>

            <Button
              variant={isVideoOff ? 'destructive' : 'default'}
              size="lg"
              onClick={handleToggleVideo}
              className="rounded-full"
            >
              {isVideoOff ? (
                <VideoOff className="h-5 w-5" />
              ) : (
                <Video className="h-5 w-5" />
              )}
            </Button>

            <Button
              variant={isScreenSharing ? 'default' : 'outline'}
              size="lg"
              onClick={handleShareScreen}
              className="rounded-full"
            >
              {isScreenSharing ? (
                <MonitorOff className="h-5 w-5" />
              ) : (
                <Monitor className="h-5 w-5" />
              )}
            </Button>

            {!isRecording ? (
              <Button
                variant="default"
                size="lg"
                onClick={handleStartRecording}
                className="rounded-full gap-2"
                disabled={!isInitialized || !divisionId}
              >
                <Play className="h-5 w-5" />
                Start Recording
              </Button>
            ) : (
              <Button
                variant="destructive"
                size="lg"
                onClick={handleStopRecording}
                className="rounded-full gap-2"
              >
                <Square className="h-5 w-5" />
                Stop Recording
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

