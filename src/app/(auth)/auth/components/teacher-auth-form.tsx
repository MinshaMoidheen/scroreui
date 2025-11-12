'use client'

import { HTMLAttributes, useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User, Lock, BookOpen, Users, Building } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
import { useTeacherLoginMutation } from '@/store/api/authApi'
import { useCreateTeacherSessionMutation } from '@/store/api/teacherSessionApi'
import { useGetCourseClassesQuery } from '@/store/api/courseClassApi'
import { useGetSectionsQuery } from '@/store/api/sectionApi'
import { useGetSubjectsQuery } from '@/store/api/subjectApi'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/context/auth-context'

type TeacherAuthFormProps = HTMLAttributes<HTMLDivElement>

const teacherFormSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Please enter your email' }),
  password: z
    .string()
    .min(1, {
      message: 'Please enter your password',
    })
    .min(6, {
      message: 'Password must be at least 6 characters long',
    }),
  courseClassId: z
    .string()
    .min(1, { message: 'Please select a class' }),
  sectionId: z
    .string()
    .min(1, { message: 'Please select a section' }),
  subjectId: z
    .string()
    .min(1, { message: 'Please select a subject' }),
})


export function TeacherAuthForm({ className, ...props }: TeacherAuthFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { login } = useAuth()
  const [teacherLogin, { isLoading }] = useTeacherLoginMutation()
  const [createTeacherSession] = useCreateTeacherSessionMutation()

  const form = useForm<z.infer<typeof teacherFormSchema>>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: {
      email: '',
      password: '',
      courseClassId: '',
      sectionId: '',
      subjectId: '',
    },
  })

  // Fetch data from APIs
  const { data: courseClasses = [], isLoading: isLoadingClasses } = useGetCourseClassesQuery()
  const { data: allSections = [], isLoading: isLoadingSections } = useGetSectionsQuery()
  const { data: subjects = [], isLoading: isLoadingSubjects } = useGetSubjectsQuery()

  // Watch the selected course class to filter sections
  const selectedCourseClassId = form.watch('courseClassId')
  
  // Filter sections based on selected class
  const sections = allSections.filter(section => 
    selectedCourseClassId && section.courseClass._id === selectedCourseClassId
  )

  // Reset section and subject when class changes
  useEffect(() => {
    if (selectedCourseClassId) {
      form.setValue('sectionId', '')
      form.setValue('subjectId', '')
    }
  }, [selectedCourseClassId, form])

  async function onSubmit(data: z.infer<typeof teacherFormSchema>) {
    try {
      const result = await teacherLogin({
        email: data.email,
        password: data.password,
        courseClassId: data.courseClassId,
        sectionId: data.sectionId,
        subjectId: data.subjectId,
      }).unwrap()

      // Block sign-in if the authenticated account is admin/superadmin
      const role = result?.user?.role?.toLowerCase()
      const access = result?.user?.access?.toLowerCase()
      const isAdminRole = role === 'admin' || role === 'superadmin' || access === 'admin' || access === 'superadmin'
      const isUserRole = role === 'user' || role === 'student' || access === 'user' || access === 'student'

      if (isAdminRole) {
        toast({
          title: 'Cannot sign in here',
          description: "You can't sign in as teacher on the admin login.",
          variant: 'destructive',
        })
        return
      }

      const selectedClass = courseClasses.find(cl => cl._id === data.courseClassId)
      const selectedSection = sections.find(sec => sec._id === data.sectionId)
      const selectedSubject = subjects.find(sub => sub._id === data.subjectId)

      // Create enhanced user data with class, section, and subject IDs
      const enhancedUser = {
        ...result.user,
        classsubject: data.courseClassId, // Save class ID as classsubject
        section: data.sectionId, // Save section ID as section
        subject: data.subjectId, // Save subject ID as subject
      }

      // Use the auth context to store enhanced user data
      login(enhancedUser, result.accessToken)

      // Save the IDs to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('courseclass', data.courseClassId)
        localStorage.setItem('section', data.sectionId)
        localStorage.setItem('subject', data.subjectId)
      }

      try {
        const sessionResult = await createTeacherSession({
          username : result.user.username,
          courseClassName: selectedClass?._id || '',
          sectionName: selectedSection?._id || '',
          subjectName: selectedSubject?._id || '',
          sessionToken: result.accessToken,
        }).unwrap()
        
        // Store the complete session object with all required fields
        const sessionToStore = {
          ...sessionResult.session,
          courseClassName: selectedClass?.name || '',
          sectionName: selectedSection?.name || '',
          subjectName: selectedSubject?.name || '',
          sessionToken: result.accessToken
        }
        localStorage.setItem('teacherSession', JSON.stringify(sessionToStore))
        console.log("teacher created successfully", sessionToStore)
      } catch (error: unknown) {
        console.error('Error creating teacher session:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to create teacher session. Please try again.'
        const apiError = error && typeof error === 'object' && 'data' in error ? (error as { data?: { message?: string } }).data?.message : undefined
        toast({
          title: 'Error',
          description: apiError || errorMessage,
          variant: 'destructive',
        })
      }

      toast({
        title: 'Teacher Login Successful',
        description: `Welcome back, ${result.user.username}!`,
      })

      // Redirect to dashboard
      router.push('/user-folders')
    } catch (error: unknown) {
      console.error('Teacher login error:', error)
      
      // Handle different types of errors
      let errorMessage = 'An unexpected error occurred during teacher login'
      let errorTitle = 'Teacher Login Failed'

      if (error && typeof error === 'object' && 'data' in error) {
        const err = error as { data?: { code?: string; message?: string; errors?: Record<string, { msg: string }> } }
        // Handle validation errors with detailed field errors
        if (err.data?.code === 'Validation Error' && err.data.errors) {
          errorTitle = 'Validation Error'
          const fieldErrors = Object.values(err.data.errors) as Array<{ msg: string }>
          if (fieldErrors.length > 0) {
            // Use the first error message as the main message
            errorMessage = fieldErrors[0]?.msg || 'Please check your input and try again'
          } else {
            errorMessage = 'Please check your input and try again'
          }
        }
        // API error response
        else if (err.data?.message && typeof err.data.message === 'string') {
          errorMessage = err.data.message
        }
        
        // Handle specific error codes
        if (err.data?.code) {
          switch (err.data.code) {
            case 'Not Found':
              errorTitle = 'Teacher Not Found'
              errorMessage = 'No teacher account found with this email address'
              break
            case 'BadRequest':
              errorTitle = 'Invalid Request'
              const message = err.data.message
              if (message && typeof message === 'string') {
                if (message.includes('courseClassId, sectionId, and subjectId are required')) {
                  errorMessage = 'Please select a class, section, and subject for teacher login'
                } else if (message.includes('Invalid courseClass, section, or subject selection')) {
                  errorMessage = 'Invalid class, section, or subject selection. Please try again.'
                } else {
                  errorMessage = message
                }
              }
              break
            case 'Authorization Error':
              errorTitle = 'Access Denied'
              errorMessage = 'You do not have permission to login as a teacher'
              break
            case 'Server Error':
              errorTitle = 'Server Error'
              break
            case 'Validation Error':
              // Already handled above
              break
            default:
              errorTitle = 'Teacher Login Failed'
          }
        }
      } else if (error instanceof Error && error.message) {
        // Network or other errors
        errorMessage = error.message
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  // Calculate loading state
  const isDataLoading = isLoadingClasses || isLoadingSections || isLoadingSubjects

  return (
    <div className={cn('grid gap-6 relative', className)} {...props}>
      {(isLoading || isDataLoading) && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              {isLoading ? 'Signing as Teacher...' : 'Loading data...'}
            </p>
          </div>
        </div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className='grid gap-4'>
            {/* Email Field */}
            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem className='space-y-1'>
                  <FormLabel className='flex items-center gap-2'>
                    
                    Email
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder='Enter your email' 
                      type='text'
                      disabled={isLoading}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password and Class side-by-side */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {/* Password Field */}
              <FormField
                control={form.control}
                name='password'
                render={({ field }) => (
                  <FormItem className='space-y-1'>
                    <div className='flex items-center justify-between'>
                      <FormLabel className='flex items-center gap-2'>
                        
                        Password
                      </FormLabel>
                      {/* <Link
                        href='/forgot-password'
                        className='text-sm font-medium text-muted-foreground hover:opacity-75'
                      >
                        Forgot password?
                      </Link> */}
                    </div>
                    <FormControl>
                      <PasswordInput 
                        placeholder='********' 
                        disabled={isLoading}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Course Class Selection */}
              <FormField
                control={form.control}
                name='courseClassId'
                render={({ field }) => (
                  <FormItem className='space-y-1'>
                    <FormLabel className='flex items-center gap-2'>
                    
                      Class
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading || isDataLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingClasses ? "Loading classes..." : "Select your class"} />
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
            </div>

            {/* Section and Subject side-by-side */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {/* Section Selection */}
              <FormField
                control={form.control}
                name='sectionId'
                render={({ field }) => (
                  <FormItem className='space-y-1'>
                    <FormLabel className='flex items-center gap-2'>
                    
                      Section
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading || isDataLoading || !selectedCourseClassId}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={
                            !selectedCourseClassId 
                              ? "Select a class first" 
                              : isLoadingSections 
                                ? "Loading sections..." 
                                : sections.length === 0 
                                  ? "No sections available" 
                                  : "Select section"
                          } />
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

              {/* Subject Selection */}
              <FormField
                control={form.control}
                name='subjectId'
                render={({ field }) => (
                  <FormItem className='space-y-1'>
                    <FormLabel className='flex items-center gap-2'>
                     
                      Subject
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading || isDataLoading || !selectedCourseClassId}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={
                            !selectedCourseClassId 
                              ? "Select a class first" 
                              : isLoadingSubjects 
                                ? "Loading subjects..." 
                                : "Select subject"
                          } />
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
            
            <Button className='mt-2' disabled={isLoading || isDataLoading}>
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Signing as Teacher...
                </>
              ) : isDataLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Loading data...
                </>
              ) : (
                'Sign in as Teacher'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
