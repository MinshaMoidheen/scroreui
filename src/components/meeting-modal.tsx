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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useGetUsersQuery } from '@/store/api/userApi'
import { useGetCourseClassesQuery } from '@/store/api/courseClassApi'
import { useGetSectionsQuery } from '@/store/api/sectionApi'
import { useGetSubjectsQuery } from '@/store/api/subjectApi'
import { Meeting, CreateMeetingRequest, UpdateMeetingRequest } from '@/store/api/meetingApi'

const meetingFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format'),
  courseClass: z.string().optional(),
  section: z.string().optional(),
  subject: z.string().optional(),
  participants: z.array(z.string()).optional(),
})

type MeetingFormValues = z.infer<typeof meetingFormSchema>

interface MeetingModalProps {
  isOpen: boolean
  onClose: () => void
  meeting?: Meeting | null
  onSubmit: (data: CreateMeetingRequest | UpdateMeetingRequest) => void
  isLoading?: boolean
}

export function MeetingModal({
  isOpen,
  onClose,
  meeting,
  onSubmit,
  isLoading = false,
}: MeetingModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  
  // Get users from API for participants
  const { data: usersResponse, isLoading: usersLoading } = useGetUsersQuery()
  // Get course classes, sections, and subjects
  const { data: courseClasses = [], isLoading: courseClassesLoading } = useGetCourseClassesQuery()
  const { data: allSections = [], isLoading: sectionsLoading } = useGetSectionsQuery()
  const { data: subjects = [], isLoading: subjectsLoading } = useGetSubjectsQuery()

  const form = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingFormSchema),
    defaultValues: {
      title: '',
      description: '',
      date: '',
      startTime: '',
      endTime: '',
      courseClass: '',
      section: '',
      subject: '',
      participants: [],
    },
  })
  
  // Watch the selected course class to filter sections
  const selectedCourseClassId = form.watch('courseClass')
  
  // Filter sections based on selected class
  const sections = allSections.filter(section => 
    selectedCourseClassId && section.courseClass._id === selectedCourseClassId
  )

  useEffect(() => {
    if (meeting) {
      const meetingDate = new Date(meeting.date)
      const formattedDate = meetingDate.toISOString().split('T')[0]
      const participants = meeting.participants?.map(p => p._id) || []
      setSelectedParticipants(participants)
      form.reset({
        title: meeting.title,
        description: meeting.description || '',
        date: formattedDate,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        courseClass: meeting.courseClass?._id || '',
        section: meeting.section?._id || '',
        subject: meeting.subject?._id || '',
        participants: participants,
      })
    } else {
      setSelectedParticipants([])
      form.reset({
        title: '',
        description: '',
        date: '',
        startTime: '',
        endTime: '',
        courseClass: '',
        section: '',
        subject: '',
        participants: [],
      })
    }
  }, [meeting, form])

  // Reset section and subject when course class changes
  useEffect(() => {
    if (selectedCourseClassId) {
      form.setValue('section', '')
      form.setValue('subject', '')
    }
  }, [selectedCourseClassId, form])

  const handleSubmit = async (data: MeetingFormValues) => {
    setIsSubmitting(true)
    try {
      await onSubmit({
        ...data,
        courseClass: data.courseClass || undefined,
        section: data.section || undefined,
        subject: data.subject || undefined,
        participants: selectedParticipants,
      })
      form.reset()
      setSelectedParticipants([])
    } catch (error) {
      console.error('Error submitting meeting form:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    form.reset()
    setSelectedParticipants([])
    onClose()
  }

  const users = usersResponse?.users || []

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {meeting ? 'Edit Meeting' : 'Create New Meeting'}
          </DialogTitle>
          <DialogDescription>
            {meeting
              ? 'Update the meeting information below.'
              : 'Fill in the details to create a new meeting.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter meeting title"
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
                      placeholder="Enter meeting description"
                      {...field}
                      disabled={isLoading || isSubmitting}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date *</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      disabled={isLoading || isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="courseClass"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Class</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                      disabled={isLoading || isSubmitting || courseClassesLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class (optional)" />
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
              <FormField
                control={form.control}
                name="section"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                      disabled={isLoading || isSubmitting || sectionsLoading || !selectedCourseClassId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select section (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sectionsLoading ? (
                          <SelectItem value="loading" disabled>
                            Loading sections...
                          </SelectItem>
                        ) : !selectedCourseClassId ? (
                          <SelectItem value="no-class" disabled>
                            Select a class first
                          </SelectItem>
                        ) : sections.length === 0 ? (
                          <SelectItem value="no-data" disabled>
                            No sections available
                          </SelectItem>
                        ) : (
                          sections.map((section) => (
                            <SelectItem key={section._id} value={section._id}>
                              {section.name}
                            </SelectItem>
                          ))
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
                      value={field.value || undefined}
                      disabled={isLoading || isSubmitting || subjectsLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subjectsLoading ? (
                          <SelectItem value="loading" disabled>
                            Loading subjects...
                          </SelectItem>
                        ) : subjects.length === 0 ? (
                          <SelectItem value="no-data" disabled>
                            No subjects available
                          </SelectItem>
                        ) : (
                          subjects.map((subject) => (
                            <SelectItem key={subject._id} value={subject._id}>
                              {subject.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time *</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
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
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time *</FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        disabled={isLoading || isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="participants"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Participants</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => {
                        if (!selectedParticipants.includes(value)) {
                          const newParticipants = [...selectedParticipants, value]
                          setSelectedParticipants(newParticipants)
                          field.onChange(newParticipants)
                        }
                      }}
                      disabled={isLoading || isSubmitting || usersLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Add participants" />
                      </SelectTrigger>
                      <SelectContent>
                        {usersLoading ? (
                          <SelectItem value="loading" disabled>
                            Loading users...
                          </SelectItem>
                        ) : users.length === 0 ? (
                          <SelectItem value="no-data" disabled>
                            No users available
                          </SelectItem>
                        ) : (
                          users
                            .filter(user => !selectedParticipants.includes(user._id))
                            .map((user) => (
                              <SelectItem key={user._id} value={user._id}>
                                {user.username} ({user.email})
                              </SelectItem>
                            ))
                        )}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  {selectedParticipants.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedParticipants.map((participantId) => {
                        const user = users.find(u => u._id === participantId)
                        return (
                          <span
                            key={participantId}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-sm"
                          >
                            {user?.username || participantId}
                            <button
                              type="button"
                              onClick={() => {
                                const newParticipants = selectedParticipants.filter(id => id !== participantId)
                                setSelectedParticipants(newParticipants)
                                field.onChange(newParticipants)
                              }}
                              className="ml-1 hover:text-destructive"
                            >
                              ×
                            </button>
                          </span>
                        )
                      })}
                    </div>
                  )}
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
                {isSubmitting ? 'Saving...' : meeting ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

