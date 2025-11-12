import { TEACHERSESSION_URL } from '@/constants'
import { baseApi } from './baseApi'

// Teacher Session Types
export interface SessionEvent {
  type: number
  data: unknown
  timestamp: number
}

export interface SessionSection {
  id: string
  startTime: string
  endTime: string
  duration: number
  events: SessionEvent[]
}

export interface FileAccessLog {
  fileId: string
  fileName: string
  folderId?: string
  folderName?: string
  accessedAt: string
  openedAt?: string // File open time timestamp
  closedAt?: string // File closing time timestamp
  duration?: number // File open duration in milliseconds
  idleTime?: number // Idle time for this file session
  activeTime?: number // Active time for this file session
}

export interface TeacherSession {
  _id: string
  username: string
  courseClassName: string
  sectionName: string
  subjectName: string
  sessionToken: string
  deviceId?: string
  loginAt: string
  logoutAt?: string
  active: boolean
  fileAccessLog: FileAccessLog[]
  lastActiveAt: string
  loginTime: string
  logoutTime?: string
  idleTime: number // in milliseconds
  activeTime: number // in milliseconds
  section: SessionSection[]
}

export interface CreateTeacherSessionRequest {
    username : string
    courseClassName: string
    sectionName: string
    subjectName: string
    sessionToken: string
}

export interface CreateTeacherSessionResponse {
    message: string
    session: {
        id: string
        username: string
        courseClassName: string
        sectionName: string
        subjectName: string
        sessionToken: string
        deviceId?: string
        loginAt: string
        logoutAt?: string
    }
}

export interface UpdateTeacherSessionRequest {
    username : string
    courseClassName: string
    sectionName: string
    subjectName: string
    sessionToken: string
    // New fields for file tracking and session data
    fileAccessLog?: FileAccessLog[]
    idleTime?: number
    activeTime?: number
    section?: SessionSection[]
    lastActiveAt?: string
}

