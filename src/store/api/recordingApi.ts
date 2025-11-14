import { STREAMING_SERVER_URL } from '@/constants'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query'

// Base query for streaming server
const streamingBaseQuery = fetchBaseQuery({
  baseUrl: STREAMING_SERVER_URL,
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

const streamingBaseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await streamingBaseQuery(args, api, extraOptions)
  
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

// RecordedVideo interface matching backend model
export interface RecordedVideo {
  _id: string
  filename: string
  section: {
    _id: string
    name?: string
  } | string
  created_at: string
}

export interface GetRecordingsParams {
  section_id: string
  page?: number
  page_size?: number
  date?: string
}

export const recordingApi = createApi({
  reducerPath: 'recordingApi',
  baseQuery: streamingBaseQueryWithReauth,
  tagTypes: ['RecordedVideo'],
  endpoints: (builder) => ({
    getRecordingsBySection: builder.query<RecordedVideo[], GetRecordingsParams>({
      query: ({ section_id, page = 1, page_size = 10, date }) => {
        const params = new URLSearchParams()
        params.append('page', page.toString())
        params.append('page_size', page_size.toString())
        if (date) {
          params.append('date', date)
        }
        return {
          url: `/api/videos/${section_id}?${params.toString()}`,
          method: 'GET',
        }
      },
      providesTags: ['RecordedVideo'],
    }),
  }),
})

export const { useGetRecordingsBySectionQuery } = recordingApi
