import { getDisplay } from './actions'
import { DisplayFormClient } from './display-form-client'

export default async function DisplayForm() {
  const result = await getDisplay()
  
  if (result.status === 'error') {
    throw new Error(result.message)
  }

  return <DisplayFormClient defaultValues={result.data} />
}
