'use server'

import { revalidatePath } from 'next/cache'
import { userSchema } from './data/schema'
import { users } from './data/users'

// Get all users
export async function getUsers() {
  return users
}

// Create new user
export async function createUser(formData: FormData) {
  const rawData = {
    id: `USER-${Math.floor(Math.random() * 10000)}`,
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    username: formData.get('username'),
    email: formData.get('email'),
    phoneNumber: formData.get('phoneNumber'),
    role: formData.get('role'),
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const validatedData = userSchema.parse(rawData)
  users.push(validatedData)
  
  revalidatePath('/users')
  return { message: 'User created successfully' }
}

// Update user
export async function updateUser(id: string, formData: FormData) {
  const index = users.findIndex(user => user.id === id)
  if (index === -1) {
    throw new Error('User not found')
  }

  const rawData = {
    ...users[index],
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    username: formData.get('username'),
    email: formData.get('email'),
    phoneNumber: formData.get('phoneNumber'),
    role: formData.get('role'),
    updatedAt: new Date().toISOString(),
  }

  const validatedData = userSchema.parse(rawData)
  users[index] = validatedData
  
  revalidatePath('/users')
  return { message: 'User updated successfully' }
}

// Delete user
export async function deleteUser(id: string) {
  const index = users.findIndex(user => user.id === id)
  if (index === -1) {
    throw new Error('User not found')
  }

  users.splice(index, 1)
  
  revalidatePath('/users')
  return { message: 'User deleted successfully' }
}

// Invite user
export async function inviteUser(formData: FormData) {
  const rawData = {
    id: `USER-${Math.floor(Math.random() * 10000)}`,
    firstName: '',
    lastName: '',
    username: formData.get('email')?.toString().split('@')[0] || '',
    email: formData.get('email'),
    phoneNumber: '',
    role: formData.get('role'),
    status: 'invited',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const validatedData = userSchema.parse(rawData)
  users.push(validatedData)
  
  revalidatePath('/users')
  return { message: 'User invited successfully' }
}
