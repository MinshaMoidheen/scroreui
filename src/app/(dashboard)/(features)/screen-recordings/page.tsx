'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { Video, Search, List, Grid3X3, Play, Calendar, Clock, FileVideo, Download } from 'lucide-react'
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useGetRecordingsBySectionQuery, type RecordedVideo } from '@/store/api/recordingApi'
import { useGetSectionsQuery } from '@/store/api/sectionApi'
import { useAuth } from '@/context/auth-context'
import { STREAMING_SERVER_URL } from '@/constants'

type ViewMode = 'list' | 'grid'

export default function ScreenRecordingsPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedVideo, setSelectedVideo] = useState<RecordedVideo | null>(null)
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [selectedSectionId, setSelectedSectionId] = useState<string>('')
  const [isVideoLoading, setIsVideoLoading] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<Plyr | null>(null)

  // Get user role
  const userRole = useMemo(() => {
    if (user?.role) return user.role.toLowerCase()
    if (typeof window !== 'undefined') {
      try {
        const storedUser = localStorage.getItem('user')
        if (storedUser && storedUser !== 'null' && storedUser !== 'undefined') {
          const parsedUser = JSON.parse(storedUser)
          return parsedUser?.role?.toLowerCase() || 'teacher'
        }
      } catch (error) {
        console.error('Error parsing user data:', error)
      }
    }
    return 'teacher'
  }, [user])

  // Get section ID from localStorage (for teachers)
  const teacherSectionId = useMemo(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('section')
  }, [])

  // Fetch all sections (for admins/superadmins)
  const { data: sections = [], isLoading: isLoadingSections } = useGetSectionsQuery(undefined, {
    skip: !isAuthenticated || authLoading || userRole === 'teacher',
  })

  // Initialize selected section
  useEffect(() => {
    if (userRole === 'teacher' && teacherSectionId) {
      setSelectedSectionId(teacherSectionId)
    } else if (userRole !== 'teacher' && sections.length > 0 && !selectedSectionId) {
      // For admins, default to first section if available
      setSelectedSectionId(sections[0]._id)
    }
  }, [userRole, teacherSectionId, sections, selectedSectionId])

  // Fetch recordings for the selected section
  const { data: recordings = [], isLoading, error } = useGetRecordingsBySectionQuery(
    { section_id: selectedSectionId },
    {
      skip: !isAuthenticated || authLoading || !selectedSectionId,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
    }
  )

  // Filter recordings by search term
  const filteredRecordings = useMemo(() => {
    if (!searchTerm) return recordings

    const searchLower = searchTerm.toLowerCase()
    return recordings.filter((recording) => {
      const filename = recording.filename?.toLowerCase() || ''
      const sectionName = typeof recording.section === 'object' 
        ? recording.section?.name?.toLowerCase() || ''
        : ''
      const createdAt = recording.created_at || ''
      
      return filename.includes(searchLower) || 
             sectionName.includes(searchLower) ||
             createdAt.includes(searchLower)
    })
  }, [recordings, searchTerm])

  const handlePlayVideo = (recording: RecordedVideo) => {
    setSelectedVideo(recording)
    setVideoError(null)
    setIsVideoLoading(true)
    setIsVideoDialogOpen(true)
  }

  // Force video to load when dialog opens and test URL accessibility
  useEffect(() => {
    if (isVideoDialogOpen && selectedVideo && videoRef.current) {
      const video = videoRef.current
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
      if (!token) {
        console.error('No access token available')
        setVideoError('Authentication token not found. Please log in again.')
        return
      }
      
      const videoUrl = getVideoUrl(selectedVideo.filename)
      
      console.log('Loading video:', {
        filename: selectedVideo.filename,
        videoUrl: videoUrl,
        elementReady: !!video,
      })
      
      // Test if the video URL is accessible before setting it
      const testVideoUrl = async () => {
        try {
          setIsVideoLoading(true)
          
          // First, try a HEAD request to check if video exists
          const headResponse = await fetch(videoUrl, {
            method: 'HEAD',
            headers: {
              'Range': 'bytes=0-1',
            },
          })
          
          console.log('Video URL HEAD test response:', {
            status: headResponse.status,
            statusText: headResponse.statusText,
            contentType: headResponse.headers.get('content-type'),
            contentLength: headResponse.headers.get('content-length'),
            acceptRanges: headResponse.headers.get('accept-ranges'),
          })
          
          if (!headResponse.ok) {
            // If HEAD fails, try GET to see the actual error
            const getResponse = await fetch(videoUrl, {
              method: 'GET',
              headers: {
                'Range': 'bytes=0-1023', // Get first 1KB to test
              },
            })
            
            if (!getResponse.ok) {
              const errorText = await getResponse.text().catch(() => 'Unknown error')
              let errorData
              try {
                errorData = JSON.parse(errorText)
              } catch {
                errorData = { detail: errorText }
              }
              
              console.error('Video URL test failed:', getResponse.status, errorData)
              
              if (getResponse.status === 404) {
                setVideoError('Video file not found on server. The recording may not have been saved properly.')
              } else if (getResponse.status === 401 || getResponse.status === 403) {
                setVideoError('Authentication failed. Please log in again.')
              } else if (getResponse.status === 422) {
                // Unprocessable Entity - usually means empty file
                const errorMsg = errorData?.detail?.message || errorData?.detail || 'Video file is empty or incomplete.'
                setVideoError(`Video recording issue: ${errorMsg}. The recording may not have completed properly. Please try recording again.`)
              } else {
                setVideoError(`Cannot access video: ${getResponse.status} ${getResponse.statusText}. ${errorData?.detail?.message || errorData?.detail || ''}`)
              }
              setIsVideoLoading(false)
              return
            }
          }
          
          const contentType = headResponse.headers.get('content-type')
          const contentLength = headResponse.headers.get('content-length')
          
          console.log('Video file info:', {
            contentType,
            contentLength: contentLength ? `${(parseInt(contentLength) / 1024 / 1024).toFixed(2)} MB` : 'unknown',
          })
          
          if (contentType && !contentType.includes('video')) {
            console.warn('Unexpected content type:', contentType)
            setVideoError(`Unexpected content type: ${contentType}. Expected video/webm.`)
            setIsVideoLoading(false)
            return
          }
          
          if (contentLength && parseInt(contentLength) === 0) {
            setVideoError('Video file is empty (0 bytes). The recording may not have completed properly.')
            setIsVideoLoading(false)
            return
          }
          
          // URL is accessible and valid, trigger video load
          console.log('Video URL is accessible, video should load automatically via source elements')
          // The source elements in JSX will handle the loading
          // Just ensure video element is ready
          if (video.readyState === 0) {
            video.load() // Force reload if not already loading
          }
        } catch (error: any) {
          console.error('Error testing video URL:', error)
          setVideoError(`Cannot access video: ${error.message || 'Network error'}. Please check your connection and try again.`)
          setIsVideoLoading(false)
        }
      }
      
      testVideoUrl()
    }
  }, [isVideoDialogOpen, selectedVideo?.filename])

  // Initialize Plyr player when dialog opens and video is ready (optional enhancement)
  useEffect(() => {
    if (isVideoDialogOpen && selectedVideo?.filename && videoRef.current) {
      // Small delay to ensure video element is in DOM
      const timer = setTimeout(() => {
        if (!videoRef.current) return

        // Clean up previous player
        if (playerRef.current) {
          try {
            playerRef.current.destroy()
          } catch (e) {
            console.warn('Error destroying previous player:', e)
          }
          playerRef.current = null
        }

        // Wait for video element to be ready
        const initPlayer = () => {
          if (!videoRef.current) return

          try {
            const player = new Plyr(videoRef.current, {
              controls: [
                'play-large',
                'restart',
                'rewind',
                'play',
                'fast-forward',
                'progress',
                'current-time',
                'duration',
                'mute',
                'volume',
                'settings',
                'pip',
                'airplay',
                'fullscreen',
              ],
              settings: ['speed'],
              keyboard: { focused: true, global: false },
              tooltips: { controls: true, seek: true },
              autoplay: false,
              clickToPlay: true,
            })

            playerRef.current = player

            // Handle player events
            player.on('ready', () => {
              console.log('Plyr player ready')
            })

            player.on('play', () => {
              console.log('Video playing')
              setVideoError(null)
            })

            player.on('error', (event) => {
              console.error('Plyr player error:', event)
              const error = (event as any).detail
              if (error) {
                setVideoError(`Video playback error: ${error.message || 'Unknown error'}. You can download the video to play it locally.`)
              } else {
                setVideoError('Video playback error. You can download the video to play it locally.')
              }
            })

            player.on('loadedmetadata', () => {
              console.log('Video metadata loaded in Plyr')
              setVideoError(null)
            })
          } catch (error) {
            console.error('Error initializing Plyr:', error)
            // If Plyr fails, video element will still work with native controls
          }
        }

        // Initialize immediately if video is already loaded, otherwise wait
        if (videoRef.current.readyState >= 1) {
          initPlayer()
        } else {
          const handleLoadedMetadata = () => {
            initPlayer()
            videoRef.current?.removeEventListener('loadedmetadata', handleLoadedMetadata)
          }
          videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata)
        }
      }, 100)

      // Cleanup on unmount
      return () => {
        clearTimeout(timer)
        if (playerRef.current) {
          try {
            playerRef.current.destroy()
          } catch (e) {
            console.warn('Error destroying player on cleanup:', e)
          }
          playerRef.current = null
        }
      }
    }
  }, [isVideoDialogOpen, selectedVideo?.filename])

  const handleDownload = () => {
    if (!selectedVideo) return

    const downloadUrl = getVideoUrl(selectedVideo.filename)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = selectedVideo.filename || `recording-${selectedVideo._id}.webm`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getVideoUrl = (filename: string) => {
    // Use the direct streaming server URL with the filename
    return `${STREAMING_SERVER_URL}/videos_recorded/${filename}`
  }

  // Check browser codec support
  const checkCodecSupport = () => {
    if (typeof window === 'undefined' || !videoRef.current) return false
    
    const video = videoRef.current
    const canPlayVP9 = video.canPlayType('video/webm; codecs="vp9,opus"')
    const canPlayVP8 = video.canPlayType('video/webm; codecs="vp8,opus"')
    const canPlayWebM = video.canPlayType('video/webm')
    
    console.log('Codec support check:', {
      vp9: canPlayVP9,
      vp8: canPlayVP8,
      webm: canPlayWebM,
    })
    
    return canPlayVP9 === 'probably' || canPlayVP9 === 'maybe' || 
           canPlayVP8 === 'probably' || canPlayVP8 === 'maybe' ||
           canPlayWebM === 'probably' || canPlayWebM === 'maybe'
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateString
    }
  }

  const renderListView = () => (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Filename</TableHead>
            <TableHead>Section</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRecordings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8">
                <FileVideo className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">No recordings found</p>
              </TableCell>
            </TableRow>
          ) : (
            filteredRecordings.map((recording) => (
              <TableRow key={recording._id}>
                <TableCell className="font-medium">{recording.filename}</TableCell>
                <TableCell>
                  {typeof recording.section === 'object' 
                    ? recording.section?.name || 'Unknown'
                    : 'Unknown'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{formatDate(recording.created_at)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePlayVideo(recording)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Play
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  )

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredRecordings.length === 0 ? (
        <div className="col-span-full text-center py-8">
          <FileVideo className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">No recordings found</p>
        </div>
      ) : (
        filteredRecordings.map((recording) => (
          <Card key={recording._id} className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Video className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg truncate">{recording.filename}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(recording.created_at)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileVideo className="h-4 w-4" />
                  <span>
                    {typeof recording.section === 'object' 
                      ? recording.section?.name || 'Unknown'
                      : 'Unknown'}
                  </span>
                </div>
                <Button
                  className="w-full mt-4"
                  onClick={() => handlePlayVideo(recording)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Play Recording
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )

  if (!isAuthenticated && !authLoading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <Video className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">Authentication Required</h3>
            <p className="mt-1 text-sm text-gray-500">
              Please log in to view screen recordings.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (userRole === 'teacher' && !teacherSectionId && !authLoading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <Video className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">Section Required</h3>
            <p className="mt-1 text-sm text-gray-500">
              Please ensure you have a section assigned to view recordings.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (userRole !== 'teacher' && sections.length === 0 && !isLoadingSections && !authLoading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <Video className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No Sections Available</h3>
            <p className="mt-1 text-sm text-gray-500">
              No sections found. Please create a section first.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Screen Recordings</h1>
          <p className="text-muted-foreground mt-1">
            View and manage recorded video sessions
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        {/* Section Selector (for admins/superadmins) */}
        {userRole !== 'teacher' && sections.length > 0 && (
          <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select a section" />
            </SelectTrigger>
            <SelectContent>
              {sections.map((section) => (
                <SelectItem key={section._id} value={section._id}>
                  {section.name} ({section.courseClass?.name || 'Unknown Class'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Section Display (for teachers) */}
        {userRole === 'teacher' && teacherSectionId && (
          <div className="px-3 py-2 border rounded-md bg-muted">
            <span className="text-sm font-medium">Your Section</span>
          </div>
        )}

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recordings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2 border rounded-lg p-1">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading recordings...</p>
            </div>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Video className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">Error loading recordings</h3>
              <p className="mt-1 text-sm text-gray-500">
                Failed to load recordings. Please try again.
              </p>
            </CardContent>
          </Card>
        ) : filteredRecordings.length === 0 && !isLoading ? (
          <Card>
            <CardContent className="py-8 text-center">
              <FileVideo className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No recordings found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm 
                  ? 'No recordings match your search criteria.'
                  : 'You don\'t have any recordings yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {viewMode === 'list' && renderListView()}
            {viewMode === 'grid' && renderGridView()}
          </>
        )}
      </div>

      {/* Video Player Dialog */}
      <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Video Recording</DialogTitle>
          </DialogHeader>
          {selectedVideo && (
            <div className="mt-4 space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: '400px' }}>
                {isVideoLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                      <p className="mt-2 text-sm text-white">Loading video...</p>
                    </div>
                  </div>
                )}
                <video
                  key={selectedVideo._id} // Force recreation when video changes
                  ref={videoRef}
                  className="w-full h-full"
                  controls
                  preload="auto"
                  playsInline
                  style={{ display: 'block', width: '100%', height: 'auto', minHeight: '400px' }}
                  onError={(e) => {
                    const video = e.currentTarget
                    setIsVideoLoading(false)
                    
                    // Safely extract error information
                    const errorCode = video.error?.code ?? null
                    const errorMessage = video.error?.message ?? null
                    const networkState = video.networkState ?? null
                    const readyState = video.readyState ?? null
                    
                    const errorDetails = {
                      error: video.error,
                      errorCode,
                      errorMessage,
                      networkState,
                      readyState,
                      src: video.src,
                      currentSrc: video.currentSrc,
                      paused: video.paused,
                      ended: video.ended,
                      networkStateText: networkState === 0 ? 'EMPTY' : 
                                       networkState === 1 ? 'IDLE' :
                                       networkState === 2 ? 'LOADING' :
                                       networkState === 3 ? 'NO_SOURCE' : 'UNKNOWN',
                      readyStateText: readyState === 0 ? 'HAVE_NOTHING' :
                                     readyState === 1 ? 'HAVE_METADATA' :
                                     readyState === 2 ? 'HAVE_CURRENT_DATA' :
                                     readyState === 3 ? 'HAVE_FUTURE_DATA' :
                                     readyState === 4 ? 'HAVE_ENOUGH_DATA' : 'UNKNOWN',
                    }
                    console.error('Video playback error:', errorDetails)
                    
                    // Check codec support
                    const codecSupported = checkCodecSupport()
                    
                    // Set error message for display
                    let errorMsg = 'Unable to load video. You can download it to play locally.'
                    
                    if (video.error && errorCode !== null) {
                      if (errorCode === 4) {
                        // MEDIA_ERR_SRC_NOT_SUPPORTED
                        if (networkState === 2) {
                          errorMsg = 'Video is loading but format may not be supported. Please wait or try downloading the video.'
                        } else if (!codecSupported) {
                          errorMsg = 'Your browser does not support VP9/VP8 codecs used in this WebM video. Please try Chrome, Firefox, or Edge browser, or download the video to play it with VLC media player.'
                        } else {
                          errorMsg = 'Video format not supported. The video may be corrupted, incomplete, or still being processed. Try downloading the video to play it locally, or wait a moment and try again.'
                        }
                      } else if (errorCode === 2) {
                        // MEDIA_ERR_NETWORK
                        errorMsg = 'Network error while loading video. Please check your connection and try again.'
                      } else if (errorCode === 3) {
                        // MEDIA_ERR_DECODE
                        errorMsg = 'Video decoding error. The video file may be corrupted or the codec is not supported. Try downloading the video to play it locally.'
                      } else if (errorCode === 1) {
                        // MEDIA_ERR_ABORTED
                        errorMsg = 'Video loading was aborted. Please try again.'
                      } else if (errorMessage) {
                        errorMsg = `Video error: ${errorMessage}. You can download the video to play it locally.`
                      } else {
                        errorMsg = `Video playback error (code: ${errorCode}). The video may be corrupted or not fully loaded. Try downloading the video to play it locally.`
                      }
                    } else if (networkState === 3) {
                      // NETWORK_NO_SOURCE
                      errorMsg = 'No video source available. Please check if the video file exists on the server.'
                    } else if (readyState === 0) {
                      // HAVE_NOTHING
                      errorMsg = 'Video has no data. The file may be empty or not accessible. Please check if the recording completed successfully.'
                    } else if (networkState === 2) {
                      // NETWORK_LOADING
                      errorMsg = 'Video is still loading. Please wait a moment.'
                    } else {
                      // Unknown error - provide generic message
                      errorMsg = 'Video playback error occurred. The video may be corrupted, incomplete, or your browser may not support the format. Try downloading the video to play it locally.'
                    }
                    
                    setVideoError(errorMsg)
                  }}
                  onLoadStart={() => {
                    console.log('Video load started', {
                      src: videoRef.current?.src,
                      currentSrc: videoRef.current?.currentSrc,
                    })
                    setIsVideoLoading(true)
                    setVideoError(null)
                  }}
                  onLoadedMetadata={() => {
                    const video = videoRef.current
                    console.log('Video metadata loaded', {
                      duration: video?.duration,
                      videoWidth: video?.videoWidth,
                      videoHeight: video?.videoHeight,
                      readyState: video?.readyState,
                      networkState: video?.networkState,
                      currentSrc: video?.currentSrc,
                    })
                    setIsVideoLoading(false)
                    setVideoError(null)
                    
                    // Check if video can actually play
                    if (video) {
                      const canPlay = video.readyState >= 2 // HAVE_CURRENT_DATA
                      if (!canPlay) {
                        console.warn('Video metadata loaded but may not be playable')
                      }
                    }
                  }}
                  onCanPlay={() => {
                    console.log('Video can start playing')
                    setIsVideoLoading(false)
                    setVideoError(null)
                  }}
                  onCanPlayThrough={() => {
                    console.log('Video can play through without buffering')
                    setIsVideoLoading(false)
                    setVideoError(null)
                  }}
                  onLoadedData={() => {
                    console.log('Video data loaded')
                    setIsVideoLoading(false)
                  }}
                  onProgress={() => {
                    const video = videoRef.current
                    if (video && video.buffered.length > 0) {
                      const bufferedEnd = video.buffered.end(video.buffered.length - 1)
                      const duration = video.duration
                      const percent = duration > 0 ? (bufferedEnd / duration) * 100 : 0
                      console.log(`Video buffered: ${percent.toFixed(1)}%`)
                    }
                  }}
                  onWaiting={() => {
                    console.log('Video waiting for data')
                  }}
                  onStalled={() => {
                    console.warn('Video stalled - network issue')
                    setVideoError('Video loading stalled. Please check your network connection.')
                  }}
                >
                  <source src={getVideoUrl(selectedVideo.filename)} type='video/webm; codecs="vp9,opus"' />
                  <source src={getVideoUrl(selectedVideo.filename)} type='video/webm; codecs="vp8,opus"' />
                  <source src={getVideoUrl(selectedVideo.filename)} type='video/webm; codecs="vp9,vorbis"' />
                  <source src={getVideoUrl(selectedVideo.filename)} type='video/webm; codecs="vp8,vorbis"' />
                  <source src={getVideoUrl(selectedVideo.filename)} type="video/webm" />
                  Your browser does not support the video tag or the video format.
                </video>
              </div>
              
              <div className="flex items-center justify-between gap-4">
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Video
                </Button>
                {videoError && (
                  <div className="flex-1 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">{videoError}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
