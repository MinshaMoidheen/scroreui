'use client'

import { useState, useMemo, useEffect } from 'react'
import { Video, Search, List, Grid3X3, Play, Calendar, Clock, FileVideo } from 'lucide-react'
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
import { useGetRecordingsBySectionQuery } from '@/store/api/recordingApi'
import { useGetSectionsQuery } from '@/store/api/sectionApi'
import { useAuth } from '@/context/auth-context'

type ViewMode = 'list' | 'grid'

export default function ScreenRecordingsPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false)
  const [selectedSectionId, setSelectedSectionId] = useState<string>('')

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

  const handlePlayVideo = (videoId: string) => {
    setSelectedVideo(videoId)
    setIsVideoDialogOpen(true)
  }

  const getVideoUrl = (videoId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    if (!token) return ''
    
    // Use the Next.js proxy route for video streaming
    return `/api/video-proxy/${videoId}?token=${encodeURIComponent(token)}`
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
                    onClick={() => handlePlayVideo(recording._id)}
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
                  onClick={() => handlePlayVideo(recording._id)}
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
    <div className="container mx-auto py-8 space-y-6">
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
            <div className="mt-4">
              <video
                controls
                className="w-full rounded-lg"
                src={getVideoUrl(selectedVideo)}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
