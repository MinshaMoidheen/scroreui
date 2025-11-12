'use client'

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
  Download, 
  FileSpreadsheet, 
  FileText, 
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { 
  useGetTeacherSessionsQuery,
  useLazyExportIndividualSessionQuery,
  useLazyExportBulkSessionsPDFQuery,
  useLazyExportBulkSessionsExcelQuery,
  
} from '@/store/api/teacherSessionApi'
import { useGetTeachersQuery } from '@/store/api/userApi'
import { useGetCourseClassesQuery } from '@/store/api/courseClassApi'
import { useGetSectionsQuery } from '@/store/api/sectionApi'
import { useGetSubjectsQuery } from '@/store/api/subjectApi'
import { toast } from '@/hooks/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function ExportPage() {
  const [exportType, setExportType] = useState<'individual' | 'bulk'>('individual')
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'excel'>('pdf')
  const [isExporting, setIsExporting] = useState(false)
  
  // Helper function to safely extract name from object or string
  const getName = (value: any): string => {
    if (!value) return 'N/A'
    if (typeof value === 'string') return value
    if (typeof value === 'object' && value.name) return value.name
    if (typeof value === 'object' && value._id) return String(value._id)
    return String(value)
  }
  
  // Individual export state
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all')
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  
  // Helper function to get first and last day of current month
  const getMonthDateRange = () => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    const formatDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    return {
      firstDay: formatDate(firstDay),
      lastDay: formatDate(lastDay)
    }
  }
  
  const { firstDay, lastDay } = getMonthDateRange()

  // Bulk export filters
  const [filterUsername, setFilterUsername] = useState('all')
  const [filterCourseClass, setFilterCourseClass] = useState('all')
  const [filterSection, setFilterSection] = useState('all')
  const [filterSubject, setFilterSubject] = useState('all')
  const [filterDateFrom, setFilterDateFrom] = useState(firstDay)
  const [filterDateTo, setFilterDateTo] = useState(lastDay)
  // const [filterActive, setFilterActive] = useState<string>('all')

  // Fetch dropdown data
  const { data: teachers = [], isLoading: isLoadingTeachers } = useGetTeachersQuery()
  const { data: courseClasses = [], isLoading: isLoadingCourseClasses } = useGetCourseClassesQuery()
  const { data: sections = [], isLoading: isLoadingSections } = useGetSectionsQuery()
  const { data: subjects = [], isLoading: isLoadingSubjects } = useGetSubjectsQuery()

  // Fetch teacher sessions with optional username filter
  const { data: sessionsData, isLoading: isLoadingSessions, error: sessionsError } = useGetTeacherSessionsQuery({
    limit: 100,
    sortBy: 'loginAt',
    sortOrder: 'desc',
    username: selectedTeacher && selectedTeacher !== 'all' ? selectedTeacher : undefined
  })

  // Export queries
  const [exportIndividual] = useLazyExportIndividualSessionQuery()
  const [exportBulkPDF] = useLazyExportBulkSessionsPDFQuery()
  const [exportBulkExcel] = useLazyExportBulkSessionsExcelQuery()

  const handleExport = async () => {
    try {
    setIsExporting(true)
    
      let blob: Blob
      
      if (exportType === 'individual') {
        if (!selectedSessionId) {
          toast({
            title: "No Session Selected",
            description: "Please select a session to export",
            variant: "destructive",
          })
          setIsExporting(false)
          return
        }

        const result = await exportIndividual({
          id: selectedSessionId,
          type: selectedFormat
        }).unwrap()
        
        blob = result
      } else {
        // Build bulk export params
        const params: {
          username?: string
          courseClassName?: string
          sectionName?: string
          subjectName?: string
          dateFrom?: string
          dateTo?: string
          format: 'pdf' | 'excel'
        } = {
          format: selectedFormat
        }
        if (filterUsername && filterUsername !== 'all') params.username = filterUsername
        if (filterCourseClass && filterCourseClass !== 'all') params.courseClassName = filterCourseClass
        if (filterSection && filterSection !== 'all') params.sectionName = filterSection
        if (filterSubject && filterSubject !== 'all') params.subjectName = filterSubject
        if (filterDateFrom) params.dateFrom = filterDateFrom
        if (filterDateTo) params.dateTo = filterDateTo
       

        if (selectedFormat === 'pdf') {
          const result = await exportBulkPDF(params).unwrap()
          blob = result
        } else {
          const result = await exportBulkExcel(params).unwrap()
          blob = result
        }
      }

      // Create download link
      const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
      
      const timestamp = new Date().toISOString().split('T')[0]
      const extension = selectedFormat === 'pdf' ? 'pdf' : 'xlsx'
      
      if (exportType === 'individual') {
        const session = sessionsData?.sessions.find(s => s._id === selectedSessionId)
        a.download = `teacher-session-${session?.username || 'session'}-${timestamp}.${extension}`
      } else {
        a.download = `teacher-sessions-bulk-${timestamp}.${extension}`
      }
      
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast({
        title: "Export Successful",
        description: `Session(s) exported successfully as ${selectedFormat.toUpperCase()}`,
      })

    } catch (error: unknown) {
      console.error('Export error:', error)
      const errorMessage = (error && typeof error === 'object' && 'data' in error)
        ? (() => {
            const data = (error as { data?: unknown }).data
            if (data && typeof data === 'object' && 'message' in data) {
              const message = (data as { message?: unknown }).message
              if (typeof message === 'string') return message
            }
            return undefined
          })()
        : (error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string'
            ? (error as { message: string }).message
            : undefined)
      toast({
        title: "Export Failed",
        description: (errorMessage ?? "Failed to export session(s)") as string,
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const selectedSession = sessionsData?.sessions.find(s => s._id === selectedSessionId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Export Teacher Sessions</h1>
         
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Sidebar - Configuration */}
        <Card className="lg:col-span-1">
            <CardHeader>
            <CardTitle>Export Configuration</CardTitle>
              <CardDescription>
              Choose your export options
              </CardDescription>
            </CardHeader>
          <CardContent className="space-y-6">
            {/* Export Type */}
            <div className="space-y-2">
              <Label>Export Type</Label>
              <Select value={exportType} onValueChange={(value: 'individual' | 'bulk') => {
                setExportType(value)
                setSelectedSessionId('')
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select export type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Individual Session
                    </div>
                  </SelectItem>
                  <SelectItem value="bulk">
                <div className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Bulk Export
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              </div>
              
            {/* Format Selection */}
              <div className="space-y-2">
              <Label>Export Format</Label>
              <Select value={selectedFormat} onValueChange={(value: 'pdf' | 'excel') => setSelectedFormat(value)}>
                  <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                  <SelectItem value="pdf">
                          <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      PDF
                              </div>
                  </SelectItem>
                  <SelectItem value="excel">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Excel
                          </div>
                        </SelectItem>
                  </SelectContent>
                </Select>
              </div>

            {/* Export Button */}
                <Button 
                  onClick={handleExport}
              disabled={isExporting || (exportType === 'individual' && !selectedSessionId)}
              className="w-full"
              size="lg"
                >
                  {isExporting ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export Now
                    </>
                  )}
                </Button>
          </CardContent>
        </Card>

        {/* Right Side - Options */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {exportType === 'individual' ? 'Select Session' : 'Filter Sessions'}
            </CardTitle>
            <CardDescription>
              {exportType === 'individual' 
                ? 'Choose a teacher session to export'
                : 'Apply filters to export specific sessions'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {exportType === 'individual' ? (
              // Individual Session Selection
              <div className="space-y-4">
                {/* Teacher Selection */}
                <div className="space-y-2">
                  <Label>Select Teacher</Label>
                  <Select value={selectedTeacher} onValueChange={(value) => {
                    setSelectedTeacher(value)
                    setSelectedSessionId('') // Reset session when teacher changes
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Teachers</SelectItem>
                      {isLoadingTeachers ? (
                        <SelectItem value="loading" disabled>Loading...</SelectItem>
                      ) : (
                        teachers.map((teacher) => (
                          <SelectItem key={teacher._id} value={teacher.username}>
                            {teacher.username}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Session Selection */}
                <div className="space-y-2">
                  <Label>Select Session</Label>
                  <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a session" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingSessions ? (
                        <SelectItem value="loading" disabled>Loading sessions...</SelectItem>
                      ) : sessionsError ? (
                        <SelectItem value="error" disabled>Failed to load sessions</SelectItem>
                      ) : !sessionsData?.sessions.length ? (
                        <SelectItem value="none" disabled>No sessions found</SelectItem>
                      ) : (
                        sessionsData.sessions.map((session) => (
                          <SelectItem key={session._id} value={session._id}>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              <div className="flex flex-col">
                                <span className="font-medium">{getName(session.courseClassName)} - {getName(session.sectionName)}</span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(session.loginTime), 'PPp')}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {selectedSession && (
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <div className="font-medium mb-3">Session Details:</div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Username:</span>
                        <p className="font-medium">{selectedSession.username}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Class:</span>
                        <p className="font-medium">{getName(selectedSession.courseClassName)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Section:</span>
                        <p className="font-medium">{getName(selectedSession.sectionName)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Subject:</span>
                        <p className="font-medium">{getName(selectedSession.subjectName)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Login:</span>
                        <p className="font-medium">{format(new Date(selectedSession.loginTime), 'PPp')}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Logout:</span>
                        <p className="font-medium">
                          {selectedSession.logoutTime 
                            ? format(new Date(selectedSession.logoutTime), 'PPp') 
                            : selectedSession.logoutAt 
                            ? format(new Date(selectedSession.logoutAt), 'PPp') 
                            : 'Session Active'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Bulk Export Filters
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Teacher Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="username">Teacher</Label>
                    <Select value={filterUsername} onValueChange={setFilterUsername}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Teachers</SelectItem>
                        {isLoadingTeachers ? (
                          <SelectItem value="loading" disabled>Loading...</SelectItem>
                        ) : (
                          teachers.map((teacher) => (
                            <SelectItem key={teacher._id} value={teacher.username}>
                              {teacher.username}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Course Class Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="courseClass">Course Class</Label>
                    <Select value={filterCourseClass} onValueChange={setFilterCourseClass}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        {isLoadingCourseClasses ? (
                          <SelectItem value="loading" disabled>Loading...</SelectItem>
                        ) : (
                          courseClasses.map((cc) => (
                            <SelectItem key={cc._id} value={cc.name}>
                              {cc.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Section Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="section">Section</Label>
                    <Select value={filterSection} onValueChange={setFilterSection}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sections</SelectItem>
                        {isLoadingSections ? (
                          <SelectItem value="loading" disabled>Loading...</SelectItem>
                        ) : (
                          sections.map((section) => (
                            <SelectItem key={section._id} value={section.name}>
                              {section.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subject Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Select value={filterSubject} onValueChange={setFilterSubject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Subjects</SelectItem>
                        {isLoadingSubjects ? (
                          <SelectItem value="loading" disabled>Loading...</SelectItem>
                        ) : (
                          subjects.map((subject) => (
                            <SelectItem key={subject._id} value={subject.name}>
                              {subject.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date From */}
                  <div className="space-y-2">
                    <Label htmlFor="dateFrom">Date From</Label>
                    <Input
                      id="dateFrom"
                      type="date"
                      value={filterDateFrom}
                      onChange={(e) => setFilterDateFrom(e.target.value)}
                    />
                  </div>

                  {/* Date To */}
                  <div className="space-y-2">
                    <Label htmlFor="dateTo">Date To</Label>
                    <Input
                      id="dateTo"
                      type="date"
                      value={filterDateTo}
                      onChange={(e) => setFilterDateTo(e.target.value)}
                    />
        </div>
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
                      <SelectItem value="true">Active Only</SelectItem>
                      <SelectItem value="false">Ended Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div> */}

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    All sessions matching the filters will be exported in the selected format.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}