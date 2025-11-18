'use client'

import { HTMLAttributes, useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { User, Lock, BookOpen, Users, Hash } from 'lucide-react'
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
import { useStudentLoginMutation } from '@/store/api/authApi'
import { useGetCourseClassesQuery } from '@/store/api/courseClassApi'
import { useGetSectionsQuery } from '@/store/api/sectionApi'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/context/auth-context'

type StudentAuthFormProps = HTMLAttributes<HTMLDivElement>

const studentFormSchema = z.object({
  username: z
    .string()
    .min(1, { message: 'Please enter your username' }),
  password: z
    .string()
    .min(1, {
      message: 'Please enter your password',
    })
    .min(6, {
      message: 'Password must be at least 6 characters long',
    }),
  courseClass: z
    .string()
    .min(1, { message: 'Please select a class' }),
  section: z
    .string()
    .min(1, { message: 'Please select a section' }),
  rollNumber: z
    .string()
    .min(1, { message: 'Please enter your roll number' }),
})

export function StudentAuthForm({ className, ...props }: StudentAuthFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { login } = useAuth()
  const [studentLogin, { isLoading }] = useStudentLoginMutation()

  const form = useForm<z.infer<typeof studentFormSchema>>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      username: '',
      password: '',
      courseClass: '',
      section: '',
      rollNumber: '',
    },
  })

  // Fetch data from APIs
  const { data: courseClasses = [], isLoading: isLoadingClasses } = useGetCourseClassesQuery()
  const { data: allSections = [], isLoading: isLoadingSections } = useGetSectionsQuery()

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

  async function onSubmit(data: z.infer<typeof studentFormSchema>) {
    try {
      const result = await studentLogin({
        username: data.username,
        password: data.password,
        courseClass: data.courseClass,
        section: data.section,
        rollNumber: data.rollNumber,
      }).unwrap()

      // Block sign-in if the authenticated account is not a student
      const role = result?.user?.role?.toLowerCase()
      
      if (role !== 'student') {
        toast({
          title: 'Access Denied',
          description: 'Only students can login here. Please use the appropriate login page.',
          variant: 'destructive',
        })
        return
      }

      // Create enhanced user data with class and section IDs
      const enhancedUser = {
        ...result.user,
        courseClass: data.courseClass,
        section: data.section,
      }

      // Use the auth context to store enhanced user data
      login(enhancedUser, result.accessToken)

      // Save the IDs to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('courseclass', data.courseClass)
        localStorage.setItem('section', data.section)
      }

      toast({
        title: 'Login Successful',
        description: `Welcome back, ${result?.user?.username}!`,
      })

      router.push('/user-folders')
    } catch (error: unknown) {
      console.log('login error', error)
      const errorMessage =
        (error as any)?.data?.message ||
        (error as any)?.data?.detail?.message ||
        'Login failed. Please check your credentials and try again.'
      
      toast({
        title: 'Login Failed',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  // Calculate loading state
  const isDataLoading = isLoadingClasses || isLoadingSections

  return (
    <div className={cn('grid gap-6 relative', className)} {...props}>
      {(isLoading || isDataLoading) && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              {isLoading ? 'Signing in...' : 'Loading data...'}
            </p>
          </div>
        </div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className='grid gap-4'>
            {/* Username Field */}
            <FormField
              control={form.control}
              name='username'
              render={({ field }) => (
                <FormItem className='space-y-1'>
                  <FormLabel className='flex items-center gap-2'>
                    
                    Username
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder='Enter your username' 
                      type='text'
                      disabled={isLoading || isDataLoading}
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
                    <FormLabel className='flex items-center gap-2'>
                      
                      Password
                    </FormLabel>
                    <FormControl>
                      <PasswordInput 
                        placeholder='Enter your password' 
                        disabled={isLoading || isDataLoading}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Class Field */}
              <FormField
                control={form.control}
                name='courseClass'
                render={({ field }) => (
                  <FormItem className='space-y-1'>
                    <FormLabel className='flex items-center gap-2'>
                     
                      Class
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLoading || isDataLoading || isLoadingClasses}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select a class' />
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

            {/* Section and Roll Number side-by-side */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {/* Section Field */}
              <FormField
                control={form.control}
                name='section'
                render={({ field }) => (
                  <FormItem className='space-y-1'>
                    <FormLabel className='flex items-center gap-2'>
                     
                      Section
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLoading || isDataLoading || isLoadingSections || !selectedCourseClassId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Select a section' />
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

              {/* Roll Number Field */}
              <FormField
                control={form.control}
                name='rollNumber'
                render={({ field }) => (
                  <FormItem className='space-y-1'>
                    <FormLabel className='flex items-center gap-2'>
                    
                      Roll Number
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder='Enter your roll number' 
                        type='text'
                        disabled={isLoading || isDataLoading}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type='submit' className='w-full' disabled={isLoading || isDataLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