export interface GetTeacherSessionsParams {
  page?: number
  limit?: number
  username?: string
  courseClassName?: string
  sectionName?: string
  subjectName?: string
  active?: boolean
  dateFrom?: string
  dateTo?: string
  sortBy?: 'loginAt' | 'lastActiveAt' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export interface SearchTeacherSessionsParams {
  query?: string
  username?: string
  courseClassName?: string
  sectionName?: string
  subjectName?: string
  active?: boolean
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
  sortBy?: 'loginAt' | 'lastActiveAt' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export interface TeacherSessionsResponse {
  sessions: TeacherSession[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface SessionSections {
  sessionId: string
  sections: SessionSection[]
}

export interface ExportBulkSessionsParams {
  username?: string
  courseClassName?: string
  sectionName?: string
  subjectName?: string
  active?: boolean
  dateFrom?: string
  dateTo?: string
  format: 'pdf' | 'excel'
}

export const teacherSessionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all teacher sessions with pagination and filtering
    getTeacherSessions: builder.query<TeacherSessionsResponse, GetTeacherSessionsParams | void>({
      query: (params) => {
        const queryParams = params ? new URLSearchParams() : undefined
        if (params) {
          if (params.page) queryParams!.set('page', params.page.toString())
          if (params.limit) queryParams!.set('limit', params.limit.toString())
          if (params.username) queryParams!.set('username', params.username)
          if (params.courseClassName) queryParams!.set('courseClassName', params.courseClassName)
          if (params.sectionName) queryParams!.set('sectionName', params.sectionName)
          if (params.subjectName) queryParams!.set('subjectName', params.subjectName)
          if (params.active !== undefined) queryParams!.set('active', params.active.toString())
          if (params.dateFrom) queryParams!.set('dateFrom', params.dateFrom)
          if (params.dateTo) queryParams!.set('dateTo', params.dateTo)
          if (params.sortBy) queryParams!.set('sortBy', params.sortBy)
          if (params.sortOrder) queryParams!.set('sortOrder', params.sortOrder)
        }
        const url = queryParams ? `${TEACHERSESSION_URL}?${queryParams.toString()}` : TEACHERSESSION_URL
        return url
      },
      providesTags: ['TeacherSession'],
    }),

    // Search teacher sessions with advanced filtering
    searchTeacherSessions: builder.query<TeacherSessionsResponse, SearchTeacherSessionsParams>({
      query: (params) => {
        const queryParams = new URLSearchParams()
        if (params.query) queryParams.set('query', params.query)
        if (params.username) queryParams.set('username', params.username)
        if (params.courseClassName) queryParams.set('courseClassName', params.courseClassName)
        if (params.sectionName) queryParams.set('sectionName', params.sectionName)
        if (params.subjectName) queryParams.set('subjectName', params.subjectName)
        if (params.active !== undefined) queryParams.set('active', params.active.toString())
        if (params.dateFrom) queryParams.set('dateFrom', params.dateFrom)
        if (params.dateTo) queryParams.set('dateTo', params.dateTo)
        if (params.page) queryParams.set('page', params.page.toString())
        if (params.limit) queryParams.set('limit', params.limit.toString())
        if (params.sortBy) queryParams.set('sortBy', params.sortBy)
        if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder)
        
        return `${TEACHERSESSION_URL}/search?${queryParams.toString()}`
      },
      providesTags: ['TeacherSession'],
    }),

    // Get teacher session by ID
    getTeacherSessionById: builder.query<TeacherSession, string>({
      query: (id) => `${TEACHERSESSION_URL}/${id}`,
      providesTags: (result, error, id) => [{ type: 'TeacherSession', id }],
    }),

    // Create new teacher session
    createTeacherSession: builder.mutation<CreateTeacherSessionResponse, CreateTeacherSessionRequest>({
      query: (session) => ({
        url: TEACHERSESSION_URL,
        method: 'POST',
        body: session,
      }),
      invalidatesTags: ['TeacherSession'],
    }),

    // Update teacher session
    updateTeacherSession: builder.mutation<TeacherSession, { id: string; data: UpdateTeacherSessionRequest }>({
      query: ({ id, data }) => ({
        url: `${TEACHERSESSION_URL}/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'TeacherSession', id },
        'TeacherSession',
      ],
    }),

    // Get sections by session ID
    getSectionsBySession: builder.query<SessionSections, string>({
      query: (id) => ({
        url: `${TEACHERSESSION_URL}/${id}/sections`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [
        { type: 'TeacherSession', id: `${id}-sections` },
      ],
    }),

    // Delete teacher session
    deleteTeacherSession: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `${TEACHERSESSION_URL}/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['TeacherSession'],
    }),

    // Export individual session
    exportIndividualSession: builder.query<Blob, { id: string; type?: 'pdf' | 'excel' }>({
      query: ({ id, type }) => {
        const queryParams = new URLSearchParams()
        if (type) queryParams.set('type', type)
        const url = queryParams.toString() 
          ? `${TEACHERSESSION_URL}/export/individual/${id}?${queryParams.toString()}`
          : `${TEACHERSESSION_URL}/export/individual/${id}`
        
        return {
          url,
          responseHandler: async (response) => {
            const blob = await response.blob()
            return blob
          },
        }
      },
    }),

    // Export bulk sessions as PDF
    exportBulkSessionsPDF: builder.query<Blob, ExportBulkSessionsParams>({
      query: (params) => {
        const queryParams = new URLSearchParams()
        if (params.username) queryParams.set('username', params.username)
        if (params.courseClassName) queryParams.set('courseClassName', params.courseClassName)
        if (params.sectionName) queryParams.set('sectionName', params.sectionName)
        if (params.subjectName) queryParams.set('subjectName', params.subjectName)
        if (params.active !== undefined) queryParams.set('active', params.active.toString())
        if (params.dateFrom) queryParams.set('dateFrom', params.dateFrom)
        if (params.dateTo) queryParams.set('dateTo', params.dateTo)
        
        return {
          url: `${TEACHERSESSION_URL}/export/bulk/pdf?${queryParams.toString()}`,
          responseHandler: async (response) => {
            const blob = await response.blob()
            return blob
          },
        }
      },
    }),

    // Export bulk sessions as Excel
    exportBulkSessionsExcel: builder.query<Blob, ExportBulkSessionsParams>({
      query: (params) => {
        const queryParams = new URLSearchParams()
        if (params.username) queryParams.set('username', params.username)
        if (params.courseClassName) queryParams.set('courseClassName', params.courseClassName)
        if (params.sectionName) queryParams.set('sectionName', params.sectionName)
        if (params.subjectName) queryParams.set('subjectName', params.subjectName)
        if (params.active !== undefined) queryParams.set('active', params.active.toString())
        if (params.dateFrom) queryParams.set('dateFrom', params.dateFrom)
        if (params.dateTo) queryParams.set('dateTo', params.dateTo)
        
        return {
          url: `${TEACHERSESSION_URL}/export/bulk/excel?${queryParams.toString()}`,
          responseHandler: async (response) => {
            const blob = await response.blob()
            return blob
          },
        }
      },
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetTeacherSessionsQuery,
  useSearchTeacherSessionsQuery,
  useGetTeacherSessionByIdQuery,
  useCreateTeacherSessionMutation,
  useUpdateTeacherSessionMutation,
  useDeleteTeacherSessionMutation,
  useGetSectionsBySessionQuery,
  useLazyExportIndividualSessionQuery,
  useLazyExportBulkSessionsPDFQuery,
  useLazyExportBulkSessionsExcelQuery,
} = teacherSessionApi