import { baseApi } from './baseApi'

// File types
export interface FileItem {
  _id: string
  filename: string
  path: string
  mimetype: string
  size: number
  folder: string
  owner: {
    _id: string
    username: string
  }
  allowedUsers: string[]
  uploadedAt: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateFileRequest {
  file: File
  folder: string
  allowedUsers?: string[]
}

export interface UpdateFileRequest {
  filename?: string
  allowedUsers?: string[]
  file?: File
}

export interface FileUploadProgress {
  file: File
  progress: number
  status: 'uploading' | 'completed' | 'error'
  error?: string
}

export const fileApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all files
    getFiles: builder.query<FileItem[], void>({
      query: () => '/api/v1/files',
      providesTags: ['File'],
    }),

    // Get file by ID
    getFileById: builder.query<FileItem, string>({
      query: (id) => `/api/v1/files/${id}`,
      providesTags: (result, error, id) => [{ type: 'File', id }],
    }),

    // Create file (upload)
    createFile: builder.mutation<FileItem, CreateFileRequest>({
      query: ({ file, folder, allowedUsers = [] }) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', folder)
        if (allowedUsers.length > 0) {
          formData.append('allowedUsers', JSON.stringify(allowedUsers))
        }

        return {
          url: '/api/v1/files',
          method: 'POST',
          body: formData,
        }
      },
      invalidatesTags: (result, error, { folder }) => [
        'File',
        { type: 'File', id: 'LIST' },
        { type: 'File', id: folder }
      ],
    }),

    // Update file
    updateFile: builder.mutation<FileItem, { id: string; data: UpdateFileRequest }>({
      query: ({ id, data }) => {
        const formData = new FormData()
        
        if (data.filename) {
          formData.append('filename', data.filename)
        }
        if (data.allowedUsers) {
          formData.append('allowedUsers', JSON.stringify(data.allowedUsers))
        }
        if (data.file) {
          formData.append('file', data.file)
        }

        return {
          url: `/api/v1/files/${id}`,
          method: 'PATCH',
          body: formData,
        }
      },
      invalidatesTags: (result, error, { id }) => [{ type: 'File', id }, 'File'],
    }),

    // Delete file
    deleteFile: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/api/v1/files/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'File', id }, 'File'],
    }),

    // Get files by folder
    getFilesByFolder: builder.query<FileItem[], string>({
      query: (folderId) => `/api/v1/files/folder/${folderId}`,
      providesTags: (result, error, folderId) => [
        { type: 'File', id: 'LIST' },
        { type: 'File', id: folderId },
        ...(result?.map(({ _id }) => ({ type: 'File' as const, id: _id })) ?? [])
      ],
    }),
  }),
})

export const {
  useGetFilesQuery,
  useGetFileByIdQuery,
  useCreateFileMutation,
  useUpdateFileMutation,
  useDeleteFileMutation,
  useGetFilesByFolderQuery,
} = fileApi
