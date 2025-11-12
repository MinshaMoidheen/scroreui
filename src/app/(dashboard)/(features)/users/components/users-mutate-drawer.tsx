'use client'

import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from '@/hooks/use-toast'
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
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { SelectDropdown } from '@/components/select-dropdown'
import { User} from '../data/schema'
import { createUser, updateUser } from '../actions'
import { userTypes } from '../data/data'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: User
}

const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  username: z.string().min(1, 'Username is required.'),
  email: z.string().email('Invalid email address.'),
  phoneNumber: z.string().min(1, 'Phone number is required.'),
  status: z.enum(['active', 'inactive', 'invited', 'suspended'] as const),
  role: z.enum(['superadmin', 'admin', 'cashier', 'manager'] as const),
})
type UsersForm = z.infer<typeof formSchema>

export function UsersMutateDrawer({ open, onOpenChange, currentRow }: Props) {
  const isUpdate = !!currentRow

  const form = useForm<UsersForm>({
    resolver: zodResolver(formSchema),
    defaultValues: currentRow ?? {
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      phoneNumber: '',
      status: 'active',
      role: 'cashier',
    },
  })

  const onSubmit = async (data: UsersForm) => {
    try {
      const formData = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value)
      })

      if (isUpdate && currentRow) {
        await updateUser(currentRow.id, formData)
        toast({
          title: 'User updated successfully',
          description: (
            <pre className='mt-2 w-[340px] rounded-md bg-slate-950 p-4'>
              <code className='text-white'>{JSON.stringify(data, null, 2)}</code>
            </pre>
          ),
        })
      } else {
        await createUser(formData)
        toast({
          title: 'User created successfully',
          description: (
            <pre className='mt-2 w-[340px] rounded-md bg-slate-950 p-4'>
              <code className='text-white'>{JSON.stringify(data, null, 2)}</code>
            </pre>
          ),
        })
      }

      onOpenChange(false)
      form.reset()
    } catch (error) {

      console.log(error)
      toast({
        title: 'Error',
        description: `Failed to ${isUpdate ? 'update' : 'create'} user`,
        variant: 'destructive',
      })
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        form.reset()
      }}
    >
      <SheetContent className='flex flex-col'>
        <SheetHeader className='text-left'>
          <SheetTitle>{isUpdate ? 'Update' : 'Create'} User</SheetTitle>
          <SheetDescription>
            {isUpdate
              ? 'Update the user by providing necessary info.'
              : 'Add a new user by providing necessary info.'}
            Click save when you&apos;re done.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            id='users-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-5 flex-1'
          >
            <FormField
              control={form.control}
              name='firstName'
              render={({ field }) => (
                <FormItem className='space-y-1'>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder='Enter first name' />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='lastName'
              render={({ field }) => (
                <FormItem className='space-y-1'>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder='Enter last name' />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='username'
              render={({ field }) => (
                <FormItem className='space-y-1'>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder='Enter username' />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem className='space-y-1'>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type='email' placeholder='Enter email' />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='phoneNumber'
              render={({ field }) => (
                <FormItem className='space-y-1'>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder='Enter phone number' />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='status'
              render={({ field }) => (
                <FormItem className='space-y-1'>
                  <FormLabel>Status</FormLabel>
                  <SelectDropdown
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                    placeholder='Select status'
                    items={[
                      { label: 'Active', value: 'active' },
                      { label: 'Inactive', value: 'inactive' },
                      { label: 'Invited', value: 'invited' },
                      { label: 'Suspended', value: 'suspended' },
                    ]}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='role'
              render={({ field }) => (
                <FormItem className='space-y-1'>
                  <FormLabel>Role</FormLabel>
                  <SelectDropdown
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                    placeholder='Select role'
                    items={userTypes.map(({ label, value }) => ({
                      label,
                      value,
                    }))}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <SheetFooter className='gap-2'>
          <SheetClose asChild>
            <Button variant='outline'>Close</Button>
          </SheetClose>
          <Button form='users-form' type='submit'>
            Save changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
