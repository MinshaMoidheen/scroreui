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
    getTeachers: builder.query<User[], void>({
      query: () => ({
        url: USER_URL,
        method: 'GET',
        
      }),
      providesTags: ['User'],
      transformResponse: (response: GetUsersResponse) => {
        // Filter to only show users with role 'teacher'
        return response.users.filter(user => user.role === 'teacher')
      },
    }),
    createTeacher: builder.mutation<{ message: string; user: User }, Omit<CreateUserRequest, 'role'>>({
      query: (teacher) => ({
        url: USER_URL,
        method: 'POST',
        body: {
          ...teacher,
          role: 'teacher' as const,
        },
      }),
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
} = userApi
