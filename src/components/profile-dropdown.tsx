'use client'

import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/context/auth-context'
import { useLogoutMutation } from '@/store/api/authApi'

export function ProfileDropdown() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [logoutMutation, { isLoading }] = useLogoutMutation()

  console.log('User in ProfileDropdown:', user)

  const handleLogout = async () => {
    try {
      await logoutMutation().unwrap()
      logout()
      toast({
        title: 'Logged out successfully',
        description: 'You have been logged out of your account.',
      })
      router.push('/auth/sign-in')
    } catch (error: any) {
      // Even if the API call fails, we should still logout locally
      logout()
      toast({
        title: 'Logged out',
        description: 'You have been logged out of your account.',
      })
      router.push('/auth/sign-in')
    }
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
          <Avatar className='h-8 w-8'>
            <AvatarFallback>{user?.username[0] || 'User'}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-56' align='end' forceMount>
        <DropdownMenuLabel className='font-normal'>
          <div className='flex flex-col space-y-1'>
            <p className='text-sm font-medium leading-none'>
              {user?.username || 'User'}
            </p>
            <p className='text-xs leading-none text-muted-foreground'>
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {/* <DropdownMenuGroup>
          <DropdownMenuItem>
            Profile
            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            Billing
            <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            Settings
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>New Team</DropdownMenuItem>
        </DropdownMenuGroup> */}
        {/* <DropdownMenuSeparator /> */}
        <DropdownMenuItem onClick={handleLogout} disabled={isLoading}>
          {isLoading ? 'Logging out...' : 'Log out'}
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
