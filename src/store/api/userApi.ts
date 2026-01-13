import { USER_URL } from '@/constants'
import { baseApi } from './baseApi'

export interface User {
  _id: string
  username: string
  email: string
  role: 'admin' | 'user' | 'superadmin' | 'teacher'
  createdAt?: string
  updatedAt?: string
}

export interface CreateUserRequest {
  username: string
  email: string
  password: string
  role?: 'admin' | 'user' | 'teacher'
}

export interface UpdateUserRequest {
  username?: string
  email?: string
  password?: string
}

export interface GetUsersResponse {
  users: User[]
  total: number
  limit: number
  offset: number
  pagination?: {
    currentPage: number
    totalPages: number
    hasMore: boolean
    totalItems: number
  }
}

export interface CreateTeacherRequest {
  username: string
  courseClassName: string
  sectionName: string
  subjectName: string
}

export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<GetUsersResponse, { limit?: number; offset?: number } | void>({
      query: () => {
      
        return {
          url: USER_URL,
          method: 'GET',
          
        }
      },
      providesTags: ['User'],
    }),
    getUserById: builder.query<User, string>({
      query: (id) => `${USER_URL}/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),
    createUser: builder.mutation<{ message: string; user: User }, CreateUserRequest>({
      query: (user) => ({
        url: USER_URL,
        method: 'POST',
        body: user,
      }),
      invalidatesTags: ['User'],
    }),
    updateUser: builder.mutation<{ message: string; user: User }, { id: string; data: UpdateUserRequest }>({
      query: ({ id, data }) => ({
        url: `${USER_URL}/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'User', id },
        'User',
      ],
    }),
    deleteUser: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `${USER_URL}/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
    // Teacher-specific endpoints (users with role 'teacher')
    getTeachers: builder.query<GetUsersResponse, { limit?: number; offset?: number } | void>({
      query: (params) => {
        const queryParams = new URLSearchParams()
        if (params && typeof params === 'object') {
          // Backend requires limit between 1-50, so we use max limit (50) when limit is 0
          const limit = params.limit === 0 ? 50 : (params.limit || 50)
          const offset = params.offset || 0
          queryParams.set('limit', limit.toString())
          queryParams.set('offset', offset.toString())
        } else {
          // Default to max limit when no params
          queryParams.set('limit', '50')
          queryParams.set('offset', '0')
        }
        const queryString = queryParams.toString()
        return {
          url: `${USER_URL}?${queryString}`,
          method: 'GET',
        }
      },
      providesTags: ['User'],
    }),
    createTeacher: builder.mutation<{ message: string; user: User }, Omit<CreateUserRequest, 'role'>>({
      query: (teacher) => {
        // Explicitly construct body with only required fields and set role to 'teacher'
        return {
          url: USER_URL,
          method: 'POST',
          body: {
            username: teacher.username,
            email: teacher.email,
            password: teacher.password,
            role: 'teacher' as const,
          },
        }
      },
      invalidatesTags: ['User'],
    }),
    updateTeacher: builder.mutation<{ message: string; user: User }, { id: string; data: UpdateUserRequest }>({
      query: ({ id, data }) => ({
        url: `${USER_URL}/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'User', id },
        'User',
      ],
    }),
    deleteTeacher: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `${USER_URL}/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
    // Student-specific endpoints (users with role 'user')
    getStudents: builder.query<User[], void>({
      query: () => ({
        url: USER_URL,
        method: 'GET',
      }),
      providesTags: ['User'],
      transformResponse: (response: GetUsersResponse) => {
        // Filter to only show users with role 'user'
        return response.users.filter(user => user.role === 'user')
      },
    }),
    createStudent: builder.mutation<{ message: string; user: User }, Omit<CreateUserRequest, 'role'>>({
      query: (student) => ({
        url: USER_URL,
        method: 'POST',
        body: {
          ...student,
          role: 'user' as const,
        },
      }),
      invalidatesTags: ['User'],
    }),
    updateStudent: builder.mutation<{ message: string; user: User }, { id: string; data: UpdateUserRequest }>({
      query: ({ id, data }) => ({
        url: `${USER_URL}/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'User', id },
        'User',
      ],
    }),
    deleteStudent: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `${USER_URL}/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
  }),
})

export const {
  useGetUsersQuery,
  useGetUserByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetTeachersQuery,
  useCreateTeacherMutation,
  useUpdateTeacherMutation,
  useDeleteTeacherMutation,
  useGetStudentsQuery,
  useCreateStudentMutation,
  useUpdateStudentMutation,
  useDeleteStudentMutation,
} = userApi
