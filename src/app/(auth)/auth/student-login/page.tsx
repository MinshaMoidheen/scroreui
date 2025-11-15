'use client'

import { Card } from '@/components/ui/card'
import { StudentAuthForm } from '../components/student-auth-form'
import { GraduationCap } from 'lucide-react'

export default function StudentLogin() {
  return (
    <Card className='p-6'>
      <div className='flex flex-col space-y-4'>
        {/* Header */}
        <div className='flex flex-col space-y-2 text-left'>
          <div className='flex items-center gap-2'>
            <GraduationCap className='h-6 w-6' />
            <h1 className='text-2xl font-semibold tracking-tight'>
              Student Login
            </h1>
          </div>
          <p className='text-sm text-muted-foreground'>
            Enter your student credentials below to access your account
          </p>
        </div>

        {/* Form */}
        <StudentAuthForm />

        {/* Terms and Privacy */}
        <p className='mt-4 px-8 text-center text-sm text-muted-foreground'>
          By clicking login, you agree to our{' '}
          <a
            href='/terms'
            className='underline underline-offset-4 hover:text-primary'
          >
            Terms of Service
          </a>{' '}
          and{' '}
          <a
            href='/privacy'
            className='underline underline-offset-4 hover:text-primary'
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </Card>
  )
}

