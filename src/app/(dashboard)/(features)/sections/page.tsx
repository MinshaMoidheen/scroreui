'use client'

import { useState, useMemo } from 'react'
import { Plus, Edit, Trash2, BookOpen, List, Grid3X3, Search, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { SectionModal } from '@/components/section-modal'
import { 
  useGetSectionsQuery,
  useCreateSectionMutation,
  useUpdateSectionMutation,
  useDeleteSectionMutation,
  type Section as ApiSection,
  type CreateSectionRequest,
  type UpdateSectionRequest
} from '@/store/api/sectionApi'
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

// Use the API Section type
type Section = ApiSection

type ViewMode = 'list' | 'grid'

export default function SectionsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<Section | null>(null)
  const [deletingSection, setDeletingSection] = useState<Section | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  // API hooks - only call when authenticated
  const { data: sections = [], isLoading, error } = useGetSectionsQuery(undefined, {
    skip: !isAuthenticated || authLoading
  })
  const [createSection, { isLoading: isCreating }] = useCreateSectionMutation()
  const [updateSection, { isLoading: isUpdating }] = useUpdateSectionMutation()
  const [deleteSection, { isLoading: isDeleting }] = useDeleteSectionMutation()

  // Debug logs
  console.log('Sections data:', sections)
  console.log('Is loading:', isLoading)

  // Column definitions for the table
  const columns: ColumnDef<Section>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 lg:px-3"
            >
              Section Name
              {column.getIsSorted() === 'asc' ? ' ↑' : column.getIsSorted() === 'desc' ? ' ↓' : ''}
            </Button>
          )
        },
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{row.getValue('name')}</span>
          </div>
        ),
        enableSorting: true,
        enableHiding: false,
      },
      {
        accessorKey: 'courseClass',
        header: 'Course Class',
        cell: ({ row }) => {
          const courseClass = row.getValue('courseClass') as { name: string }
          return (
            <Badge variant="outline" className="text-sm">
              {courseClass.name}
            </Badge>
          )
        },
        enableSorting: true,
      },
    
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const section = row.original
          return (
            <div className="flex items-center gap-2">
              {/* <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(section)}
                disabled={isUpdating}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(section)}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button> */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleEdit(section)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDelete(section)}
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

  // Initialize the table
  const table = useReactTable({
    data: sections,
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

  // Debug table state
  console.log('Table rows:', table.getRowModel().rows.length)
  console.log('Table data:', table.getRowModel().rows)

  const handleCreate = () => {
    console.log('handleCreate called') // Debug log
    setEditingSection(null)
    setIsModalOpen(true)
  }

  const handleEdit = (section: Section) => {
    setEditingSection(section)
    setIsModalOpen(true)
  }

  const handleDelete = (section: Section) => {
    setDeletingSection(section)
  }

  const handleModalSubmit = async (data: CreateSectionRequest | UpdateSectionRequest) => {
    try {
      if (editingSection) {
        // Update existing section
        await updateSection({
          id: editingSection._id,
          data: {
            name: data.name,
            courseClass: data.courseClass,
          }
        }).unwrap()
        toast({
          title: 'Success',
          description: 'Section updated successfully.',
        })
      } else {
        // Create new section
        if (!data.name || !data.courseClass) {
          toast({
            title: 'Error',
            description: 'Name and course class are required.',
            variant: 'destructive',
          })
          return
        }
        await createSection({
          name: data.name,
          courseClass: data.courseClass,
        }).unwrap()
        toast({
          title: 'Success',
          description: 'Section created successfully.',
        })
      }
      setIsModalOpen(false)
      setEditingSection(null)
    } catch (error: unknown) {
      console.error('Error saving section:', error)
      const errorMessage = (error && typeof error === 'object' && 'data' in error && typeof error.data === 'object' && error.data && 'message' in error && typeof (error.data as { message?: string }).message === 'string') ? (error.data as { message: string }).message : 'Failed to save section. Please try again.'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingSection) return

    try {
      await deleteSection(deletingSection._id).unwrap()
      toast({
        title: 'Success',
        description: 'Section deleted successfully.',
      })
      setDeletingSection(null)
    } catch (error: unknown) {
      console.error('Error deleting section:', error)
      const errorMessage = (error && typeof error === 'object' && 'data' in error && typeof error.data === 'object' && error.data && 'message' in error && typeof (error.data as { message?: string }).message === 'string') ? (error.data as { message: string }).message : 'Failed to delete section. Please try again.'
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
    console.log('Grid view - rows:', rows.length) // Debug log
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {rows.length > 0 ? (
          rows.map((row) => {
            const section = row.original
            return (
              <Card key={section._id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                     
                      <CardTitle className="text-lg">{section.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(section)}
                        disabled={isUpdating}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(section)}
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
                      <span className="text-sm text-muted-foreground">Course Class:</span>
                      <Badge variant="outline" className="text-xs">
                        {section.courseClass.name}
                      </Badge>
                    </div>
                   
                  </div>
                </CardContent>
              </Card>
            )
          })
        ) : (
          <div className="col-span-full text-center py-8">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No sections found</h3>
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
          <h1 className="text-3xl font-bold tracking-tight">Sections</h1>
          <p className="text-muted-foreground">
            Manage sections and their course class assignments
          </p>
         
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                console.log('Switching to list view') // Debug log
                setViewMode('list')
              }}
              className="h-8 px-3"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                console.log('Switching to grid view') // Debug log
                setViewMode('grid')
              }}
              className="h-8 px-3"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>
          <Button 
            onClick={() => {
              console.log('Add section clicked') // Debug log
              handleCreate()
            }} 
            disabled={isCreating}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Section
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sections..."
              value={globalFilter ?? ''}
              onChange={(event) => setGlobalFilter(String(event.target.value))}
              className="pl-8"
            />
          </div>
          {/* <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[150px]">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuItem
                      key={column.id}
                      className="capitalize"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Checkbox
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                        className="mr-2"
                      />
                      {column.id}
                    </DropdownMenuItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu> */}
        </div>
        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} of {sections.length} sections
        </div>
      </div>

      <div>
         {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading sections...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">Error loading sections</h3>
              <p className="mt-1 text-sm text-gray-500">
                Failed to load sections. Please try again.
              </p>
            </div>
          ) : sections.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No sections</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new section.
              </p>
              <div className="mt-6">
                <Button onClick={handleCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Section
                </Button>
              </div>
            </div>
          ) : (
            <>
              {console.log('Current view mode:', viewMode)} {/* Debug log */}
              {viewMode === 'list' && renderListView()}
              {viewMode === 'grid' && renderGridView()}
            </>
          )}
      </div>
      {/* Add/Edit Modal */}
      <SectionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingSection(null)
        }}
        section={editingSection}
        onSubmit={handleModalSubmit}
        isLoading={isCreating || isUpdating}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingSection}
        onOpenChange={() => setDeletingSection(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the section{' '}
              <strong>{deletingSection?.name}</strong>.
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
