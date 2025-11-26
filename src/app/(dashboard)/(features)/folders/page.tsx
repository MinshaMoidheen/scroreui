'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  FolderPlus, 
  Upload, 
  File, 
  Folder, 
  FolderOpen,
  Search,
  
  Download,
  Trash2,
  Edit,
  Eye,
  Users,
  BookOpen,
  GraduationCap,
  UserCheck,
 
  CheckCircle,
  AlertCircle,
  Clock,
  User
} from 'lucide-react'
import { FolderModal } from '@/components/folder-modal'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useAuth } from '@/context/auth-context'
import { useToast } from '@/hooks/use-toast'
import { ReactPdfViewer } from '@/components/react-pdf-viewer'
import { BASE_URL } from '@/constants'
import { 
  useGetFoldersQuery,
  useGetSubfoldersQuery,
  useCreateFolderMutation,
  useUpdateFolderMutation,
  useDeleteFolderMutation,
  Folder as FolderType,
  CreateFolderRequest,
  UpdateFolderRequest
} from '@/store/api/folderApi'
import {
  useGetFilesQuery,
  useGetFilesByFolderQuery,
  useGetFileByIdQuery,
  useCreateFileMutation,
  
  useDeleteFileMutation,
  FileItem,
  CreateFileRequest,
  FileUploadProgress
} from '@/store/api/fileApi'

// Local types



