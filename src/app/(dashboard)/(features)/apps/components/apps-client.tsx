'use client'

import { useState } from 'react'
import {
  IconAdjustmentsHorizontal,
  IconSortAscendingLetters,
  IconSortDescendingLetters,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { App } from '../data/schema'
import { connectApp, disconnectApp } from '../actions'
import { useToast } from '@/hooks/use-toast'

const appText = new Map<string, string>([
  ['all', 'All Apps'],
  ['connected', 'Connected'],
  ['notConnected', 'Not Connected'],
])

interface AppsClientProps {
  initialApps: App[]
}

export function AppsClient({ initialApps }: AppsClientProps) {
  const [sort, setSort] = useState('ascending')
  const [appType, setAppType] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isPending, setIsPending] = useState(false)
  const { toast } = useToast()

  const filteredApps = initialApps
    .sort((a, b) =>
      sort === 'ascending'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name)
    )
    .filter((app) =>
      appType === 'connected'
        ? app.connected
        : appType === 'notConnected'
          ? !app.connected
          : true
    )
    .filter((app) => app.name.toLowerCase().includes(searchTerm.toLowerCase()))

  async function handleConnectToggle(app: App) {
    try {
      setIsPending(true)
      if (app.connected) {
        await disconnectApp(app.id)
        toast({
          title: 'App Disconnected',
          description: `${app.name} has been disconnected successfully.`,
        })
      } else {
        await connectApp(app.id)
        toast({
          title: 'App Connected',
          description: `${app.name} has been connected successfully.`,
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update app connection status.',
        variant: 'destructive',
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-shrink-0">
        <h1 className='text-2xl font-bold tracking-tight'>
          App Integrations
        </h1>
        <p className='text-muted-foreground'>
          Here&apos;s a list of your apps for the integration!
        </p>
      </div>
      <div className='my-4 flex items-end justify-between sm:my-0 sm:items-center flex-shrink-0'>
        <div className='flex flex-col gap-4 sm:my-4 sm:flex-row'>
          <Input
            placeholder='Filter apps...'
            className='h-9 w-40 lg:w-[250px]'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select value={appType} onValueChange={setAppType}>
            <SelectTrigger className='w-36'>
              <SelectValue>{appText.get(appType)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All Apps</SelectItem>
              <SelectItem value='connected'>Connected</SelectItem>
              <SelectItem value='notConnected'>Not Connected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className='w-16'>
            <SelectValue>
              <IconAdjustmentsHorizontal size={18} />
            </SelectValue>
          </SelectTrigger>
          <SelectContent align='end'>
            <SelectItem value='ascending'>
              <div className='flex items-center gap-4'>
                <IconSortAscendingLetters size={16} />
                <span>Ascending</span>
              </div>
            </SelectItem>
            <SelectItem value='descending'>
              <div className='flex items-center gap-4'>
                <IconSortDescendingLetters size={16} />
                <span>Descending</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Separator className='shadow flex-shrink-0' />
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto">
          <ul className='faded-bottom no-scrollbar grid gap-4 pb-16 pt-4 md:grid-cols-2 lg:grid-cols-3'>
            {filteredApps.map((app) => (
              <li
                key={app.id}
                className='rounded-lg border p-4 hover:shadow-md'
              >
                <div className='mb-8 flex items-center justify-between'>
                  <div
                    className={`flex size-10 items-center justify-center rounded-lg bg-muted p-2`}
                  >
                    {app.logo}
                  </div>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={isPending}
                    onClick={() => handleConnectToggle(app)}
                    className={`${app.connected ? 'border border-blue-300 bg-blue-50 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-950 dark:hover:bg-blue-900' : ''}`}
                  >
                    {app.connected ? 'Connected' : 'Connect'}
                  </Button>
                </div>
                <div>
                  <h2 className='mb-1 font-semibold'>{app.name}</h2>
                  <p className='line-clamp-2 text-gray-500'>{app.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
