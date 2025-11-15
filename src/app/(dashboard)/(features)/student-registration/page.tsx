'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Plus, Edit, Trash2, User, List, Grid3X3, Search, Settings2, UserPlus } from 'lucide-react'
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
import { StudentModal } from '@/components/student-modal'
import { 
  useGetStudentsQuery,
  useCreateStudentMutation,
  useUpdateStudentMutation,
  useDeleteStudentMutation,
  type Student
} from '@/store/api/studentApi'
import { useAuth } from '@/context/auth-context'
import { toast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
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

export default function StudentRegistrationPage() {
  const router = useRouter()
  const { user: authUser, isAuthenticated, isLoading: authLoading } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    rollNumber: true,
    courseClass: true,
    section: true,
  })
  
  // Check if user is superadmin
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || authUser?.role !== 'superadmin')) {
      toast({
        title: 'Access Denied',
        description: 'Only superadmin can access this page.',
        variant: 'destructive',
      })
      router.push('/')
    }
  }, [authUser, isAuthenticated, authLoading, router, toast])

  // API hooks - only call when authenticated and superadmin
  const { data: studentsData, isLoading, error } = useGetStudentsQuery(undefined, {
    skip: !isAuthenticated || authLoading || authUser?.role !== 'superadmin'
  })
  const students = studentsData?.students || []
  const [createStudent, { isLoading: isCreating }] = useCreateStudentMutation()
  const [updateStudent, { isLoading: isUpdating }] = useUpdateStudentMutation()
  const [deleteStudent, { isLoading: isDeleting }] = useDeleteStudentMutation()

  // Handler functions
  const handleCreate = useCallback(() => {
    setEditingStudent(null)
    setIsModalOpen(true)
  }, [])

  const handleEdit = useCallback((student: Student) => {
    setEditingStudent(student)
    setIsModalOpen(true)
  }, [])

  const handleDelete = useCallback((student: Student) => {
    setDeletingStudent(student)
  }, [])

  // Column definitions for the table
  const columns: ColumnDef<Student>[] = useMemo(
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
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{row.getValue('username')}</span>
          </div>
        ),
        enableSorting: true,
        enableHiding: false,
      },
      {
        accessorKey: 'rollNumber',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              Roll Number
              {column.getIsSorted() === 'asc' ? ' ↑' : column.getIsSorted() === 'desc' ? ' ↓' : ''}
            </Button>
          )
        },
        cell: ({ row }) => {
          const rollNumber = row.getValue('rollNumber') as string
          return (
            <span className="text-sm text-muted-foreground">{rollNumber || 'N/A'}</span>
          )
        },
        enableSorting: true,
        enableHiding: false,
      },
      {
        accessorKey: 'courseClass',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              Class
              {column.getIsSorted() === 'asc' ? ' ↑' : column.getIsSorted() === 'desc' ? ' ↓' : ''}
            </Button>
          )
        },
        cell: ({ row }) => {
          const courseClass = row.original.courseClass
          const className = typeof courseClass === 'object' ? courseClass?.name : 'N/A'
          return (
            <span className="text-sm text-muted-foreground">{className}</span>
          )
        },
        enableSorting: true,
        enableHiding: false,
      },
      {
        accessorKey: 'section',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              Section
              {column.getIsSorted() === 'asc' ? ' ↑' : column.getIsSorted() === 'desc' ? ' ↓' : ''}
            </Button>
          )
        },
        cell: ({ row }) => {
          const section = row.original.section
          const sectionName = typeof section === 'object' ? section?.name : 'N/A'
          return (
            <span className="text-sm text-muted-foreground">{sectionName}</span>
          )
        },
        enableSorting: true,
        enableHiding: false,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const student = row.original
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
                  <DropdownMenuItem onClick={() => handleEdit(student)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDelete(student)}
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
    [handleEdit, handleDelete]
  )

  // Initialize the table
  const table = useReactTable({
    data: students,
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

  const handleModalSubmit = async (data: any) => {
    try {
      if (editingStudent) {
        // Update existing student
        await updateStudent({
          id: editingStudent._id,
          data: {
            username: data.username,
            password: data.password,
            courseClass: data.courseClass,
            section: data.section,
            rollNumber: data.rollNumber,
          }
        }).unwrap()
        toast({
          title: 'Success',
          description: 'Student updated successfully.',
        })
      } else {
        // Create new student
        await createStudent({
          username: data.username,
          password: data.password,
          courseClass: data.courseClass,
          section: data.section,
          rollNumber: data.rollNumber,
        }).unwrap()
        toast({
          title: 'Success',
          description: 'Student registered successfully.',
        })
      }
      setIsModalOpen(false)
      setEditingStudent(null)
    } catch (error: any) {
      console.error('Error saving student:', error)
      toast({
        title: 'Error',
        description: error?.data?.message || 'Failed to save student. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingStudent) return

    try {
      await deleteStudent(deletingStudent._id).unwrap()
      toast({
        title: 'Success',
        description: 'Student deleted successfully.',
      })
      setDeletingStudent(null)
    } catch (error: any) {
      console.error('Error deleting student:', error)
      toast({
        title: 'Error',
        description: error?.data?.message || 'Failed to delete student. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const renderListView = () => (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
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
      
      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2">
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
            const student = row.original
            return (
              <Card key={student._id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{student.username}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Roll No:</span> {student.rollNumber}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Class:</span> {typeof student.courseClass === 'object' ? student.courseClass?.name : 'N/A'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Section:</span> {typeof student.section === 'object' ? student.section?.name : 'N/A'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        ) : (
          <div className="col-span-full text-center py-8">
            <User className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No students found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filters.
            </p>
          </div>
        )}
      </div>
    )
  }

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render if not superadmin
  if (!isAuthenticated || authUser?.role !== 'superadmin') {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Student Registration</h1>
          {/* <p className="text-muted-foreground">
            Manage student accounts and registrations
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
            <UserPlus className="mr-2 h-4 w-4" />
            Register Student
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={globalFilter ?? ''}
              onChange={(event) => setGlobalFilter(String(event.target.value))}
              className="pl-8"
            />
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} of {students.length} students
        </div>
      </div>

      <div>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">
                Loading students...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <User className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">Error loading students</h3>
            <p className="mt-1 text-sm text-gray-500">
              There was an error loading the students. Please try again.
            </p>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-8">
            <User className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No students</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by registering a new student.
            </p>
            <div className="mt-6">
              <Button onClick={handleCreate}>
                <UserPlus className="mr-2 h-4 w-4" />
                Register Student
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
      <StudentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingStudent(null)
        }}
        student={editingStudent}
        onSubmit={handleModalSubmit}
        isLoading={isCreating || isUpdating}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingStudent}
        onOpenChange={() => setDeletingStudent(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the student{' '}
              <strong>{deletingStudent?.username}</strong>.
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
