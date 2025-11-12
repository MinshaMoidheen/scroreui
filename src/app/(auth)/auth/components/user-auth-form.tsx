'use client'

import { HTMLAttributes } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
import { useLoginMutation } from '@/store/api/authApi'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/context/auth-context'

type UserAuthFormProps = HTMLAttributes<HTMLDivElement>

const formSchema = z.object({
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
})

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { login } = useAuth()
  const [loginMutation, { isLoading }] = useLoginMutation()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    try {
      const result = await loginMutation({
        email: data.email,
        password: data.password,
      }).unwrap()

      // Allow only admin/superadmin to sign in from this form
      const role = result?.user?.role?.toLowerCase()
      const access = result?.user?.access?.toLowerCase()
      const isUserRole = role === 'user' || role === 'student' || access === 'user' || access === 'student'
      const isAdminRole = role === 'admin' || role === 'superadmin' || access === 'admin' || access === 'superadmin'

      if (isUserRole) {
        toast({
          title: 'Cannot sign in here',
          description: "You can't sign in as user on the admin login.",
          variant: 'destructive',
        })
        return
      }

      // Proceed for admins only
      login(result.user, result.accessToken)

      toast({
        title: 'Login Successful',
        description: `Welcome back, ${result?.user?.username}!`,
      })

      router.push('/')
    } catch (error: unknown) {
      console.log('login error', error)
      if (error && typeof error === 'object' && 'data' in error) {
        const err = error as { data?: { code?: string; message?: string; errors?: Record<string, { msg?: string }> } }
        if (err.data?.code === 'Validation Error' && err.data.errors) {
          Object.entries(err.data.errors).forEach(([field, details]) => {
            const message = details?.msg || 'Invalid value'
            if (field === 'email' || field === 'password') {
              form.setError(field as 'email' | 'password', { type: 'server', message })
            }
          })
          toast({
            title: 'Validation Error',
            description: err.data.message || 'Please fix the highlighted fields and try again.',
            variant: 'destructive',
          })
          return
        }
        const code = err.data?.code
        toast({
          title: code || 'Login Failed',
          description: err.data?.message || 'Something went wrong. Please try again.',
          variant: 'destructive',
        })
        return
      }
      toast({
        title: 'Login Failed',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      })
    }
  }

     
    
  

  return (
    <div className={cn('grid gap-6 relative', className)} {...props}>
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Signing in...</p>
          </div>
        </div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className='grid gap-2'>
            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem className='space-y-1'>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder='name@example.com' 
                      disabled={isLoading}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='password'
              render={({ field }) => (
                <FormItem className='space-y-1'>
                  <div className='flex items-center justify-between'>
                    <FormLabel>Password</FormLabel>
                    <Link
                      href='/forgot-password'
                      className='text-sm font-medium text-muted-foreground hover:opacity-75'
                    >
                      Forgot password?
                    </Link>
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
            <Button className='mt-2' disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Signing in...
                </>
              ) : (
                'Login'
              )}
            </Button>

            {/* <div className='relative my-2'>
              <div className='absolute inset-0 flex items-center'>
                <span className='w-full border-t' />
              </div>
              <div className='relative flex justify-center text-xs uppercase'>
                <span className='bg-background px-2 text-muted-foreground'>
                  Or continue with
                </span>
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                className='w-full'
                type='button'
                disabled={isLoading}
              >
                <IconBrandGithub className='h-4 w-4' /> GitHub
              </Button>
              <Button
                variant='outline'
                className='w-full'
                type='button'
                disabled={isLoading}
              >
                <IconBrandFacebook className='h-4 w-4' /> Facebook
              </Button>
            </div> */}
          </div>
        </form>
      </Form>
    </div>
  )
}
