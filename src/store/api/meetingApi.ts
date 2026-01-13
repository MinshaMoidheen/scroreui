import { baseApi } from './baseApi'
import { STUDENT_URL } from '@/constants'

const MEETING_URL = '/api/v1/meetings'

export interface User {
  _id: string
  username: string
  email: string
}

export interface Meeting {
  _id: string
  title: string
  description?: string
  date: string
  startTime: string
  endTime: string
  courseClass?: {
    _id: string
    name: string
  }
  section?: {
    _id: string
    name: string
  }
  subject?: {
    _id: string
    name: string
  }
  organizer: User
  participants?: User[]
  createdAt?: string
  updatedAt?: string
}

export interface CreateMeetingRequest {
  title: string
  description?: string
  date: string
  startTime: string
  endTime: string
  courseClass?: string
  section?: string
  subject?: string
  participants?: string[]
}

export interface UpdateMeetingRequest {
  title?: string
  description?: string
  date?: string
  startTime?: string
  endTime?: string
  courseClass?: string
  section?: string
  subject?: string
  participants?: string[]
}

export interface GetMyMeetingsParams {
  courseClass?: string
  section?: string
  subject?: string
}

export const meetingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMeetings: builder.query<Meeting[], void>({
      query: () => ({
        url: MEETING_URL,
        method: 'GET',
      }),
      providesTags: ['Meeting'],
    }),
    getMyMeetings: builder.query<Meeting[], GetMyMeetingsParams | void>({
      query: (params) => {
        const queryParams = new URLSearchParams()
        if (params?.courseClass) {
          queryParams.append('courseClass', params.courseClass)
        }
        if (params?.section) {
          queryParams.append('section', params.section)
        }
        if (params?.subject) {
          queryParams.append('subject', params.subject)
        }
        const queryString = queryParams.toString()
        return `${MEETING_URL}/my-meetings${queryString ? `?${queryString}` : ''}`
      },
      providesTags: ['Meeting'],
    }),
    getMeetingById: builder.query<Meeting, string>({
      query: (id) => `${MEETING_URL}/${id}`,
      providesTags: (result, error, id) => [{ type: 'Meeting', id }],
    }),
    createMeeting: builder.mutation<Meeting, CreateMeetingRequest>({
      query: (meeting) => ({
        url: MEETING_URL,
        method: 'POST',
        body: meeting,
      }),
      invalidatesTags: ['Meeting'],
    }),
    updateMeeting: builder.mutation<Meeting, { id: string; data: UpdateMeetingRequest }>({
      query: ({ id, data }) => ({
        url: `${MEETING_URL}/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Meeting', id },
        'Meeting',
      ],
    }),
    deleteMeeting: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `${MEETING_URL}/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Meeting'],
    }),
    // Student-specific endpoints
    getStudentMeetings: builder.query<Meeting[], void>({
      query: () => ({
        url: `${STUDENT_URL}/meetings`,
        method: 'GET',
      }),
      providesTags: ['Meeting'],
    }),
    getStudentMeetingById: builder.query<Meeting, string>({
      query: (id) => ({
        url: `${STUDENT_URL}/meetings/${id}`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [{ type: 'Meeting', id }],
    }),
  }),
})

export const {
  useGetMeetingsQuery,
  useGetMyMeetingsQuery,
  useGetMeetingByIdQuery,
  useCreateMeetingMutation,
  useUpdateMeetingMutation,
  useDeleteMeetingMutation,
  useGetStudentMeetingsQuery,
  useGetStudentMeetingByIdQuery,
} = meetingApi

