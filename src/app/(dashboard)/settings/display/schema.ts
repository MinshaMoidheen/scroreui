import { z } from 'zod'

export const items = [
  {
    id: 'recents',
    label: 'Recents',
  },
  {
    id: 'home',
    label: 'Home',
  },
  {
    id: 'applications',
    label: 'Applications',
  },
  {
    id: 'desktop',
    label: 'Desktop',
  },
  {
    id: 'downloads',
    label: 'Downloads',
  },
  {
    id: 'documents',
    label: 'Documents',
  },
] as const

export const displayFormSchema = z.object({
  items: z.array(z.string()).min(1, {
    message: 'You have to select at least one item.',
  }),
})

export type DisplayFormValues = z.infer<typeof displayFormSchema>
