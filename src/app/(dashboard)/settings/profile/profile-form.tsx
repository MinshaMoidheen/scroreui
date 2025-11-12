import { getProfile } from './actions'
import { ProfileFormClient } from './profile-form-client'

export default async function ProfileForm() {
  const result = await getProfile()
  
  if (result.status === 'error') {
    throw new Error(result.message)
  }

  return <ProfileFormClient defaultValues={result.data} />
}
