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
import { PasswordInput } from '@/components/password-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  type Student,
  type CreateStudentRequest,
  type UpdateStudentRequest
} from '@/store/api/studentApi'
import { useGetCourseClassesQuery } from '@/store/api/courseClassApi'
import { useGetSectionsQuery } from '@/store/api/sectionApi'

const studentFormSchema = z.object({
  username: z.string().min(1, 'Username is required').max(50, 'Username must be less than 50 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password must be less than 100 characters').optional().or(z.literal('')),
  courseClass: z.string().min(1, 'Course class is required'),
  section: z.string().min(1, 'Section is required'),
  rollNumber: z.string().min(1, 'Roll number is required').max(20, 'Roll number must be less than 20 characters'),
})

type StudentFormValues = z.infer<typeof studentFormSchema>

interface StudentModalProps {
  isOpen: boolean
  onClose: () => void
  student?: Student | null
  onSubmit: (data: CreateStudentRequest | UpdateStudentRequest) => void
  isLoading?: boolean
}

export function StudentModal({
  isOpen,
  onClose,
  student,
  onSubmit,
  isLoading = false,
}: StudentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch course classes and sections
  const { data: courseClasses = [], isLoading: isLoadingClasses } = useGetCourseClassesQuery()
  const { data: allSections = [], isLoading: isLoadingSections } = useGetSectionsQuery()

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      username: '',
      password: '',
      courseClass: '',
      section: '',
      rollNumber: '',
    },
  })

  // Watch the selected course class to filter sections
  const selectedCourseClassId = form.watch('courseClass')
  
  // Filter sections based on selected class
  const sections = allSections.filter(section => 
    selectedCourseClassId && section.courseClass?._id === selectedCourseClassId
  )

  // Reset section when class changes
  useEffect(() => {
    if (selectedCourseClassId) {
      form.setValue('section', '')
    }
  }, [selectedCourseClassId, form])

  useEffect(() => {
    if (student) {
      form.reset({
        username: student.username,
        password: '', // Don't pre-fill password for security
        courseClass: typeof student.courseClass === 'object' ? student.courseClass._id : student.courseClass,
        section: typeof student.section === 'object' ? student.section._id : student.section,
        rollNumber: student.rollNumber,
      })
    } else {
      form.reset({
        username: '',
        password: '',
        courseClass: '',
        section: '',
        rollNumber: '',
      })
    }
  }, [student, form])

  const handleSubmit = async (data: StudentFormValues) => {
    setIsSubmitting(true)
    try {
      // Remove password from data if it's empty (for updates)
      const submitData: any = { ...data }
      if (student && (!data.password || data.password.trim() === '')) {
        delete submitData.password
      }
      await onSubmit(submitData)
      form.reset()
    } catch (error) {
      console.error('Error submitting student form:', error)
      // Error handling is done in the parent component
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    form.reset()
    onClose()
  }

  const isDataLoading = isLoadingClasses || isLoadingSections

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {student ? 'Edit Student' : 'Register New Student'}
          </DialogTitle>
          <DialogDescription>
            {student
              ? 'Update the student information below.'
              : 'Fill in the details to register a new student.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter username"
                      {...field}
                      disabled={isLoading || isSubmitting || isDataLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="courseClass"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoading || isSubmitting || isDataLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a class" />
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
                  <FormLabel>Section *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoading || isSubmitting || isDataLoading || !selectedCourseClassId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a section" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sections.length > 0 ? (
                        sections.map((section) => (
                          <SelectItem key={section._id} value={section._id}>
                            {section.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-sections" disabled>
                          {selectedCourseClassId ? 'No sections available' : 'Select a class first'}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rollNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Roll Number *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter roll number"
                      {...field}
                      disabled={isLoading || isSubmitting || isDataLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{student ? 'New Password (leave blank to keep current)' : 'Password *'}</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder={student ? "Enter new password (optional)" : "Enter password (minimum 6 characters)"}
                      {...field}
                      disabled={isLoading || isSubmitting || isDataLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading || isSubmitting || isDataLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || isSubmitting || isDataLoading}
              >
                {isSubmitting ? 'Saving...' : student ? 'Update' : 'Register'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
