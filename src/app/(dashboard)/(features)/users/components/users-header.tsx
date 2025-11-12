'use client'

import { Button } from '@/components/ui/button'
import { IconMailPlus, IconUserPlus } from '@tabler/icons-react'
import { useUsersContext } from '../context/users-context'

export function UsersHeader() {
  const { setOpen } = useUsersContext()

  return (
    <>
      <div>
        <h2 className='text-2xl font-bold tracking-tight'>User List</h2>
        <p className='text-muted-foreground'>
          Manage your users and their roles here.
        </p>
      </div>
      <div className='flex gap-2'>
        <Button
          variant='outline'
          className='space-x-1'
          onClick={() => setOpen('invite')}
        >
          <span>Invite User</span> <IconMailPlus size={18} />
        </Button>
        <Button className='space-x-1' onClick={() => setOpen('create')}>
          <span>Add User</span> <IconUserPlus size={18} />
        </Button>
      </div>
    </>
  )
}
