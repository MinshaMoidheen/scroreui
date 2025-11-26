'use client'

import { useState, useEffect, useMemo } from 'react'
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

const folderFormSchema = z.object({
  folderName: z.string().min(1, 'Folder name is required'),
  parent: z.string().optional(),
  allowedUsers: z.array(z.string()).min(1, 'At least one user must be selected'),
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
  const { data: teachersData } = useGetTeachersQuery({ limit: 0, offset: 0 })
  const teachers = teachersData?.users || []

  // Watch the selected course class to filter sections
  const selectedCourseClassId = form.watch('courseClass')
  
  // Filter sections based on selected class (show all if no class selected)
  const sections = useMemo(() => {
    if (!selectedCourseClassId) {
      return allSections
    }
    return allSections.filter(section => 
      section.courseClass?._id === selectedCourseClassId
    )
  }, [allSections, selectedCourseClassId])

  // Reset section and subject when course class changes
  useEffect(() => {
    if (selectedCourseClassId) {
      const currentSection = form.getValues('section')
      // Check if current section belongs to the selected class
      const sectionBelongsToClass = currentSection && sections.some(s => s._id === currentSection)
      
      if (!sectionBelongsToClass) {
        form.setValue('section', '')
        form.setValue('subject', '')
      }
    } else {
      // If no class selected, clear section and subject
      form.setValue('section', '')
      form.setValue('subject', '')
    }
  }, [selectedCourseClassId, form, sections])

  // Reset form when folder changes
  useEffect(() => {
    if (folder) {
      form.reset({
        folderName: folder.folderName,
        parent: currentParentFolder ? (folder.parent || 'none') : undefined,
        allowedUsers: Array.isArray(folder.allowedUsers) 
          ? folder.allowedUsers.map((user: any) => 
              typeof user === 'object' && user !== null && user.username 
                ? user.username 
                : String(user)
            )
          : [],
        courseClass: folder.courseClass?._id || '',
        section: folder.section?._id || '',
        subject: folder.subject?._id || '',
      })
    } else if (isCreatingSubfolder && parentFolderData) {
      // Pre-fill from parent folder when creating subfolder
      form.reset({
        folderName: '',
        parent: currentParentFolder || '',
        allowedUsers: Array.isArray(parentFolderData.allowedUsers)
          ? parentFolderData.allowedUsers.map((user: any) =>
              typeof user === 'object' && user !== null && user.username
                ? user.username
                : String(user)
            )
          : [],
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Allowed Users</FormLabel>
                  <div className={`space-y-2 max-h-40 overflow-y-auto border rounded-md p-3 ${areFieldsDisabled ? 'opacity-60' : ''}`}>
                    {teachers.map((teacher) => (
                      <div key={teacher._id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`user-${teacher._id}`}
                          checked={field.value?.includes(teacher.username) || false}
                          disabled={areFieldsDisabled}
                          onCheckedChange={(checked) => {
                            const currentUsers = field.value || []
                            if (checked) {
                              field.onChange([...currentUsers, teacher.username])
                            } else {
                              field.onChange(currentUsers.filter(user => user !== teacher.username))
                            }
                          }}
                        />
                        <label
                          htmlFor={`user-${teacher._id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {teacher.username}
                        </label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
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
                      disabled={areFieldsDisabled}
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
                      disabled={areFieldsDisabled}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sections.map((section) => (
                          <SelectItem key={section._id} value={section._id}>
                            {section.name}
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
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={areFieldsDisabled}
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
                {isLoading || isSubmitting
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