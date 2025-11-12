'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
 
  Trash2, 
  Eye, 
  Clock,
  Activity,
  Database
} from 'lucide-react'
import { useRrwebRecording } from '@/hooks/use-rrweb-recording'

type RecordedSession = {
  id: string
  startTime: string
  duration?: number
  events?: unknown[]
}

type SectionsData = { sessionId: string; sections: RecordedSession[] }

interface RrwebRecordingControlsProps {
  onViewSession?: (session: RecordedSession) => void
  sectionsData?: SectionsData | null
  isSectionsLoading?: boolean
}

export function RrwebRecordingControls({ onViewSession, sectionsData, isSectionsLoading }: RrwebRecordingControlsProps = {}) {
  const {
    isRecording,
    currentSession,
    sessions,
   
    clearSessions,
    
  } = useRrwebRecording({
    autoStart: false,
    recordCanvas: true,
    sampling: {
      scroll: 100,
      mouseInteraction: true,
      input: "all",
      media: 10,
      mousemove: 10,
      canvas: 10,
    }
  })

  const [recordingDuration, setRecordingDuration] = useState(0)

  // Update recording duration
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isRecording && currentSession) {
      interval = setInterval(() => {
        const startTime = new Date(currentSession.startTime).getTime()
        const now = Date.now()
        setRecordingDuration(Math.floor((now - startTime) / 1000))
      }, 1000)
    } else {
      setRecordingDuration(0)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRecording, currentSession])

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getSessionSize = (session: { events?: unknown[] }): number => {
    return new Blob([JSON.stringify(session.events ?? [])]).size
  }

  return (
    <Card className="w-full">
      <CardHeader>
        {/* <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            User Activity Recording
          </CardTitle>
          {sessions.length > 0 && (
            <Button onClick={clearSessions} variant="outline" className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Clear All
            </Button>
          )}
        </div> */}
        {/* <CardDescription>
          Record and analyze user interactions on this page
        </CardDescription> */}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recording Controls */}
        <div className="flex items-center gap-4">
          {/* {!isRecording ? (
            <Button onClick={startRecording} className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              Start Recording
            </Button>
          ) : (
            <Button onClick={stopRecording} variant="destructive" className="flex items-center gap-2">
              <Square className="h-4 w-4" />
              Stop Recording
            </Button>
          )} */}
        </div>

        {/* Recording Status */}
        {isRecording && (
          <div className="flex items-center gap-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                Recording in progress...
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                Duration: {formatDuration(recordingDuration)}
              </p>
            </div>
            <Badge variant="destructive">LIVE</Badge>
          </div>
        )}

        {/* Current Session Info */}
        {currentSession && !isRecording && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              Last Recording Completed
            </p>
            <p className="text-xs text-green-600 dark:text-green-400">
              Events: {currentSession.events.length} | 
              Duration: {currentSession.duration ? formatDuration(Math.floor(currentSession.duration / 1000)) : 'N/A'} |
              Size: {formatFileSize(getSessionSize(currentSession))}
            </p>
          </div>
        )}

        {/* Sessions List from Database API */}
        {isSectionsLoading ? (
          <div className="text-xs text-muted-foreground p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            Loading sessions from database...
          </div>
        ) : sectionsData && sectionsData.sections && sectionsData.sections.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Database Sessions ({sectionsData.sections.length})
            </h4>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {sectionsData.sections.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      Session {session.id}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(session.startTime).toLocaleString()}
                      </span>
                      <span>
                        Events: {session.events?.length || 0}
                      </span>
                      {session.duration && (
                        <span>
                          Duration: {formatDuration(Math.floor(session.duration / 1000))}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {onViewSession && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onViewSession(session)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    )}
                    {/* {session.events && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const dataStr = JSON.stringify(session.events, null, 2)
                          const dataBlob = new Blob([dataStr], { type: 'application/json' })
                          const url = URL.createObjectURL(dataBlob)
                          const link = document.createElement('a')
                          link.href = url
                          link.download = `rrweb_session_${session.id}.json`
                          link.click()
                          URL.revokeObjectURL(url)
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    )} */}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : sectionsData && sectionsData.sections && sectionsData.sections.length === 0 ? (
          <div className="text-xs text-muted-foreground p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            No recorded sessions in database yet
          </div>
        ) : null}

       

        {/* Info */}
        {/* <div className="text-xs text-muted-foreground">
          <p>• Recording captures mouse movements, clicks, scrolls, and form interactions</p>
          <p>• Data is stored locally in your browser</p>
          <p>• Export sessions as JSON files for analysis</p>
        </div> */}
      </CardContent>
    </Card>
  )
}
