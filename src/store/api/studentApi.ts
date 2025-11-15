import { STUDENT_URL } from '@/constants'
import { baseApi } from './baseApi'

export interface Student {
  _id: string
  username: string
  rollNumber: string
  role?: string
  courseClass: {
    _id: string
    name: string
  }
  section: {
    _id: string
    name: string
  }
  createdAt?: string
  updatedAt?: string
}

export interface CreateStudentRequest {
  username: string
  password: string
  courseClass: string
  section: string
  rollNumber: string
}

export interface UpdateStudentRequest {
  username?: string
  password?: string
  courseClass?: string
  section?: string
  rollNumber?: string
}

export interface GetStudentsResponse {
  students: Student[]
  total: number
  limit: number
  offset: number
}

export interface GetStudentsParams {
  limit?: number
  offset?: number
  courseClass?: string
  section?: string
}

export const studentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getStudents: builder.query<GetStudentsResponse, GetStudentsParams | void>({
      query: (params) => {
        const searchParams = new URLSearchParams()
        if (params?.limit) searchParams.append('limit', params.limit.toString())
        if (params?.offset) searchParams.append('offset', params.offset.toString())
        if (params?.courseClass) searchParams.append('courseClass', params.courseClass)
        if (params?.section) searchParams.append('section', params.section)
        
        const queryString = searchParams.toString()
        return {
          url: queryString ? `${STUDENT_URL}?${queryString}` : STUDENT_URL,
          method: 'GET',
        }
      },
      providesTags: ['Student'],
    }),
    getStudentById: builder.query<{ student: Student }, string>({
      query: (id) => `${STUDENT_URL}/${id}`,
      providesTags: (result, error, id) => [{ type: 'Student', id }],
    }),
    createStudent: builder.mutation<{ message: string; student: Student }, CreateStudentRequest>({
      query: (student) => ({
        url: STUDENT_URL,
        method: 'POST',
        body: student,
      }),
      invalidatesTags: ['Student'],
    }),
    updateStudent: builder.mutation<
      { message: string; student: Student },
      { id: string; data: UpdateStudentRequest }
    >({
      query: ({ id, data }) => ({
        url: `${STUDENT_URL}/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Student', id },
        'Student',
      ],
    }),
    deleteStudent: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `${STUDENT_URL}/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Student'],
    }),
  }),
})

export const {
  useGetStudentsQuery,
  useGetStudentByIdQuery,
  useCreateStudentMutation,
  useUpdateStudentMutation,
  useDeleteStudentMutation,
} = studentApi

