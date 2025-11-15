'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, Users, BookOpen, GraduationCap, UserCheck, Search, List, Grid3X3, Play, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useGetMyMeetingsQuery, useGetStudentMeetingsQuery } from '@/store/api/meetingApi'
import { useAuth } from '@/context/auth-context'
import { toast } from '@/hooks/use-toast'

type ViewMode = 'list' | 'grid'

export default function MyMeetingsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [searchTerm, setSearchTerm] = useState('')

  const handleStartMeeting = (meetingId: string) => {
    router.push(`/meeting/${meetingId}`)
  }

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

  // Build query params for meeting filtering
  const meetingQueryParams = useMemo(() => {
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
  const shouldSkipMeetings = useMemo(() => {
    if (!isAuthenticated || authLoading) return true
    
    if (user?.role === 'student') {
      return !studentCourseClassId || !studentSectionId
    }
    
    // For teachers
    return !teacherCourseClassId || !teacherSectionId || !teacherSubjectId
  }, [isAuthenticated, authLoading, user?.role, studentCourseClassId, studentSectionId, teacherCourseClassId, teacherSectionId, teacherSubjectId])

  // Fetch meetings filtered by user's assigned class/section (and subject for teachers) and user participation
  // Use student-specific endpoints for students, regular endpoints for teachers
  const isStudent = user?.role === 'student'
  
  const { data: teacherMeetings = [], isLoading: isLoadingTeacherMeetings, error: teacherMeetingsError } = useGetMyMeetingsQuery(meetingQueryParams, {
    skip: shouldSkipMeetings || isStudent,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  })
  
  const { data: studentMeetings = [], isLoading: isLoadingStudentMeetings, error: studentMeetingsError } = useGetStudentMeetingsQuery(undefined, {
    skip: shouldSkipMeetings || !isStudent,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  })
  
  // Combine meetings based on role
  const meetings = isStudent ? studentMeetings : teacherMeetings
  const isLoading = isStudent ? isLoadingStudentMeetings : isLoadingTeacherMeetings
  const error = isStudent ? studentMeetingsError : teacherMeetingsError

  // Filter meetings by search term
  const filteredMeetings = useMemo(() => {
    if (!searchTerm) return meetings
    const term = searchTerm.toLowerCase()
    return meetings.filter(meeting =>
      meeting.title.toLowerCase().includes(term) ||
      meeting.description?.toLowerCase().includes(term) ||
      meeting.courseClass?.name.toLowerCase().includes(term) ||
      meeting.section?.name.toLowerCase().includes(term) ||
      meeting.subject?.name.toLowerCase().includes(term) ||
      meeting.organizer.username.toLowerCase().includes(term)
    )
  }, [meetings, searchTerm])

  const renderListView = () => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Class</TableHead>
            <TableHead>Section</TableHead>
            <TableHead>Subject</TableHead>
            {/* <TableHead>Organizer</TableHead>
            <TableHead>Participants</TableHead> */}
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredMeetings.length > 0 ? (
            filteredMeetings.map((meeting) => {
              const date = new Date(meeting.date)
              return (
                <TableRow key={meeting._id}>
                  <TableCell className="font-medium">{meeting.title}</TableCell>
                  <TableCell>{date.toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {meeting.startTime} - {meeting.endTime}
                    </div>
                  </TableCell>
                  <TableCell>
                    {meeting.courseClass ? (
                      <span className="text-sm">{meeting.courseClass.name}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {meeting.section ? (
                      <span className="text-sm">{meeting.section.name}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {meeting.subject ? (
                      <span className="text-sm">{meeting.subject.name}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  {/* <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{meeting.organizer.username}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {meeting.participants && meeting.participants.length > 0 ? (
                      <span className="text-sm">{meeting.participants.length}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </TableCell> */}
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => handleStartMeeting(meeting._id)}
                      className="gap-2"
                    >
                      {user?.role === 'student' ? (
                        <>
                          <LogIn className="h-4 w-4" />
                          Join
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Start
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })
          ) : (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center">
                No meetings found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filteredMeetings.length > 0 ? (
        filteredMeetings.map((meeting) => {
          const date = new Date(meeting.date)
          return (
            <Card key={meeting._id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">{meeting.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{date.toLocaleDateString()} {meeting.startTime} - {meeting.endTime}</span>
                  </div>
                  {meeting.courseClass && (
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Class: {meeting.courseClass.name}</span>
                    </div>
                  )}
                  {meeting.section && (
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Section: {meeting.section.name}</span>
                    </div>
                  )}
                  {meeting.subject && (
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Subject: {meeting.subject.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Organizer: {meeting.organizer.username}</span>
                  </div>
                  {meeting.participants && meeting.participants.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {meeting.participants.length} participant{meeting.participants.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  {meeting.description && (
                    <div className="pt-2">
                      <p className="text-sm text-muted-foreground line-clamp-2">{meeting.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })
      ) : (
        <div className="col-span-full text-center py-8">
          <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No meetings found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search.' : 'You have no meetings scheduled.'}
          </p>
        </div>
      )}
    </div>
  )

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="text-center py-8">
        <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">Authentication Required</h3>
        <p className="mt-1 text-sm text-gray-500">Please log in to view your meetings.</p>
      </div>
    )
  }

  // if (!teacherCourseClassId || !teacherSectionId || !teacherSubjectId) {
  //   return (
  //     <div className="text-center py-8">
  //       <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
  //       <h3 className="mt-2 text-sm font-semibold text-gray-900">Teacher Session Required</h3>
  //       <p className="mt-1 text-sm text-gray-500">
  //         Please ensure you have selected a class, section, and subject to view your meetings.
  //       </p>
  //     </div>
  //   )
  // }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Meetings</h1>
          <p className="text-muted-foreground">
            View all meetings and schedules
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 px-3"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8 px-3"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search meetings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredMeetings.length} of {meetings.length} meetings
        </div>
      </div>

      <div>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading meetings...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">Error loading meetings</h3>
            <p className="mt-1 text-sm text-gray-500">
              Failed to load meetings. Please try again.
            </p>
          </div>
        ) : meetings.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No meetings</h3>
            <p className="mt-1 text-sm text-gray-500">
              You don't have any meetings scheduled yet.
            </p>
          </div>
        ) : (
          <>
            {viewMode === 'list' && renderListView()}
            {viewMode === 'grid' && renderGridView()}
          </>
        )}
      </div>
    </div>
  )
}

