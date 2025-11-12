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
import { Textarea } from '@/components/ui/textarea'
import { 
  type Subject,
  type CreateSubjectRequest,
  type UpdateSubjectRequest
} from '@/store/api/subjectApi'

const subjectFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  code: z.string().max(20, 'Code must be less than 20 characters').optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
})

type SubjectFormValues = z.infer<typeof subjectFormSchema>

interface SubjectModalProps {
  isOpen: boolean
  onClose: () => void
  subject?: Subject | null
  onSubmit: (data: CreateSubjectRequest | UpdateSubjectRequest) => void
  isLoading?: boolean
}

export function SubjectModal({
  isOpen,
  onClose,
  subject,
  onSubmit,
  isLoading = false,
}: SubjectModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
    },
  })

  useEffect(() => {
    if (subject) {
      form.reset({
        name: subject.name,
        code: subject.code || '',
        description: subject.description || '',
      })
    } else {
      form.reset({
        name: '',
        code: '',
        description: '',
      })
    }
  }, [subject, form])

  const handleSubmit = async (data: SubjectFormValues) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      form.reset()
    } catch (error) {
      console.error('Error submitting subject form:', error)
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
            {subject ? 'Edit Subject' : 'Create New Subject'}
          </DialogTitle>
          <DialogDescription>
            {subject
              ? 'Update the subject information below.'
              : 'Fill in the details to create a new subject.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter subject name"
                      {...field}
                      disabled={isLoading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter subject code (e.g., MATH101)"
                      {...field}
                      disabled={isLoading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter subject description"
                      className="resize-none"
                      rows={3}
                      {...field}
                      disabled={isLoading || isSubmitting}
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
                disabled={isLoading || isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || isSubmitting}
              >
                {isSubmitting ? 'Saving...' : subject ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
