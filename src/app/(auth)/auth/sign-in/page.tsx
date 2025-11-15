'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserAuthForm } from '../components/user-auth-form'
import { TeacherAuthForm } from '../components/teacher-auth-form'
import { StudentAuthForm } from '../components/student-auth-form'
import { GraduationCap, User, Users } from 'lucide-react'

type LoginType = 'teacher' | 'admin' | 'student'

export default function SignIn() {
  const [loginType, setLoginType] = useState<LoginType>('student')

  const getTitle = () => {
    switch (loginType) {
      case 'teacher':
        return 'Teacher Login'
      case 'admin':
        return 'Admin Login'
      case 'student':
        return 'Student Login'
      default:
        return 'Login'
    }
  }

  const getDescription = () => {
    switch (loginType) {
      case 'teacher':
        return 'Enter your teacher credentials below to access teacher portal'
      case 'admin':
        return 'Enter your email and password below to log into your account'
      case 'student':
        return 'Enter your student credentials below to access your account'
      default:
        return 'Enter your credentials below to log into your account'
    }
  }

  const renderForm = () => {
    switch (loginType) {
      case 'teacher':
        return <TeacherAuthForm />
      case 'admin':
        return <UserAuthForm />
      case 'student':
        return <StudentAuthForm />
      default:
        return <StudentAuthForm />
    }
  }

  return (
    <Card className='p-6'>
      <div className='flex flex-col space-y-4'>
        {/* Header with toggle */}
        <div className='flex flex-col space-y-2 text-left'>
          <h1 className='text-2xl font-semibold tracking-tight'>
            {getTitle()}
          </h1>
          <p className='text-sm text-muted-foreground'>
            {getDescription()}
          </p>
        </div>

        {/* Login Type Toggle */}
        <div className='flex rounded-lg border p-1 gap-1'>
          <Button
            variant={loginType === 'student' ? 'default' : 'ghost'}
            size='sm'
            className='flex-1'
            onClick={() => setLoginType('student')}
          >
            <Users className='mr-2 h-4 w-4' />
            Student
          </Button>
          <Button
            variant={loginType === 'teacher' ? 'default' : 'ghost'}
            size='sm'
            className='flex-1'
            onClick={() => setLoginType('teacher')}
          >
            <GraduationCap className='mr-2 h-4 w-4' />
            Teacher
          </Button>
          <Button
            variant={loginType === 'admin' ? 'default' : 'ghost'}
            size='sm'
            className='flex-1'
            onClick={() => setLoginType('admin')}
          >
            <User className='mr-2 h-4 w-4' />
            Admin
          </Button>
          
        </div>

        {/* Form */}
        {renderForm()}

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