export default function FoldersPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const { toast } = useToast()
  // const [files, setFiles] = useState<FileItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [teacherSearch, setTeacherSearch] = useState('')
  const [subjectSearch, setSubjectSearch] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false)
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null)
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const [selectedVideoFile, setSelectedVideoFile] = useState<FileItem | null>(null)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [selectedPdfFile, setSelectedPdfFile] = useState<FileItem | null>(null)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [selectedImageFile, setSelectedImageFile] = useState<FileItem | null>(null)
  const [imageObjectUrl, setImageObjectUrl] = useState<string | null>(null)
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [folderToDelete, setFolderToDelete] = useState<FolderType | null>(null)
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null)
  const [fileDeleteConfirmOpen, setFileDeleteConfirmOpen] = useState(false)
  const [videoError, setVideoError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // API hooks
  const { data: folders = [], isLoading, error, refetch: refetchFolders } = useGetFoldersQuery(undefined, {
    skip: !isAuthenticated || authLoading,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  })
  const { data: subfolders = [], isLoading: isLoadingSubfolders } = useGetSubfoldersQuery(selectedFolder!, {
    skip: !isAuthenticated || authLoading || !selectedFolder,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  })

  // Debug logging
  console.log('Admin Folders - folders data:', folders)
  console.log('Admin Folders - subfolders data:', subfolders)
  console.log('Admin Folders - selectedFolder:', selectedFolder)
  console.log('Admin Folders - user role:', user?.role)
  const [createFolder, { isLoading: isCreating }] = useCreateFolderMutation()
  const [updateFolder, { isLoading: isUpdating }] = useUpdateFolderMutation()
  const [deleteFolder, { isLoading: isDeleting }] = useDeleteFolderMutation()

  // File API hooks
  const { data: allFiles = [], isLoading: isLoadingFiles,} = useGetFilesQuery(undefined, {
    skip: !isAuthenticated || authLoading,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  })

  console.log('All files from API:', allFiles)
  const { data: folderFiles = [], isLoading: isLoadingFolderFiles } = useGetFilesByFolderQuery(selectedFolder!, {
    skip: !isAuthenticated || authLoading || !selectedFolder,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  })

  // Debug logging
  console.log('Selected folder:', selectedFolder)
  console.log('Folder files from API:', folderFiles)
  console.log('Is loading folder files:', isLoadingFolderFiles)
  const [createFile ] = useCreateFileMutation()
  
  const [deleteFile, { isLoading: isDeletingFile }] = useDeleteFileMutation()

  // Get specific file data for modals
  const { data: modalFileData, isLoading: isLoadingModalFile } = useGetFileByIdQuery(selectedFileId || '', {
    skip: !selectedFileId,
    refetchOnMountOrArgChange: true,
  })

  // Load image as blob when image modal opens to avoid CORS/MIME/header issues
  useEffect(() => {
    const loadImageBlob = async () => {
      const file = modalFileData || selectedImageFile
      if (!isImageModalOpen || !file) return

      try {
        const url = `${BASE_URL}/api/v1/files/serve/${encodeURIComponent(file.filename)}`
        const response = await fetch(url, { credentials: 'include', mode: 'cors' })
        if (!response.ok) {
          console.error('Image fetch failed:', response.status, response.statusText)
          setImageObjectUrl(null)
          return
        }
        const blob = await response.blob()
        const objectUrl = URL.createObjectURL(blob)
        setImageObjectUrl(objectUrl)
      } catch (err) {
        console.error('Image fetch error:', err)
        setImageObjectUrl(null)
      }
    }

    loadImageBlob()

    return () => {
      setImageObjectUrl(prev => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    }
  }, [isImageModalOpen, selectedImageFile, modalFileData])

  // Filter folders based on search term
  const filteredFolders = useMemo(() => {
    const term = searchTerm.toLowerCase()
    const teacherTerm = teacherSearch.toLowerCase()
    const subjectTerm = subjectSearch.toLowerCase()

    return folders.filter(folder => {
      const matchesGeneral =
        folder.folderName.toLowerCase().includes(term) ||
        folder.courseClass?.name.toLowerCase().includes(term) ||
        folder.section?.name.toLowerCase().includes(term) ||
        folder.subject?.name.toLowerCase().includes(term)

      const matchesTeacher = teacherTerm
        ? Array.isArray(folder.allowedUsers) 
          ? folder.allowedUsers.some(user => {
              if (typeof user === 'object' && user !== null && user.username) {
                return user.username.toLowerCase().includes(teacherTerm)
              }
              return String(user).toLowerCase().includes(teacherTerm)
            })
          : String(folder.allowedUsers || '').toLowerCase().includes(teacherTerm)
        : true

      const matchesSubject = subjectTerm
        ? (folder.subject?.name || '').toLowerCase().includes(subjectTerm)
        : true

      return matchesGeneral && matchesTeacher && matchesSubject
    })
  }, [folders, searchTerm, teacherSearch, subjectSearch])

  // Get folders for the current view (root folders or subfolders)
  const currentFolders = useMemo(() => {
    if (selectedFolder) {
      // Use subfolders API when inside a folder
      return subfolders
    }
    // Use root folders when at root level
    return filteredFolders.filter(folder => !folder.parent)
  }, [filteredFolders, subfolders, selectedFolder])

  // No static files - files should only appear in their assigned folders

  // Get files for the selected folder (filter by teacher when provided)
  const currentFiles = useMemo(() => {
    if (!selectedFolder) return []
    const teacherTerm = teacherSearch.toLowerCase()
    const apiFiles = folderFiles || []
    
    // Filter by teacher if search term is provided
    if (teacherTerm) {
      return apiFiles.filter(file => 
        file.owner?.username?.toLowerCase().includes(teacherTerm)
      )
    }
    
    return apiFiles
  }, [folderFiles, selectedFolder, teacherSearch])

  // Get parent folder path
  const getParentPath = (folderId: string): string[] => {
    const folder = folders.find(f => f._id === folderId)
    if (!folder || !folder.parent) return [folderId]
    return [...getParentPath(folder.parent), folderId]
  }

  const getFolderPath = (): FolderType[] => {
    if (!selectedFolder) return []
    const pathIds = getParentPath(selectedFolder)
    return pathIds.map(id => folders.find(f => f._id === id)!).filter(Boolean)
  }

  const handleCreateFolder = () => {
    setEditingFolder(null)
    setIsFolderModalOpen(true)
  }

  const handleEditFolder = (folder: FolderType) => {
    setEditingFolder(folder)
    setIsFolderModalOpen(true)
  }

  const handleFolderModalSubmit = async (data: CreateFolderRequest | UpdateFolderRequest) => {
    try {
      console.log('Submitting folder data:', data)
      
      if (editingFolder) {
        const result = await updateFolder({
          id: editingFolder._id,
          data: data as UpdateFolderRequest
        }).unwrap()
        console.log('Folder updated successfully:', result)
        
        // Show success toast
        toast({
          title: "Folder Updated",
          description: `"${data.folderName}" has been updated successfully.`,
          variant: "default",
        })
      } else {
        const result = await createFolder(data as CreateFolderRequest).unwrap()
        console.log('Folder created successfully:', result)
        
        // Show success toast
        toast({
          title: "Folder Created",
          description: `"${data.folderName}" has been created successfully.`,
          variant: "default",
        })
      }
      
      setIsFolderModalOpen(false)
      setEditingFolder(null)
    } catch (error) {
      console.error('Error saving folder:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      
      // Show error toast
      toast({
        title: "Error",
        description: editingFolder ? "Failed to update folder. Please try again." : "Failed to create folder. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteFolder = (folder: FolderType) => {
    setFolderToDelete(folder)
    setDeleteConfirmOpen(true)
  }

  const confirmDeleteFolder = async () => {
    if (!folderToDelete) return

    try {
      await deleteFolder(folderToDelete._id).unwrap()
      setDeleteConfirmOpen(false)
      setFolderToDelete(null)
      
      // Show success toast
      toast({
        title: "Folder Deleted",
        description: `"${folderToDelete.folderName}" has been deleted successfully.`,
        variant: "default",
      })
    } catch (error) {
      console.error('Error deleting folder:', error)
      
      // Show error toast
      toast({
        title: "Error",
        description: "Failed to delete folder. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleViewFile = async (file: FileItem) => {
    setSelectedFileId(file._id)
    
    console.log('Opening file:', file)
    console.log('File path:', file.path)
    console.log('Full URL:', `${BASE_URL}${file.path}`)
    
    // Test if file is accessible
    try {
      const serveUrl = `${BASE_URL}/api/v1/files/serve/${encodeURIComponent(file.filename)}`
      const response = await fetch(serveUrl, { method: 'HEAD' })
      console.log('File accessibility test:', response.status, response.statusText)
      console.log('Tested URL:', serveUrl)
      if (!response.ok) {
        console.error('File not accessible:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('File fetch error:', error)
    }
    
    if (file.mimetype.startsWith('video/')) {
      setSelectedVideoFile(file)
      setVideoError(null)
      setIsVideoModalOpen(true)
    } else if (file.mimetype === 'application/pdf') {
      setSelectedPdfFile(file)
      setIsPdfModalOpen(true)
    } else if (file.mimetype.startsWith('image/')) {
      setSelectedImageFile(file)
      setIsImageModalOpen(true)
    } else if (file.mimetype.includes('spreadsheet') || file.mimetype.includes('excel') || file.filename.endsWith('.xlsx') || file.filename.endsWith('.xls')) {
      // Handle Excel files - open in new tab for now
      const serveUrl = `${BASE_URL}/api/v1/files/serve/${encodeURIComponent(file.filename)}`
      window.open(serveUrl, '_blank')
    }
  }

  const handleDeleteFile = (file: FileItem) => {
    setFileToDelete(file)
    setFileDeleteConfirmOpen(true)
  }

  const confirmDeleteFile = async () => {
    if (!fileToDelete) return

    try {
      await deleteFile(fileToDelete._id).unwrap()
      setFileDeleteConfirmOpen(false)
      setFileToDelete(null)
      
      // Show success toast
      toast({
        title: "File Deleted",
        description: `"${fileToDelete.filename}" has been deleted successfully.`,
        variant: "default",
      })
    } catch (error) {
      console.error('Error deleting file:', error)
      
      // Show error toast
      toast({
        title: "Error",
        description: "Failed to delete file. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDownloadFile = (file: FileItem) => {
    try {
      const link = document.createElement('a')
      link.href = `${BASE_URL}/api/v1/files/serve/${encodeURIComponent(file.filename)}`
      link.download = file.filename
      link.click()
    } catch (error) {
      console.error('Error downloading file:', error)
      toast({
        title: "Download Error",
        description: "Failed to download file. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    if (!selectedFolder) {
      toast({
        title: "Error",
        description: "Please select a folder before uploading files.",
        variant: "destructive",
      })
      return
    }

    if (!user?.username) {
      toast({
        title: "Error",
        description: "User not authenticated.",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    const progressItems: FileUploadProgress[] = files.map(file => ({
      file,
      progress: 0,
      status: 'uploading'
    }))
    setUploadProgress(progressItems)

    // Upload files one by one
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      try {
        // Update progress to show starting
        setUploadProgress(prev => 
          prev.map((item, index) => 
            index === i ? { ...item, progress: 10 } : item
          )
        )

        // Create file upload request
        const createFileRequest: CreateFileRequest = {
          file,
          folder: selectedFolder,
          allowedUsers: [] // You can modify this based on your requirements
        }

        // Update progress
        setUploadProgress(prev => 
          prev.map((item, index) => 
            index === i ? { ...item, progress: 50 } : item
          )
        )

        // Upload file
        const result = await createFile(createFileRequest).unwrap()
        
        // Mark as completed
        setUploadProgress(prev => 
          prev.map((item, index) => 
            index === i ? { ...item, progress: 100, status: 'completed' } : item
          )
        )

        console.log('File uploaded successfully:', result)
      } catch (error) {
        console.error('Error uploading file:', error)
        
        // Mark as error
        setUploadProgress(prev => 
          prev.map((item, index) => 
            index === i ? { 
              ...item, 
              status: 'error',
              error: error instanceof Error ? error.message : 'Upload failed'
            } : item
          )
        )

        toast({
          title: "Upload Error",
          description: `Failed to upload ${file.name}. Please try again.`,
          variant: "destructive",
        })
      }
    }
    
    setIsUploading(false)
    
    // Clear progress after a delay
    setTimeout(() => {
      setUploadProgress([])
    }, 2000)
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    // Show success message
    toast({
      title: "Upload Complete",
      description: `Successfully uploaded ${files.length} file(s).`,
      variant: "default",
    })
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith('video/')) return '🎥'
    if (mimetype.startsWith('audio/')) return '🎵'
    if (mimetype.includes('pdf')) return '📄'
    if (mimetype.includes('word') || mimetype.includes('document')) return '📝'
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return '📊'
    if (mimetype.includes('image/')) return '🖼️'
    return '📁'
  }

  const renderGridView = () => {
    // Combine folders and files for grid view
    const allItems = [
      ...currentFolders.map(folder => ({ ...folder, type: 'folder' as const })),
      ...currentFiles.map(file => ({ ...file, type: 'file' as const }))
    ]

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {allItems.map((item) => {
          if (item.type === 'folder') {
            const folder = item as FolderType & { type: 'folder' }
            return (
              <Card key={folder._id} className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Folder className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-medium truncate">
                          {folder.folderName}
                        </CardTitle>
                        {/* <div className="text-xs text-muted-foreground">
                          {folder.files.length} files
                        </div> */}
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditFolder(folder)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent 
                  className="pt-0 cursor-pointer"
                  onClick={() => setSelectedFolder(folder._id)}
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <BookOpen className="h-3 w-3" />
                      {folder.courseClass?.name || 'Null'}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {folder.section?.name || 'Null'}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <GraduationCap className="h-3 w-3" />
                      {folder.subject?.name || 'Null'}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <UserCheck className="h-3 w-3" />
                      {Array.isArray(folder.allowedUsers) 
                        ? folder.allowedUsers.map(user => {
                            if (typeof user === 'object' && user !== null && user.username) {
                              return user.username
                            }
                            return String(user)
                          }).join(', ')
                        : folder.allowedUsers}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          } else {
            const file = item as FileItem & { type: 'file' }
            return (
              <Card key={file._id} className="hover:shadow-md transition-shadow group">
                <CardHeader className="pb-3">
                  <div className="flex justify-between">
                    <div className="flex gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg h-12">
                        <span className="text-2xl">{getFileIcon(file.mimetype)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-medium truncate" title={file.filename}>
                          {file.filename.length > 10 ? `${file.filename.slice(0, 10)}...` : file.filename}
                        </CardTitle>
                        <div className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </div>
                      </div>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex flex-col items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewFile(file)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownloadFile(file)
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteFile(file)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(file.uploadedAt).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      {file.owner.username}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <File className="h-3 w-3" />
                      {file.mimetype}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          }
        })}
      </div>
    )
  }

  const renderListView = () => {
    // Combine folders and files for list view
    const allItems = [
      ...currentFolders.map(folder => ({ ...folder, type: 'folder' as const })),
      ...currentFiles.map(file => ({ ...file, type: 'file' as const }))
    ]

    return (
      <div className="space-y-2">
        {allItems.map((item) => {
          if (item.type === 'folder') {
            const folder = item as FolderType & { type: 'folder' }
            return (
              <Card key={folder._id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Folder className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <div className="font-medium">{folder.folderName}</div>
                        <div className="text-sm text-muted-foreground">
                          {folder.courseClass?.name} • {folder.section?.name} • {folder.subject?.name}
                        </div>
                      </div>
                      {/* <div className="text-sm text-muted-foreground">
                        {folder.files.length} files
                      </div> */}
                      <div className="text-sm text-muted-foreground">
                        {Array.isArray(folder.allowedUsers) 
                          ? folder.allowedUsers.map(user => {
                              if (typeof user === 'object' && user !== null && user.username) {
                                return user.username
                              }
                              return String(user)
                            }).join(', ')
                          : folder.allowedUsers}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedFolder(folder._id)}
                      >
                        <FolderOpen className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditFolder(folder)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteFolder(folder)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          } else {
            const file = item as FileItem & { type: 'file' }
            return (
              <Card key={file._id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{getFileIcon(file.mimetype)}</span>
                      <div className="flex-1">
                        <div className="font-medium" title={file.filename}>
                          {file.filename.length > 10 ? `${file.filename.slice(0, 10)}...` : file.filename}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {file.owner.username} • {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {file.mimetype}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          handleViewFile(file)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          handleDownloadFile(file)
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          handleDeleteFile(file)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          }
        })}
      </div>
    )
  }

  // Show loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Authenticating...</p>
        </div>
      </div>
    )
  }

  if (isLoading || (selectedFolder && isLoadingSubfolders) || isLoadingFiles || (selectedFolder && isLoadingFolderFiles)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            {selectedFolder ? 'Loading folder contents...' : 'Loading folders...'}
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error loading folders: {JSON.stringify(error)}</p>
          <Button onClick={() => refetchFolders()}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Folders</h1>
          <p className="text-muted-foreground">
            Manage folders, upload files, and organize your content
          </p>
        </div>
        <div className="flex items-center gap-2">
          
          <Button
            variant="outline"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? 'List View' : 'Grid View'}
          </Button>
          <Button onClick={handleCreateFolder}>
            <FolderPlus className="mr-2 h-4 w-4" />
            New Folder
          </Button>
        </div>
      </div>

      {/* Session Information */}
      {/* <UserSessionInfo /> */}

      {/* Breadcrumb */}
      {selectedFolder && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFolder(null)}
            >
              <Folder className="h-4 w-4 mr-1" />
              Root
            </Button>
            {getFolderPath().map((folder) => (
              <div key={folder._id} className="flex items-center gap-2">
                <span>/</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFolder(folder._id)}
                >
                  {folder.folderName}
                </Button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || !selectedFolder}
              size="sm"
              variant="outline"
            >
              <Upload className="mr-2 h-4 w-4" />
              {isUploading ? 'Uploading...' : 'Upload Files'}
            </Button>
            <Button onClick={handleCreateFolder} size="sm" variant="outline">
              <FolderPlus className="mr-2 h-4 w-4" />
              Create Subfolder
            </Button>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search folders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search teachers..."
            value={teacherSearch}
            onChange={(e) => setTeacherSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search subjects..."
            value={subjectSearch}
            onChange={(e) => setSubjectSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Uploading Files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {uploadProgress.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">{item.file.name}</span>
                  <span className="text-muted-foreground">
                    {item.status === 'uploading' && `${item.progress}%`}
                    {item.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {item.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                  </span>
                </div>
                <Progress value={item.progress} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileUpload}
        className="hidden"
        accept="*/*"
      />

      {/* Folders List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {selectedFolder ? 'Contents' : 'Folders & Files'} ({currentFolders.length + currentFiles.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {currentFolders.length === 0 && currentFiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {selectedFolder ? 'No contents found' : 'No folders or files found'}
            </div>
          ) : (
            viewMode === 'grid' ? renderGridView() : renderListView()
          )}
        </CardContent>
      </Card>

      {/* Folder Modal */}
      <FolderModal
        isOpen={isFolderModalOpen}
        onClose={() => {
          setIsFolderModalOpen(false)
          setEditingFolder(null)
        }}
        onSubmit={handleFolderModalSubmit}
        folder={editingFolder}
        parentFolders={folders}
        isLoading={isCreating || isUpdating}
        currentParentFolder={selectedFolder}
        parentFolderData={
          selectedFolder && !editingFolder
            ? folders.find((f) => f._id === selectedFolder) || 
              subfolders.find((f) => f._id === selectedFolder) || 
              null
            : null
        }
      />

      {/* Video Modal */}
      <Dialog open={isVideoModalOpen} onOpenChange={setIsVideoModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{modalFileData?.filename || selectedVideoFile?.filename}</DialogTitle>
            <DialogDescription>
              Video file • {modalFileData ? formatFileSize(modalFileData.size) : selectedVideoFile && formatFileSize(selectedVideoFile.size)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {isLoadingModalFile ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading video...</p>
                </div>
              </div>
            ) : (modalFileData || selectedVideoFile) && (
              <div className="relative">
                <video
                  controls
                  className="w-full h-auto max-h-[70vh] rounded-lg"
                  preload="none"
                  playsInline
                  crossOrigin="anonymous"
                  onError={(e) => {
                    console.error('Video load error:', e)
                    console.error('Video src (original):', `${BASE_URL}${(modalFileData || selectedVideoFile)?.path}`)
                    console.error('Video src (encoded):', `${BASE_URL}${encodeURI((modalFileData || selectedVideoFile)?.path || '')}`)
                    console.error('Video src (serve endpoint):', `${BASE_URL}/api/v1/files/serve/${encodeURIComponent((modalFileData || selectedVideoFile)?.filename || '')}`)
                    console.error('Video element:', e.target)
                    console.error('Error details:', e.nativeEvent)
                    console.error('Video error code:', e.currentTarget.error?.code)
                    console.error('Video error message:', e.currentTarget.error?.message)
                    console.error('Network state:', e.currentTarget.networkState)
                    console.error('Ready state:', e.currentTarget.readyState)
                    
                    const errorCode = e.currentTarget.error?.code
                    const errorMessage = e.currentTarget.error?.message
                    const networkState = e.currentTarget.networkState
                    const readyState = e.currentTarget.readyState
                    
                    let errorText = `Video failed to load. Error ${errorCode}: ${errorMessage || 'Unknown error'}`
                    if (networkState === 3) {
                      errorText += ' (Network error - possible CORS issue)'
                    }
                    if (readyState === 0) {
                      errorText += ' (No data loaded)'
                    }
                    
                    setVideoError(errorText)
                  }}
                  onLoadStart={() => {
                    console.log('Video load started')
                  }}
                  onLoadedMetadata={(e) => {
                    console.log('Video metadata loaded')
                    console.log('Video duration:', e.currentTarget.duration)
                    console.log('Video dimensions:', e.currentTarget.videoWidth, 'x', e.currentTarget.videoHeight)
                  }}
                  onCanPlay={() => {
                    console.log('Video can play')
                  }}
                  onCanPlayThrough={(e) => {
                    console.log('Video can play through')
                    // Try to play the video automatically
                    const video = e.currentTarget
                    video.play().then(() => {
                      console.log('Video auto-play started successfully')
                    }).catch((playError) => {
                      console.log('Auto-play failed (this is normal):', playError.message)
                    })
                  }}
                  onLoadedData={() => {
                    console.log('Video data loaded')
                  }}
                  onPlay={() => {
                    console.log('Video started playing')
                  }}
                  onPause={() => {
                    console.log('Video paused')
                  }}
                  onWaiting={() => {
                    console.log('Video waiting for data')
                  }}
                  onStalled={() => {
                    console.log('Video stalled')
                  }}
                  onSuspend={() => {
                    console.log('Video suspended')
                  }}
                >
                  <source 
                    src={`${BASE_URL}/api/v1/files/serve/${encodeURIComponent((modalFileData || selectedVideoFile)?.filename || '')}`} 
                    type={(modalFileData || selectedVideoFile)?.mimetype} 
                  />
                  <source 
                    src={`${BASE_URL}/api/v1/files/serve/${encodeURIComponent((modalFileData || selectedVideoFile)?.filename || '')}`} 
                    type="video/mp4" 
                  />
                  Your browser does not support the video tag.
                </video>
                
                {videoError && (
                  <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded-lg">
                    <p className="text-sm text-red-600">
                      <strong>Error:</strong> {videoError}
                    </p>
                    <p className="text-sm text-red-600 mt-2">
                      Try opening the video directly: <a href={`${BASE_URL}/api/v1/files/serve/${encodeURIComponent((modalFileData || selectedVideoFile)?.filename || '')}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Open Video
                      </a>
                    </p>
                  </div>
                )}
                
              </div>
            )}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>Owner: {(modalFileData || selectedVideoFile)?.owner?.username}</span>
                <span>Uploaded: {(modalFileData || selectedVideoFile) && new Date((modalFileData || selectedVideoFile)!.uploadedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const file = modalFileData || selectedVideoFile
                    if (file) {
                      const link = document.createElement('a')
                      link.href = `${BASE_URL}/api/v1/files/serve/${encodeURIComponent(file.filename)}`
                      link.download = file.filename
                      link.click()
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Modal */}
      <Dialog open={isPdfModalOpen} onOpenChange={setIsPdfModalOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full">
          <DialogHeader>
            <DialogTitle>{modalFileData?.filename || selectedPdfFile?.filename}</DialogTitle>
            <DialogDescription>
              PDF file • {modalFileData ? formatFileSize(modalFileData.size) : selectedPdfFile && formatFileSize(selectedPdfFile.size)}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {isLoadingModalFile ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading PDF...</p>
                </div>
              </div>
            ) : (modalFileData || selectedPdfFile) && (
              <div className="w-full h-[80vh] border rounded-lg overflow-hidden">
                <ReactPdfViewer
                  src={`${BASE_URL}/api/v1/files/serve/${encodeURIComponent((modalFileData || selectedPdfFile)?.filename || '')}`}
                  className="w-full h-full"
                />
              </div>
            )}
            <div className="flex items-center justify-between text-sm text-muted-foreground mt-4">
              <div className="flex items-center gap-4">
                <span>Owner: {(modalFileData || selectedPdfFile)?.owner?.username}</span>
                <span>Uploaded: {(modalFileData || selectedPdfFile) && new Date((modalFileData || selectedPdfFile)!.uploadedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 min-w-[140px]"
                  onClick={() => {
                    const file = modalFileData || selectedPdfFile
                    if (file) {
                      window.open(`${BASE_URL}/api/v1/files/serve/${encodeURIComponent(file.filename)}`, '_blank')
                    }
                  }}
                >
                  <Eye className="h-4 w-4" />
                  Open in New Tab
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 min-w-[100px]"
                  onClick={() => {
                    const file = modalFileData || selectedPdfFile
                    if (file) {
                      const link = document.createElement('a')
                      link.href = `${BASE_URL}/api/v1/files/serve/${encodeURIComponent(file.filename)}`
                      link.download = file.filename
                      link.click()
                    }
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Modal */}
      <Dialog open={isImageModalOpen} onOpenChange={(open) => {
        if (!open) {
          setImageObjectUrl(prev => {
            if (prev) URL.revokeObjectURL(prev)
            return null
          })
        }
        setIsImageModalOpen(open)
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{modalFileData?.filename || selectedImageFile?.filename}</DialogTitle>
            <DialogDescription>
              Image File • {modalFileData ? formatFileSize(modalFileData.size) : selectedImageFile && formatFileSize(selectedImageFile.size)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {isLoadingModalFile ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading image...</p>
                </div>
              </div>
            ) : (modalFileData || selectedImageFile) && (
              <div className="relative w-full flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageObjectUrl || `${BASE_URL}/api/v1/files/serve/${encodeURIComponent((modalFileData || selectedImageFile)?.filename || '')}`}
                  alt={(modalFileData || selectedImageFile)?.filename}
                  className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                  onError={(e) => {
                    console.error('Image load error:', e)
                    console.error('Image src:', imageObjectUrl || `${BASE_URL}/api/v1/files/serve/${encodeURIComponent((modalFileData || selectedImageFile)?.filename || '')}`)
                  }}
                />
              </div>
            )}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>Owner: {(modalFileData || selectedImageFile)?.owner?.username}</span>
                <span>Uploaded: {(modalFileData || selectedImageFile) && new Date((modalFileData || selectedImageFile)!.uploadedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const file = modalFileData || selectedImageFile
                    if (file) {
                      window.open(`${BASE_URL}/api/v1/files/serve/${encodeURIComponent(file.filename)}`, '_blank')
                    }
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const file = modalFileData || selectedImageFile
                    if (file) {
                      const link = document.createElement('a')
                      link.href = `${BASE_URL}/api/v1/files/serve/${encodeURIComponent(file.filename)}`
                      link.download = file.filename
                      link.click()
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Folder"
        desc={
          <div>
            <p>Are you sure you want to delete the folder <strong>&quot;{folderToDelete?.folderName}&quot;</strong>?</p>
            <p className="text-sm text-muted-foreground mt-2">
              This action cannot be undone. All files in this folder will also be deleted.
            </p>
          </div>
        }
        confirmText="Delete Folder"
        cancelBtnText="Cancel"
        destructive
        isLoading={isDeleting}
        handleConfirm={confirmDeleteFolder}
      />

      {/* File Delete Confirmation Dialog */}
      <ConfirmDialog
        open={fileDeleteConfirmOpen}
        onOpenChange={setFileDeleteConfirmOpen}
        title="Delete File"
        desc={
          <div>
            <p>Are you sure you want to delete the file <strong>&quot;{fileToDelete?.filename}&quot;</strong>?</p>
            <p className="text-sm text-muted-foreground mt-2">
              This action cannot be undone.
            </p>
          </div>
        }
        confirmText="Delete File"
        cancelBtnText="Cancel"
        destructive
        isLoading={isDeletingFile}
        handleConfirm={confirmDeleteFile}
      />
    </div>
  )
}
