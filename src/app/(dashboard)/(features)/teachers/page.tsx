'use client'

import { useState, useMemo, useEffect } from 'react'
import { Plus, Edit, Trash2, User, List, Grid3X3, Search, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { TeacherModal } from '@/components/teacher-modal'
import { 
  useGetTeachersQuery,
  useCreateTeacherMutation,
  useUpdateTeacherMutation,
  useDeleteTeacherMutation,
  type User as Teacher,
  userApi
} from '@/store/api/userApi'
import { useDispatch } from 'react-redux'
import type { AppDispatch } from '@/store/store'
import { useAuth } from '@/context/auth-context'
import { toast } from '@/hooks/use-toast'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
  getPaginationRowModel,
  PaginationState,
  VisibilityState,
} from '@tanstack/react-table'

type ViewMode = 'list' | 'grid'

export default function TeachersPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)
  const [deletingTeacher, setDeletingTeacher] = useState<Teacher | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    email: true,
    createdAt: true,
  })
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([])
  const [isFetchingAll, setIsFetchingAll] = useState(false)
  const dispatch = useDispatch<AppDispatch>()
  
  // API hooks - only call when authenticated
  // Fetch first page with max limit (50) - when limit is 0, we fetch all pages
  const { data: firstPageData, isLoading, error } = useGetTeachersQuery(
    { limit: 0, offset: 0 },
    {
      skip: !isAuthenticated || authLoading
    }
  )

  // Fetch all pages when limit is 0 (get all users)
  useEffect(() => {
    if (!firstPageData || !isAuthenticated || authLoading) {
      setAllTeachers([])
      setIsFetchingAll(false)
      return
    }

    const fetchAllPages = async () => {
      setIsFetchingAll(true)
      let allUsers: Teacher[] = [...(firstPageData.users || [])]
      let currentOffset = 50
      const limit = 50
      let hasMore = firstPageData.pagination?.hasMore ?? false

      // Fetch additional pages if there are more
      while (hasMore) {
        try {
          const result = await dispatch(
            userApi.endpoints.getTeachers.initiate({ limit, offset: currentOffset })
          ).unwrap()
          
          allUsers = [...allUsers, ...(result.users || [])]
          hasMore = result.pagination?.hasMore ?? false
          currentOffset += limit
        } catch (err) {
          console.error('Error fetching additional pages:', err)
          break
        }
      }

      setAllTeachers(allUsers)
      setIsFetchingAll(false)
    }

    fetchAllPages()
  }, [firstPageData, isAuthenticated, authLoading, dispatch])

  // Use allTeachers for the table data, fallback to first page if still loading
  const teachers: Teacher[] = allTeachers.length > 0 ? allTeachers : (firstPageData?.users || [])
  const [createTeacher, { isLoading: isCreating }] = useCreateTeacherMutation()
  const [updateTeacher, { isLoading: isUpdating }] = useUpdateTeacherMutation()
  const [deleteTeacher, { isLoading: isDeleting }] = useDeleteTeacherMutation()

  // Column definitions for the table
  const columns: ColumnDef<Teacher>[] = useMemo(
    () => [
      {
        accessorKey: 'username',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              Username
              {column.getIsSorted() === 'asc' ? ' ↑' : column.getIsSorted() === 'desc' ? ' ↓' : ''}
            </Button>
          )
        },
        cell: ({ row }) => {
          const username = row.getValue('username') as string
          return (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{username || 'N/A'}</span>
            </div>
          )
        },
        enableSorting: true,
        enableHiding: false,
      },
      {
        accessorKey: 'email',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              Email
              {column.getIsSorted() === 'asc' ? ' ↑' : column.getIsSorted() === 'desc' ? ' ↓' : ''}
            </Button>
          )
        },
        cell: ({ row }) => {
          const email = row.getValue('email') as string
          console.log('Email cell rendering:', email, 'Row data:', row.original)
          return (
            <span className="text-sm text-muted-foreground">{email || 'No email'}</span>
          )
        },
        enableSorting: true,
        enableHiding: false,
      },
     
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const teacher = row.original
          return (
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleEdit(teacher)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDelete(teacher)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [isUpdating, isDeleting]
  )

  // Initialize the table
  const table = useReactTable({
    data: teachers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      pagination,
      columnVisibility,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  const handleCreate = () => {
    setEditingTeacher(null)
    setIsModalOpen(true)
  }

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher)
    setIsModalOpen(true)
  }

  const handleDelete = (teacher: Teacher) => {
    setDeletingTeacher(teacher)
  }

  const handleModalSubmit = async (data: any) => {
    try {
      if (editingTeacher) {
        // Update existing teacher
        await updateTeacher({
          id: editingTeacher._id,
          data: {
            username: data.username,
            email: data.email,
            password: data.password,
          }
        }).unwrap()
        toast({
          title: 'Success',
          description: 'Teacher updated successfully.',
        })
      } else {
        // Create new teacher
        await createTeacher({
          username: data.username,
          email: data.email,
          password: data.password,
        }).unwrap()
        toast({
          title: 'Success',
          description: 'Teacher created successfully.',
        })
      }
      setIsModalOpen(false)
      setEditingTeacher(null)
    } catch (error: any) {
      console.error('Error saving teacher:', error)
      toast({
        title: 'Error',
        description: error?.data?.message || 'Failed to save teacher. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingTeacher) return

    try {
      await deleteTeacher(deletingTeacher._id).unwrap()
      toast({
        title: 'Success',
        description: 'Teacher deleted successfully.',
      })
      setDeletingTeacher(null)
    } catch (error: any) {
      console.error('Error deleting teacher:', error)
      toast({
        title: 'Error',
        description: error?.data?.message || 'Failed to delete teacher. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const renderListView = () => (
    <div className="flex flex-col h-full">
      <div className="rounded-md border overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-y-auto flex-1">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2 pt-4 flex-shrink-0">
        <div className="flex-1 text-sm text-muted-foreground">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{' '}
          of {table.getFilteredRowModel().rows.length} entries
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value))
              }}
              className="h-8 w-[70px] rounded border border-input bg-background px-3 py-1 text-sm"
            >
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              {'<<'}
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              {'<'}
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              {'>'}
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              {'>>'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderGridView = () => {
    const rows = table.getRowModel().rows
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {rows.length > 0 ? (
          rows.map((row) => {
            const teacher = row.original
            return (
              <Card key={teacher._id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{teacher.username || 'N/A'}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      {teacher.email || 'N/A'}
                    </div>
                   
                  </div>
                </CardContent>
              </Card>
            )
          })
        ) : (
          <div className="col-span-full text-center py-8">
            <User className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No teachers found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filters.
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden px-4 py-6">
      <div className="flex-shrink-0 space-y-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Teachers</h1>
            {/* <p className="text-muted-foreground">
              Manage teachers and their assignments
            </p> */}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center border rounded-lg p-1">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8 px-3"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8 px-3"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={handleCreate} disabled={isCreating}>
              <Plus className="mr-2 h-4 w-4" />
              Add Teacher
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search teachers..."
                value={globalFilter ?? ''}
                onChange={(event) => setGlobalFilter(String(event.target.value))}
                className="pl-8"
              />
            </div>
            
          </div>
          <div className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} of {teachers.length} teachers
          </div>
        </div>
      </div>

       <div className="flex-1 min-h-0 overflow-hidden">
         {authLoading || isLoading || isFetchingAll ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">
                {authLoading ? 'Authenticating...' : 'Loading teachers...'}
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <User className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">Error loading teachers</h3>
            <p className="mt-1 text-sm text-gray-500">
              There was an error loading the teachers. Please try again.
            </p>
          </div>
        ) : teachers.length === 0 ? (
          <div className="text-center py-8">
            <User className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No teachers</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new teacher.
            </p>
            <div className="mt-6">
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Teacher
              </Button>
            </div>
          </div>
        ) : (
          <>
            {viewMode === 'list' && renderListView()}
            {viewMode === 'grid' && renderGridView()}
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      <TeacherModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingTeacher(null)
        }}
        teacher={editingTeacher}
        onSubmit={handleModalSubmit}
        isLoading={isCreating || isUpdating}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingTeacher}
        onOpenChange={() => setDeletingTeacher(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the teacher{' '}
              <strong>{deletingTeacher?.username}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
