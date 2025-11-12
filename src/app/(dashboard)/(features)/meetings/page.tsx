'use client'

import { useState, useMemo } from 'react'
import { Plus, Edit, Trash2, Calendar, List, Grid3X3, Search, Settings2, Clock, Users } from 'lucide-react'
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
import { MeetingModal } from '@/components/meeting-modal'
import { 
  useGetMeetingsQuery,
  useCreateMeetingMutation,
  useUpdateMeetingMutation,
  useDeleteMeetingMutation,
  type Meeting as ApiMeeting,
  type CreateMeetingRequest,
  type UpdateMeetingRequest
} from '@/store/api/meetingApi'
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

type Meeting = ApiMeeting

type ViewMode = 'list' | 'grid'

export default function MeetingsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null)
  const [deletingMeeting, setDeletingMeeting] = useState<Meeting | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  
  const { data: meetings = [], isLoading, error } = useGetMeetingsQuery(undefined, {
    skip: !isAuthenticated || authLoading
  })
  const [createMeeting, { isLoading: isCreating }] = useCreateMeetingMutation()
  const [updateMeeting, { isLoading: isUpdating }] = useUpdateMeetingMutation()
  const [deleteMeeting, { isLoading: isDeleting }] = useDeleteMeetingMutation()

  const columns: ColumnDef<Meeting>[] = useMemo(
    () => [
      {
        accessorKey: 'title',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              Title
              {column.getIsSorted() === 'asc' ? ' ↑' : column.getIsSorted() === 'desc' ? ' ↓' : ''}
            </Button>
          )
        },
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{row.getValue('title')}</span>
          </div>
        ),
        enableSorting: true,
        enableHiding: false,
      },
      {
        accessorKey: 'date',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              Date
              {column.getIsSorted() === 'asc' ? ' ↑' : column.getIsSorted() === 'desc' ? ' ↓' : ''}
            </Button>
          )
        },
        cell: ({ row }) => {
          const date = new Date(row.getValue('date'))
          return (
            <div className="flex items-center gap-2">
              <span>{date.toLocaleDateString()}</span>
            </div>
          )
        },
        enableSorting: true,
      },
      {
        accessorKey: 'time',
        header: 'Time',
        cell: ({ row }) => {
          const startTime = row.original.startTime
          const endTime = row.original.endTime
          return (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{startTime} - {endTime}</span>
            </div>
          )
        },
        enableSorting: false,
      },
      {
        accessorKey: 'courseClass',
        header: 'Class',
        cell: ({ row }) => {
          const courseClass = row.getValue('courseClass') as { name: string } | undefined
          return (
            <span className="text-sm">{courseClass?.name || '-'}</span>
          )
        },
        enableSorting: false,
      },
      {
        accessorKey: 'section',
        header: 'Section',
        cell: ({ row }) => {
          const section = row.getValue('section') as { name: string } | undefined
          return (
            <span className="text-sm">{section?.name || '-'}</span>
          )
        },
        enableSorting: false,
      },
      {
        accessorKey: 'subject',
        header: 'Subject',
        cell: ({ row }) => {
          const subject = row.getValue('subject') as { name: string } | undefined
          return (
            <span className="text-sm">{subject?.name || '-'}</span>
          )
        },
        enableSorting: false,
      },
      {
        accessorKey: 'organizer',
        header: 'Organizer',
        cell: ({ row }) => {
          const organizer = row.getValue('organizer') as { username: string; email: string }
          return (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{organizer?.username || 'N/A'}</span>
            </div>
          )
        },
        enableSorting: false,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const meeting = row.original
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
                  <DropdownMenuItem onClick={() => handleEdit(meeting)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDelete(meeting)}
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
    []
  )

  const table = useReactTable({
    data: meetings,
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
    setEditingMeeting(null)
    setIsModalOpen(true)
  }

  const handleEdit = (meeting: Meeting) => {
    setEditingMeeting(meeting)
    setIsModalOpen(true)
  }

  const handleDelete = (meeting: Meeting) => {
    setDeletingMeeting(meeting)
  }

  const handleModalSubmit = async (data: CreateMeetingRequest | UpdateMeetingRequest) => {
    try {
      if (editingMeeting) {
        await updateMeeting({
          id: editingMeeting._id,
          data: data as UpdateMeetingRequest,
        }).unwrap()
        toast({
          title: 'Success',
          description: 'Meeting updated successfully.',
        })
      } else {
        await createMeeting(data as CreateMeetingRequest).unwrap()
        toast({
          title: 'Success',
          description: 'Meeting created successfully.',
        })
      }
      setIsModalOpen(false)
      setEditingMeeting(null)
    } catch (error: unknown) {
      console.error('Error saving meeting:', error)
      const errorMessage = (error && typeof error === 'object' && 'data' in error && typeof error.data === 'object' && error.data && 'message' in error && typeof (error.data as { message?: string }).message === 'string') ? (error.data as { message: string }).message : 'Failed to save meeting. Please try again.'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingMeeting) return

    try {
      await deleteMeeting(deletingMeeting._id).unwrap()
      toast({
        title: 'Success',
        description: 'Meeting deleted successfully.',
      })
      setDeletingMeeting(null)
    } catch (error: unknown) {
      console.error('Error deleting meeting:', error)
      const errorMessage = (error && typeof error === 'object' && 'data' in error && typeof error.data === 'object' && error.data && 'message' in error && typeof (error.data as { message?: string }).message === 'string') ? (error.data as { message: string }).message : 'Failed to delete meeting. Please try again.'
      toast({
        title: 'Error',
        description: errorMessage,
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
            const meeting = row.original
            const date = new Date(meeting.date)
            return (
              <Card key={meeting._id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{meeting.title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(meeting)}
                        disabled={isUpdating}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(meeting)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{date.toLocaleDateString()} {meeting.startTime} - {meeting.endTime}</span>
                    </div>
                    {meeting.courseClass && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Class:</span>
                        <span className="text-sm">{meeting.courseClass.name}</span>
                      </div>
                    )}
                    {meeting.section && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Section:</span>
                        <span className="text-sm">{meeting.section.name}</span>
                      </div>
                    )}
                    {meeting.subject && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Subject:</span>
                        <span className="text-sm">{meeting.subject.name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Organizer: {meeting.organizer.username}</span>
                    </div>
                    {meeting.participants && meeting.participants.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {meeting.participants.length} participant{meeting.participants.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        ) : (
          <div className="col-span-full text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No meetings found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filters.
            </p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
          <p className="text-muted-foreground">
            Manage meetings, schedules, and participants
          </p>
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
          <Button 
            onClick={handleCreate} 
            disabled={isCreating}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Meeting
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search meetings..."
              value={globalFilter ?? ''}
              onChange={(event) => setGlobalFilter(String(event.target.value))}
              className="pl-8"
            />
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} of {meetings.length} meetings
        </div>
      </div>

      <div>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading meetings...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">Error loading meetings</h3>
            <p className="mt-1 text-sm text-gray-500">
              Failed to load meetings. Please try again.
            </p>
          </div>
        ) : meetings.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No meetings</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new meeting.
            </p>
            <div className="mt-6">
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Meeting
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

      <MeetingModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingMeeting(null)
        }}
        meeting={editingMeeting}
        onSubmit={handleModalSubmit}
        isLoading={isCreating || isUpdating}
      />

      <AlertDialog
        open={!!deletingMeeting}
        onOpenChange={() => setDeletingMeeting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the meeting{' '}
              <strong>{deletingMeeting?.title}</strong>.
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

