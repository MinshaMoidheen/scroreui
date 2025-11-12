import { baseApi } from './baseApi'

const LOGS_URL = '/api/v1/logs'

// Backend Log Types (from API response)
export interface BackendLog {
  _id: string
  companyId: string
  action: string
  module: string
  description: string
  userRole: string
  userId: string | {
    _id: string
    username?: string
    email?: string
    firstName?: string
    lastName?: string
  }
  userEmail?: string
  userName?: string
  documentId?: string
  changes?: Array<{
    field: string
    oldValue?: any
    newValue?: any
  }>
  ip?: string
  userAgent?: string
  timestamp: string
}

// Frontend Log Entry Types
export interface LogEntry {
  id: string
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'success'
  category: 'auth' | 'database' | 'file' | 'system' | 'user'
  message: string
  userId?: string
  userName?: string
  ipAddress?: string
  userAgent?: string
  details?: string
  duration?: number
  status?: string
}

export interface GetLogsParams {
  page?: number
  limit?: number
  action?: string
  module?: string
  userRole?: string
  userId?: string
  userEmail?: string
  startDate?: string
  endDate?: string
  companyId?: string
}

export interface GetLogsResponse {
  success: boolean
  data: BackendLog[]
  pagination: {
    currentPage: number
    totalPages: number
    totalLogs: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

// Helper function to map backend log to frontend LogEntry
const mapBackendLogToLogEntry = (backendLog: BackendLog): LogEntry => {
  // Map action/module to level
  const getLevel = (action: string, module: string): 'info' | 'warning' | 'error' | 'success' => {
    const actionUpper = action.toUpperCase()
    if (actionUpper.includes('ERROR') || actionUpper.includes('FAIL')) {
      return 'error'
    }
    if (actionUpper.includes('WARN')) {
      return 'warning'
    }
    if (actionUpper.includes('CREATE') || actionUpper.includes('UPDATE') || actionUpper.includes('DELETE')) {
      return 'success'
    }
    return 'info'
  }

  // Map module to category
  const getCategory = (module: string): 'auth' | 'database' | 'file' | 'system' | 'user' => {
    const moduleUpper = module.toUpperCase()
    if (moduleUpper.includes('AUTH') || moduleUpper.includes('LOGIN') || moduleUpper.includes('LOGOUT')) {
      return 'auth'
    }
    if (moduleUpper.includes('DATABASE') || moduleUpper.includes('DB')) {
      return 'database'
    }
    if (moduleUpper.includes('FILE') || moduleUpper.includes('FOLDER')) {
      return 'file'
    }
    if (moduleUpper.includes('USER') || moduleUpper.includes('PROFILE')) {
      return 'user'
    }
    return 'system'
  }

  // Get user name from populated userId or userName field
  let userName: string | undefined
  if (typeof backendLog.userId === 'object' && backendLog.userId !== null) {
    userName = backendLog.userId.username || 
               `${backendLog.userId.firstName || ''} ${backendLog.userId.lastName || ''}`.trim() ||
               backendLog.userId.email
  } else {
    userName = backendLog.userName
  }

  // Build details from changes if available
  let details: string | undefined
  if (backendLog.changes && backendLog.changes.length > 0) {
    details = backendLog.changes.map(change => 
      `${change.field}: ${change.oldValue} → ${change.newValue}`
    ).join(', ')
  } else if (backendLog.documentId) {
    details = `Document ID: ${backendLog.documentId}`
  }

  return {
    id: backendLog._id,
    timestamp: backendLog.timestamp,
    level: getLevel(backendLog.action, backendLog.module),
    category: getCategory(backendLog.module),
    message: backendLog.description,
    userId: typeof backendLog.userId === 'string' ? backendLog.userId : backendLog.userId?._id,
    userName,
    ipAddress: backendLog.ip,
    userAgent: backendLog.userAgent,
    details,
    // Extract status from action if it contains status code
    status: backendLog.action.match(/\d{3}/)?.[0],
  }
}

export const logsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLogs: builder.query<{ logs: LogEntry[]; pagination: GetLogsResponse['pagination'] }, GetLogsParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams()
        
        if (params) {
          if (params.page) queryParams.set('page', params.page.toString())
          if (params.limit) queryParams.set('limit', params.limit.toString())
          if (params.action) queryParams.set('action', params.action)
          if (params.module) queryParams.set('module', params.module)
          if (params.userRole) queryParams.set('userRole', params.userRole)
          if (params.userId) queryParams.set('userId', params.userId)
          if (params.userEmail) queryParams.set('userEmail', params.userEmail)
          if (params.startDate) queryParams.set('startDate', params.startDate)
          if (params.endDate) queryParams.set('endDate', params.endDate)
          if (params.companyId) queryParams.set('companyId', params.companyId)
        }

        const url = queryParams.toString() 
          ? `${LOGS_URL}?${queryParams.toString()}`
          : LOGS_URL

        return {
          url,
          method: 'GET',
        }
      },
      transformResponse: (response: GetLogsResponse) => ({
        logs: response.data.map(mapBackendLogToLogEntry),
        pagination: response.pagination,
      }),
      providesTags: ['Log'],
    }),
  }),
  overrideExisting: false,
})

export const { useGetLogsQuery } = logsApi

