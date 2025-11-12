import { FOLDER_URL } from '@/constants'
import { baseApi } from './baseApi'

export interface Folder {
  _id: string
  folderName: string
  parent?: string
  files: string[]
  allowedUsers: {
    _id: string
    username: string
    email: string
    role: string
    access?: string
    createdAt: string
    updatedAt: string
    __v: number
  }[]
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
  createdAt: string
  updatedAt: string
}

export interface CreateFolderRequest {
  folderName: string
  parent?: string
  allowedUsers: string[]
  courseClass?: string
  section?: string
  subject?: string
}

export interface UpdateFolderRequest {
  folderName?: string
  parent?: string
  allowedUsers?: string[]
  courseClass?: string
  section?: string
  subject?: string
}

export interface GetFoldersParams {
  courseClass?: string
  section?: string
  subject?: string
}

export const folderApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFolders: builder.query<Folder[], GetFoldersParams | void>({
      query: (params) => {
        const queryParams = params ? new URLSearchParams() : undefined
        if (params) {
          if (params.courseClass) queryParams!.set('courseClass', params.courseClass)
          if (params.section) queryParams!.set('section', params.section)
          if (params.subject) queryParams!.set('subject', params.subject)
        }
        const url = queryParams ? `${FOLDER_URL}?${queryParams.toString()}` : FOLDER_URL
        return url
      },
      providesTags: ['Folder'],
    }),
    getFolderById: builder.query<Folder, string>({
      query: (id) => ({
        url: `${FOLDER_URL}/${id}`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [{ type: 'Folder', id }],
    }),
    createFolder: builder.mutation<Folder, CreateFolderRequest>({
      query: (folder) => ({
        url: FOLDER_URL,
        method: 'POST',
        body: folder,
      }),
      invalidatesTags: ['Folder'],
    }),
    updateFolder: builder.mutation<Folder, { id: string; data: UpdateFolderRequest }>({
      query: ({ id, data }) => ({
        url: `${FOLDER_URL}/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Folder', id },
        'Folder',
      ],
    }),
    deleteFolder: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `${FOLDER_URL}/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Folder'],
    }),
    getSubfolders: builder.query<Folder[], string>({
      query: (parentId) => ({
        url: `${FOLDER_URL}/subfolders/${parentId}`,
        method: 'GET',
      }),
      providesTags: (result, error, parentId) => [
        { type: 'Folder', id: 'LIST' },
        { type: 'Folder', id: `SUBFOLDERS-${parentId}` }
      ],
    }),
  }),
})

export const {
  useGetFoldersQuery,
  useGetFolderByIdQuery,
  useGetSubfoldersQuery,
  useCreateFolderMutation,
  useUpdateFolderMutation,
  useDeleteFolderMutation,
} = folderApi

