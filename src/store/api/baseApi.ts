import { BASE_URL } from '@/constants'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query'

// Custom base query with token expiration handling
const baseQuery = fetchBaseQuery({ 
  baseUrl: BASE_URL,
  credentials: 'include',
  prepareHeaders: (headers) => {
    // Add authorization header if token exists
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken')
      if (token) {
        headers.set('authorization', `Bearer ${token}`)
      }
    }
    return headers
  },
})

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions)
  
  // Check if the response is 401 (Unauthorized)
  if (result.error && result.error.status === 401) {
    // Clear stored authentication data
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user')
      localStorage.removeItem('accessToken')
      
      // Dispatch custom event to notify auth context
      window.dispatchEvent(new CustomEvent('tokenExpired'))
      
      // Show notification to user
      window.dispatchEvent(new CustomEvent('showToast', {
        detail: {
          title: 'Session Expired',
          description: 'Your session has expired. Please log in again.',
          variant: 'destructive'
        }
      }))
      
      // Redirect to login page
      window.location.href = '/auth/sign-in'
    }
  }
  
  return result
}

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [ 'CourseClass', 'Section','Subject', 'User', 'Folder', 'File', 'TeacherSession', 'Log', 'Meeting', 'Student'],
  endpoints: () => ({}),
})

export type { BaseQueryFn } from '@reduxjs/toolkit/query'


