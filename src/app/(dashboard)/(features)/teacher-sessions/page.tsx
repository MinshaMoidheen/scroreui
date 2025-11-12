'use client'
import React from 'react'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  Calendar,
  Clock,
  User,
  Search,
  
  AlertCircle,
  Filter,
  Eye,
  LogOut
} from 'lucide-react'
import { format } from 'date-fns'
import { 
  useGetTeacherSessionsQuery,
  type TeacherSession
} from '@/store/api/teacherSessionApi'
import { useGetTeachersQuery } from '@/store/api/userApi'
import { RrwebSessionViewer } from '@/components/rrweb-session-viewer'

import { useLogoutUserMutation } from '@/store/api/authApi'
import { toast } from '@/hooks/use-toast'

export default function TeacherSessionsPage() {
 
  const [logoutUser] = useLogoutUserMutation()
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [selectedSession, setSelectedSession] = useState<TeacherSession | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isReplayOpen, setIsReplayOpen] = useState(false)
  const [replaySection, setReplaySection] = useState<any>(null)
  
  // Helper function to safely extract name from object or string
  const getName = (value: any): string => {
    if (!value) return 'N/A'
    if (typeof value === 'string') return value
    if (typeof value === 'object' && value.name) return value.name
    if (typeof value === 'object' && value._id) return String(value._id)
    return String(value)
  }
  
  // Filters
  const [filterTeacher, setFilterTeacher] = useState<string>('all')
  const [filterCourseClass, setFilterCourseClass] = useState<string>('all')
  const [filterSection, setFilterSection] = useState<string>('all')
  const [filterSubject, setFilterSubject] = useState<string>('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterActive, setFilterActive] = useState<string>('all')

  console.log(setFilterCourseClass, setFilterSection, setFilterSubject,setFilterActive)

  // Fetch dropdown data
  const { data: teachers = [] } = useGetTeachersQuery()
 

  // Build query params
  const queryParams: any = {
    page,
    limit,
    sortBy: 'loginAt',
    sortOrder: 'desc'
  }

  if (filterTeacher !== 'all') queryParams.username = filterTeacher
  if (filterCourseClass !== 'all') queryParams.courseClassName = filterCourseClass
  if (filterSection !== 'all') queryParams.sectionName = filterSection
  if (filterSubject !== 'all') queryParams.subjectName = filterSubject
  if (filterDateFrom) queryParams.dateFrom = filterDateFrom
  if (filterDateTo) queryParams.dateTo = filterDateTo
  if (filterActive !== 'all') queryParams.active = filterActive === 'true'

  // Fetch teacher sessions with filters
  const { data: sessionsData, isLoading, error, refetch } = useGetTeacherSessionsQuery(queryParams)


  // console.log("sessionsData fghjk",sessionsData)
  // const handleClearFilters = () => {
  //   setFilterTeacher('all')
  //   setFilterCourseClass('all')
  //   setFilterSection('all')
  //   setFilterSubject('all')
  //   setFilterDateFrom('')
  //   setFilterDateTo('')
  //   setFilterActive('all')
  //   setPage(1)
  // }

  // const hasActiveFilters = () => {
  //   return filterTeacher !== 'all' || 
  //          filterCourseClass !== 'all' || 
  //          filterSection !== 'all' || 
  //          filterSubject !== 'all' || 
  //          filterDateFrom || 
  //          filterDateTo || 
  //          filterActive !== 'all'
  // }

  const handleViewSession = (session: TeacherSession) => {
    setSelectedSession(session)
    setIsViewDialogOpen(true)
  }

  const handleLogoutSession = async (session: TeacherSession) => {
    // Find the user ID from the username
    const teacher = teachers.find(t => t.username === session.username)
    
    if (!teacher) {
      toast({
        title: "Error",
        description: "Teacher not found",
        variant: "destructive",
      })
      return
    }

    if (confirm(`Are you sure you want to logout this session for ${session.username}?`)) {
      try {
        const result = await logoutUser(teacher._id).unwrap()
        toast({
          title: "Success",
          description: result.message || `Session logout initiated for ${session.username}`,
        })
        // Wait a moment then refetch to ensure backend has updated
        setTimeout(() => {
          refetch()
        }, 500)
      } catch (error: any) {
        console.error('Logout error:', error)
        toast({
          title: "Error",
          description: error?.data?.message || error?.message || "Failed to logout session",
          variant: "destructive",
        })
      }
    }
  }

  // Hot refresh: keep selectedSession in sync with latest API data while dialog is open
  // 1) When sessionsData changes, update the selectedSession from the list
  if (isViewDialogOpen && selectedSession && sessionsData?.sessions) {
    const latest = sessionsData.sessions.find((s: TeacherSession) => s._id === selectedSession._id)
    if (latest && latest !== selectedSession) {
      setSelectedSession(latest)
    }
  }

  // 2) Poll in the background while dialog is open for near-real-time updates
  //    Cleans up automatically when dialog closes or component unmounts
  React.useEffect(() => {
    if (!isViewDialogOpen) return
    const interval = setInterval(() => {
      refetch()
    }, 5000)
    return () => clearInterval(interval)
  }, [isViewDialogOpen, refetch])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teacher Sessions</h1>
          {/* <p className="text-muted-foreground">
            View and manage teacher session data
          </p> */}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          {/* <CardDescription>
            Filter sessions by various criteria
          </CardDescription> */}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Teacher Filter */}
            <div className="space-y-2">
              <Label>Teacher</Label>
              <Select value={filterTeacher} onValueChange={setFilterTeacher}>
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teachers</SelectItem>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher._id} value={teacher.username}>
                      {teacher.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Course Class Filter */}
            {/* <div className="space-y-2">
              <Label>Course Class</Label>
              <Select value={filterCourseClass} onValueChange={setFilterCourseClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select course class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Course Classes</SelectItem>
                  {courseClasses.map((cc) => (
                    <SelectItem key={cc._id} value={cc.name}>
                      {cc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div> */}

            {/* Section Filter */}
            {/* <div className="space-y-2">
              <Label>Section</Label>
              <Select value={filterSection} onValueChange={setFilterSection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {sections.map((section) => (
                    <SelectItem key={section._id} value={section.name}>
                      {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div> */}

            {/* Subject Filter */}
            {/* <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject._id} value={subject.name}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div> */}

            {/* Date From */}
            <div className="space-y-2">
              <Label>Date From</Label>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
              />
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <Label>Date To</Label>
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
              />
            </div>

            {/* Session Status */}
            {/* <div className="space-y-2">
              <Label>Session Status</Label>
              <Select value={filterActive} onValueChange={setFilterActive}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sessions</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Ended</SelectItem>
                </SelectContent>
              </Select>
            </div> */}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <CardDescription>
            {/* {sessionsData && (
              <>Showing {sessionsData.pagination.total} total sessions</>
            )} */}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Clock className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">Loading sessions...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-sm text-destructive">Failed to load sessions</p>
            </div>
          ) : !sessionsData?.sessions.length ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">No sessions found</p>
            </div>
          ) : (
            <>
              {/* Sessions List */}
              <div className="space-y-2">
                {sessionsData.sessions.map((session: TeacherSession) => (
                  <Card key={session._id} className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          {/* Header */}
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{session.username}</h3>
                                {/* <Badge variant={session.active ? 'default' : 'secondary'}>
                                  {session.active ? 'Active' : 'Ended'}
                                </Badge> */}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {getName(session.courseClassName)} - {getName(session.sectionName)} - {getName(session.subjectName)}
                              </p>
                            </div>
                          </div>

                          {/* Details Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Login:</span>
                              <span className="font-medium">{format(new Date(session.loginTime), 'PPp')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Logout:</span>
                              <span className="font-medium">
                                {session.logoutTime 
                                  ? format(new Date(session.logoutTime), 'PPp') 
                                  : session.logoutAt 
                                  ? format(new Date(session.logoutAt), 'PPp') 
                                  : 'Session Active'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Duration:</span>
                              <span className="font-medium">
                                {(() => {
                                  const loginTime = new Date(session.loginTime).getTime()
                                  const logoutTime = session.logoutTime 
                                    ? new Date(session.logoutTime).getTime()
                                    : session.logoutAt 
                                    ? new Date(session.logoutAt).getTime()
                                    : Date.now()
                                  
                                  const durationMs = logoutTime - loginTime
                                  const durationMinutes = Math.round(durationMs / (1000 * 60))
                                  const hours = Math.floor(durationMinutes / 60)
                                  const minutes = durationMinutes % 60
                                  
                                  if (hours > 0) {
                                    return `${hours}h ${minutes}m`
                                  }
                                  return `${minutes}m`
                                })()}
                              </span>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="flex items-center gap-4 text-xs">
                            <div>
                              <span className="text-muted-foreground">File Accesses: </span>
                              <span className="font-medium">{session.fileAccessLog?.length || 0}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Sections: </span>
                              <span className="font-medium">{session.section?.length || 0}</span>
                            </div>
                            {/* {session.idleTime && (
                              <div>
                                <span className="text-muted-foreground">Idle Time: </span>
                                <span className="font-medium">{Math.round(session.idleTime / (1000 * 60))} min</span>
                              </div>
                            )}
                            {session.activeTime && (
                              <div>
                                <span className="text-muted-foreground">Active Time: </span>
                                <span className="font-medium">{Math.round(session.activeTime / (1000 * 60))} min</span>
                              </div>
                            )} */}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!session.logoutTime && !session.logoutAt && (
                            <Button 
                              onClick={() => handleLogoutSession(session)}
                              variant="destructive"
                              size="sm"
                            >
                              <LogOut className="h-4 w-4 mr-2" />
                              Force Logout
                            </Button>
                          )}
                          <Button 
                            onClick={() => handleViewSession(session)}
                            variant="outline"
                            size="sm"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {sessionsData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Page {sessionsData.pagination.page} of {sessionsData.pagination.totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <div className="text-sm font-medium">
                      {((page - 1) * limit) + 1}-{Math.min(page * limit, sessionsData.pagination.total)} of {sessionsData.pagination.total}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= sessionsData.pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* View Session Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Session Details</DialogTitle>
            <DialogDescription>
              Detailed information about this teacher session
            </DialogDescription>
          </DialogHeader>
          
          {selectedSession && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Teacher</Label>
                  <p className="font-medium">{selectedSession.username}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Course Class</Label>
                  <p className="font-medium">{getName((selectedSession as any).courseClass || (selectedSession as any).courseClassName)}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Section</Label>
                  <p className="font-medium">{getName((selectedSession as any).sectionName)}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Subject</Label>
                  <p className="font-medium">{getName((selectedSession as any).subject || (selectedSession as any).subjectName)}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Login Time</Label>
                  <p className="font-medium">{format(new Date(selectedSession.loginTime), 'PPpp')}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Logout Time</Label>
                  <p className="font-medium">
                    {selectedSession.logoutTime 
                      ? format(new Date(selectedSession.logoutTime), 'PPpp') 
                      : selectedSession.logoutAt 
                      ? format(new Date(selectedSession.logoutAt), 'PPpp') 
                      : 'Session Active'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Duration</Label>
                  <p className="font-medium">
                    {(() => {
                      const loginTime = new Date(selectedSession.loginTime).getTime()
                      const logoutTime = selectedSession.logoutTime 
                        ? new Date(selectedSession.logoutTime).getTime()
                        : selectedSession.logoutAt 
                        ? new Date(selectedSession.logoutAt).getTime()
                        : Date.now()
                      
                      const durationMs = logoutTime - loginTime
                      const durationMinutes = Math.round(durationMs / (1000 * 60))
                      const hours = Math.floor(durationMinutes / 60)
                      const minutes = durationMinutes % 60
                      
                      if (hours > 0) {
                        return `${hours}h ${minutes}m`
                      }
                      return `${minutes}m`
                    })()}
                  </p>
                </div>
               <div className="space-y-2">
                  <Label className="text-muted-foreground">Total Sessions</Label>
                  <p className="font-medium">{selectedSession.section?.length || 0}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">File Accesses</Label>
                  <p className="font-medium">{selectedSession.fileAccessLog?.length || 0}</p>
                </div>
              </div>

              
              {/* File Access Log */}
              {selectedSession.fileAccessLog && selectedSession.fileAccessLog.length > 0 && (
                <div className="pt-4 border-t">
                  <Label className="text-lg font-semibold mb-3 block">File Access Log</Label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedSession.fileAccessLog.map((file, index) => (
                      <div key={index} className="p-3 bg-muted/50 rounded-lg">
                        <p className="font-medium">{file.fileName}</p>
                       
                          {/* <p className="text-sm text-muted-foreground">Folder: {file?.folderName}</p> */}
                        
                        <p className="text-xs text-muted-foreground mt-1">
                          Accessed: {file?.accessedAt ? format(new Date(file.accessedAt), 'PPp') : 'N/A'}
                        </p>
                      
                          <p className="text-xs text-muted-foreground">
                            Opened: {file?.openedAt ? new Date(file.openedAt!).toLocaleString() : 'N/A'}
                          </p>
                       
                       
                          <p className="text-xs text-muted-foreground">
                            Closed: {file?.closedAt ? new Date(file.closedAt!).toLocaleString() : 'N/A'}
                          </p>
                      
                        
                          <p className="text-xs text-muted-foreground">
                            IdleTime: {file?.idleTime ? Math.round((file.idleTime ?? 0) / 1000) : 0} seconds
                          </p>
                       

                      
                          <p className="text-xs text-muted-foreground">
                            ActiveTime: {file?.activeTime ? Math.round((file.activeTime ?? 0) / 1000) : 0} seconds
                          </p>
                       
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sections/RRWeb Sessions */}
              {selectedSession.section && selectedSession.section.length > 0 && (
                <div className="pt-4 border-t">
                  <Label className="text-lg font-semibold mb-3 block">Recording Sessions</Label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedSession.section.map((section, index) => (
                      <div key={index} className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">Session {index + 1}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setReplaySection(section)
                              setIsReplayOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" /> View
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Start: {new Date(section.startTime).toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          End: {new Date(section.endTime).toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Duration: {Math.round(section.duration / 1000)} seconds
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Events: {section.events?.length || 0}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* RRWeb Replay Dialog */}
      <Dialog open={isReplayOpen} onOpenChange={setIsReplayOpen}>
        <DialogContent className="max-w-[98vw] max-h-[98vh] w-full h-full overflow-y-auto">
          {replaySection && (
            <RrwebSessionViewer
              events={replaySection.events}
              sessionId={replaySection.id}
              onClose={() => setIsReplayOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

