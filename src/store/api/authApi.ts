import { AUTH_URL } from '@/constants'
import { baseApi } from './baseApi'

export interface LoginRequest {
  email: string
  password: string
  courseClassId?: string
  sectionId?: string
  subjectId?: string
  deviceId?: string
}

export interface LoginResponse {
  user: {
    username: string
    email: string
    role: string
    access: string
  }
  accessToken: string
}

export interface LogoutUserResponse {
  code: string
  message: string
  targetUser: {
    username: string
    email: string
    role: string
  }
}

export interface TeacherLoginRequest {
  email: string
  password: string
  courseClassId: string
  sectionId: string
  subjectId: string
  deviceId?: string
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: `${AUTH_URL}/login`,
        method: 'POST',
        body: credentials,
      }),
    }),
    teacherLogin: builder.mutation<LoginResponse, TeacherLoginRequest>({
      query: (credentials) => ({
        url: `${AUTH_URL}/teacher-login`,
        method: 'POST',
        body: credentials,
      }),
    }),
    logout: builder.mutation<{ success: boolean; message: string }, void>({
      query: () => ({
        url: `${AUTH_URL}/logout`,
        method: 'POST',
      }),
    }),
    logoutUser: builder.mutation<LogoutUserResponse, string>({
      query: (userId) => ({
        url: `${AUTH_URL}/logout/${userId}`,
        method: 'POST',
      }),
    }),
  }),
})

export const { useLoginMutation, useTeacherLoginMutation, useLogoutMutation, useLogoutUserMutation } = authApi
