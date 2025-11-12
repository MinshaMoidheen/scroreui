import { SECTION_URL } from '@/constants'
import { baseApi } from './baseApi'

export interface Section {
  _id: string
  name: string
  courseClass: {
    _id: string
    name: string
  }
  createdAt?: string
  updatedAt?: string
}

export interface CreateSectionRequest {
  name: string
  courseClass: string
}

export interface UpdateSectionRequest {
  name?: string
  courseClass?: string
}

export const sectionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSections: builder.query<Section[], void>({
      query: () => SECTION_URL,
      providesTags: ['Section'],
    }),
    getSectionById: builder.query<Section, string>({
      query: (id) => `${SECTION_URL}/${id}`,
      providesTags: (result, error, id) => [{ type: 'Section', id }],
    }),
    createSection: builder.mutation<Section, CreateSectionRequest>({
      query: (section) => ({
        url: SECTION_URL,
        method: 'POST',
        body: section,
      }),
      invalidatesTags: ['Section'],
    }),
    updateSection: builder.mutation<Section, { id: string; data: UpdateSectionRequest }>({
      query: ({ id, data }) => ({
        url: `${SECTION_URL}/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Section', id },
        'Section',
      ],
    }),
    deleteSection: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `${SECTION_URL}/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Section'],
    }),
  }),
})

export const {
  useGetSectionsQuery,
  useGetSectionByIdQuery,
  useCreateSectionMutation,
  useUpdateSectionMutation,
  useDeleteSectionMutation,
} = sectionApi