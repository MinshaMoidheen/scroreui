import { AppsClient } from './components/apps-client'
import { getApps } from './actions'

export default async function AppsPage() {
  const apps = await getApps()
  return <AppsClient initialApps={apps} />
}
