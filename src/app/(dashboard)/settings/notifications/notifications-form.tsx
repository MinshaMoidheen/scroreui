import { getNotifications } from './actions'
import { NotificationsFormClient } from './notifications-form-client'

export default async function NotificationsForm() {
  const result = await getNotifications()
  
  if (result.status === 'error') {
    throw new Error(result.message)
  }

  return <NotificationsFormClient defaultValues={result.data} />
}
