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
import { useGetCourseClassesQuery } from '@/store/api/courseClassApi'
import { Section, CreateSectionRequest, UpdateSectionRequest, useGetSectionsQuery } from '@/store/api/sectionApi'

const sectionFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  courseClass: z.string().min(1, 'Course class is required'),
})

type SectionFormValues = z.infer<typeof sectionFormSchema>

interface SectionModalProps {
  isOpen: boolean
  onClose: () => void
  section?: Section | null
  onSubmit: (data: CreateSectionRequest | UpdateSectionRequest) => void
  isLoading?: boolean
}

export function SectionModal({
  isOpen,
  onClose,
  section,
  onSubmit,
  isLoading = false,
}: SectionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Get course classes from API
  const { data: courseClasses = [], isLoading: courseClassesLoading } = useGetCourseClassesQuery()
  // Get existing sections to check for duplicates
  const { data: existingSections = [] } = useGetSectionsQuery()

  const form = useForm<SectionFormValues>({
    resolver: zodResolver(sectionFormSchema),
    defaultValues: {
      name: '',
      courseClass: '',
    },
  })

  // Custom validation function for duplicates
  const validateDuplicate = (name: string, courseClass: string): string | undefined => {
    const duplicate = existingSections.find(
      (s) =>
        s.name.toLowerCase().trim() === name.toLowerCase().trim() &&
        s.courseClass._id === courseClass &&
        s._id !== section?._id // Exclude current section when editing
    )
    if (duplicate) {
      return 'A section with this name already exists for the selected course class.'
    }
    return undefined
  }

  useEffect(() => {
    if (section) {
      form.reset({
        name: section.name,
        courseClass: section.courseClass._id,
      })
    } else {
      form.reset({
        name: '',
        courseClass: '',
      })
    }
  }, [section, form])

  const handleSubmit = async (data: SectionFormValues) => {
    // Check for duplicates before submitting
    const duplicateError = validateDuplicate(data.name, data.courseClass)
    if (duplicateError) {
      form.setError('name', {
        type: 'manual',
        message: duplicateError,
      })
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(data)
      form.reset()
    } catch (error) {
      console.error('Error submitting section form:', error)
      // Error handling is done in the parent component
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    form.reset()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {section ? 'Edit Section' : 'Create New Section'}
          </DialogTitle>
          <DialogDescription>
            {section
              ? 'Update the section information below.'
              : 'Fill in the details to create a new section.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Section Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter section name"
                      {...field}
                      disabled={isLoading || isSubmitting}
                      onChange={(e) => {
                        field.onChange(e)
                        // Re-validate when name changes
                        const courseClassValue = form.getValues('courseClass')
                        if (courseClassValue && e.target.value) {
                          const duplicateError = validateDuplicate(e.target.value, courseClassValue)
                          if (duplicateError) {
                            form.setError('name', {
                              type: 'manual',
                              message: duplicateError,
                            })
                          } else {
                            form.clearErrors('name')
                          }
                        }
                      }}
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
                  <FormLabel>Course Class</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value)
                      // Re-validate name when course class changes
                      const nameValue = form.getValues('name')
                      if (nameValue) {
                        const duplicateError = validateDuplicate(nameValue, value)
                        if (duplicateError) {
                          form.setError('name', {
                            type: 'manual',
                            message: duplicateError,
                          })
                        } else {
                          form.clearErrors('name')
                        }
                      }
                    }}
                    defaultValue={field.value}
                    disabled={isLoading || isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a course class" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {courseClassesLoading ? (
                        <SelectItem value="loading" disabled>
                          Loading classes...
                        </SelectItem>
                      ) : courseClasses.length === 0 ? (
                        <SelectItem value="no-data" disabled>
                          No classes available
                        </SelectItem>
                      ) : (
                        courseClasses.map((courseClass) => (
                          <SelectItem key={courseClass._id} value={courseClass._id}>
                            {courseClass.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading || isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || isSubmitting}
              >
                {isSubmitting ? 'Saving...' : section ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
