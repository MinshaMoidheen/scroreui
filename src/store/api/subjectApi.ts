import { SUBJECT_URL } from '@/constants'
import { baseApi } from './baseApi'

export interface Subject {
  _id: string
  name: string
  code: string
  description?: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateSubjectRequest {
  name: string
  code: string
  description?: string
}

export interface UpdateSubjectRequest {
  name?: string
  code?: string
  description?: string
}

export const subjectApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSubjects: builder.query<Subject[], void>({
      query: () => SUBJECT_URL,
      providesTags: ['Subject'],
    }),
    getSubjectById: builder.query<Subject, string>({
      query: (id) => `${SUBJECT_URL}/${id}`,
      providesTags: (result, error, id) => [{ type: 'Subject', id }],
    }),
    createSubject: builder.mutation<Subject, CreateSubjectRequest>({
      query: (subject) => ({
        url: SUBJECT_URL,
        method: 'POST',
        body: subject,
      }),
      invalidatesTags: ['Subject'],
    }),
    updateSubject: builder.mutation<Subject, { id: string; data: UpdateSubjectRequest }>({
      query: ({ id, data }) => ({
        url: `${SUBJECT_URL}/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Subject', id },
        'Subject',
      ],
    }),
    deleteSubject: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `${SUBJECT_URL}/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Subject'],
    }),
  }),
})

export const {
  useGetSubjectsQuery,
  useGetSubjectByIdQuery,
  useCreateSubjectMutation,
  useUpdateSubjectMutation,
  useDeleteSubjectMutation,
} = subjectApi
