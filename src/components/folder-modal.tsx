'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Folder } from 'lucide-react'
import { useGetCourseClassesQuery } from '@/store/api/courseClassApi'
import { useGetSectionsQuery } from '@/store/api/sectionApi'
import { useGetSubjectsQuery } from '@/store/api/subjectApi'
import { useGetTeachersQuery } from '@/store/api/userApi'
import { Folder as FolderType } from '@/store/api/folderApi'

// Update schema to allow only one user
const folderFormSchema = z.object({
  folderName: z.string().min(1, 'Folder name is required'),
  parent: z.string().optional(),
  allowedUsers: z.array(z.string()).min(1, 'At least one user must be selected').max(1, 'Only one user can be selected'), // Changed to max 1
  courseClass: z.string().optional(),
  section: z.string().optional(),
  subject: z.string().optional(),
})

type FolderFormValues = z.infer<typeof folderFormSchema>

interface FolderModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: FolderFormValues) => void
  folder?: FolderType | null
  parentFolders: FolderType[]
  isLoading?: boolean
  currentParentFolder?: string | null
  parentFolderData?: FolderType | null
}

export function FolderModal({
  isOpen,
  onClose,
  onSubmit,
  folder,
  parentFolders,
  isLoading = false,
  currentParentFolder,
  parentFolderData,
}: FolderModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Determine if we're creating a subfolder (not editing, and we have a parent)
  const isCreatingSubfolder = !folder && !!currentParentFolder && !!parentFolderData
  
  // Fields should be disabled when editing OR creating a subfolder
  const areFieldsDisabled = !!folder || isCreatingSubfolder

  const form = useForm<FolderFormValues>({
    resolver: zodResolver(folderFormSchema),
    defaultValues: {
      folderName: '',
      parent: '',
      allowedUsers: [],
      courseClass: '',
      section: '',
      subject: '',
    },
  })

  // Fetch data for dropdowns
  const { data: courseClasses = [] } = useGetCourseClassesQuery()
  const { data: allSections = [] } = useGetSectionsQuery()
  const { data: subjects = [] } = useGetSubjectsQuery()
  const { data: teachers = [] } = useGetTeachersQuery()

  // Debugging: Log teachers data
  console.log('Teachers data:', teachers);

  // Extract and filter teachers from the API response
  const validTeachers = Array.isArray(teachers?.users)
    ? teachers?.users.filter((user) => user.role === 'teacher')
    : [];

  console.log('Valid Teachers:', validTeachers);

  // Watch the selected course class to filter sections
  const selectedCourseClassId = form.watch('courseClass')
  
  // Filter sections based on selected class
  const sections = allSections.filter(section => 
    selectedCourseClassId && section.courseClass?._id === selectedCourseClassId
  )

  // Reset section when course class changes
  useEffect(() => {
    if (selectedCourseClassId) {
      // Only reset if the current section doesn't belong to the selected class
      const currentSectionId = form.getValues('section')
      if (currentSectionId) {
        const currentSection = allSections.find(s => s._id === currentSectionId)
        if (currentSection?.courseClass?._id !== selectedCourseClassId) {
          form.setValue('section', '')
        }
      } else {
        form.setValue('section', '')
      }
    }
  }, [selectedCourseClassId, form, allSections])

  // Reset form when folder changes
  useEffect(() => {
    if (folder) {
      // Convert allowedUsers to array format
      const allowedUsersArray = Array.isArray(folder.allowedUsers) 
        ? folder.allowedUsers.map((user: any) => 
            typeof user === 'object' && user !== null && user.username 
              ? user.username 
              : String(user)
          )
        : folder.allowedUsers && typeof folder.allowedUsers === 'object' && 'username' in folder.allowedUsers
          ? [(folder.allowedUsers as any).username]
          : folder.allowedUsers
            ? [String(folder.allowedUsers)]
            : []
      
      form.reset({
        folderName: folder.folderName,
        parent: currentParentFolder ? (folder.parent || 'none') : undefined,
        allowedUsers: allowedUsersArray,
        courseClass: folder.courseClass?._id || '',
        section: folder.section?._id || '',
        subject: folder.subject?._id || '',
      })
    } else if (isCreatingSubfolder && parentFolderData) {
      // Pre-fill from parent folder when creating subfolder
      // Convert allowedUsers to array format
      const allowedUsersArray = Array.isArray(parentFolderData.allowedUsers)
        ? parentFolderData.allowedUsers.map((user: any) =>
            typeof user === 'object' && user !== null && user.username
              ? user.username
              : String(user)
          )
        : parentFolderData.allowedUsers && typeof parentFolderData.allowedUsers === 'object' && 'username' in parentFolderData.allowedUsers
          ? [(parentFolderData.allowedUsers as any).username]
          : parentFolderData.allowedUsers
            ? [String(parentFolderData.allowedUsers)]
            : []
      
      form.reset({
        folderName: '',
        parent: currentParentFolder || '',
        allowedUsers: allowedUsersArray,
        courseClass: parentFolderData.courseClass?._id || '',
        section: parentFolderData.section?._id || '',
        subject: parentFolderData.subject?._id || '',
      })
    } else {
      form.reset({
        folderName: '',
        parent: currentParentFolder ? (currentParentFolder || 'none') : undefined,
        allowedUsers: [],
        courseClass: '',
        section: '',
        subject: '',
      })
    }
  }, [folder, currentParentFolder, form, isCreatingSubfolder, parentFolderData])

  const handleSubmit = async (data: FolderFormValues) => {
    setIsSubmitting(true)
    try {
      // Only process parent field when inside a folder
      const submitData = {
        ...data,
        parent: currentParentFolder 
          ? (data.parent === "none" ? undefined : data.parent)
          : undefined
      }
      await onSubmit(submitData)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            {folder ? 'Edit Folder' : 'Create New Folder'}
          </DialogTitle>
          <DialogDescription>
            {folder
              ? 'Update the folder details below.'
              : 'Fill in the details to create a new folder.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="folderName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Folder Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter folder name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Only show parent folder selection when inside a folder */}
            {currentParentFolder && (
              <FormField
                control={form.control}
                name="parent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Folder</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={areFieldsDisabled}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select parent folder (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No parent (Root level)</SelectItem>
                        {parentFolders
                          .filter(f => !f.parent) // Only show root level folders as parents
                          .map((parentFolder) => (
                            <SelectItem key={parentFolder._id} value={parentFolder._id}>
                              {parentFolder.folderName}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="allowedUsers"
              render={({ field }) => {
                // Get the currently selected user (first in array or empty string)
                const selectedUser = field.value?.[0] || '';
                
                return (
                  <FormItem>
                    <FormLabel>Allowed User (Select One)</FormLabel>
                    <div className={`space-y-2 max-h-40 overflow-y-auto border rounded-md p-3 ${areFieldsDisabled ? 'opacity-60' : ''}`}>
                      {validTeachers?.map((teacher) => (
                        <div key={teacher?._id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`user-${teacher?._id}`}
                            checked={selectedUser === teacher?.username}
                            // disabled={areFieldsDisabled}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                // When checked, set array with only this user
                                field.onChange([teacher?.username])
                              } else {
                                // When unchecked (shouldn't happen with single selection)
                                field.onChange([])
                              }
                            }}
                          />
                          <label
                            htmlFor={`user-${teacher?._id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {teacher?.username}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground mt-1">Only one user can be selected</p>
                  </FormItem>
                )
              }}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="courseClass"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Class</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      // disabled={areFieldsDisabled}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {courseClasses.map((courseClass) => (
                          <SelectItem key={courseClass._id} value={courseClass._id}>
                            {courseClass.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="section"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!selectedCourseClassId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={selectedCourseClassId ? "Select section" : "Select class first"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sections.length > 0 ? (
                          sections.map((section) => (
                            <SelectItem key={section._id} value={section._id}>
                              {section.name || 'N/A'}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            {selectedCourseClassId ? 'No sections available' : 'Select a course class first'}
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      // disabled={areFieldsDisabled}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject._id} value={subject._id}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || isSubmitting}>
                {(isLoading || isSubmitting)
                  ? 'Saving...'
                  : folder
                  ? 'Update Folder'
                  : 'Create Folder'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}