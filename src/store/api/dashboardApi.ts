import { DASHBOARD_URL } from '@/constants'
import { baseApi } from './baseApi'

export interface DashboardStats {
  totalTeachers: number
  totalCourseClasses: number
  totalSubjects: number
  totalParentFolders: number
}

export interface TeacherDurationData {
  teacherName: string
  duration: number // Duration in hours
}

export interface TopTeacher {
  username: string
  email: string
  totalActiveTime: number
  totalActiveTimeHours: number
  totalSessions: number
  avgActiveTime: number
}

export interface DashboardData {
  stats: DashboardStats
  teacherDurationGraph: TeacherDurationData[]
  topTeachers: TopTeacher[]
}

export interface DashboardResponse {
  message: string
  stats: DashboardStats
  teacherDurationGraph: TeacherDurationData[]
  topTeachers: TopTeacher[]
}

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardStats: builder.query<DashboardData, void>({
      query: () => ({
        url: DASHBOARD_URL,
        method: 'GET',
      }),
      transformResponse: (response: DashboardResponse): DashboardData => ({
        stats: response.stats,
        teacherDurationGraph: response.teacherDurationGraph,
        topTeachers: response.topTeachers,
      }),
    }),
  }),
})

export const { useGetDashboardStatsQuery } = dashboardApi

