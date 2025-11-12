import { getAppearance } from './actions'
import { AppearanceFormClient } from './appearance-form-client'

export default async function AppearanceForm() {
  const result = await getAppearance()
  
  if (result.status === 'error') {
    throw new Error(result.message)
  }

  return <AppearanceFormClient defaultValues={result.data} />
}
