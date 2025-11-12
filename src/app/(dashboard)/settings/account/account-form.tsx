import { getAccount } from './actions'
import { AccountFormClient } from './account-form-client'

export default async function AccountForm() {
  const result = await getAccount()
  
  if (result.status === 'error') {
    throw new Error(result.message)
  }

  return <AccountFormClient defaultValues={result.data} />
}
