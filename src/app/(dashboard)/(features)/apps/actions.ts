'use server'

import { revalidatePath } from 'next/cache'
import { apps as initialApps } from './data/apps'
import { App} from './data/schema'

// メモリ内でのデータ管理（実際のアプリケーションではデータベースを使用する）
let apps = initialApps.map((app, index) => ({
  ...app,
  id: `APP-${index + 1}`,
}))

export async function getApps(): Promise<App[]> {
  return apps
}

export async function connectApp(id: string) {
  const appIndex = apps.findIndex(app => app.id === id)
  if (appIndex === -1) {
    throw new Error('App not found')
  }

  // アプリの接続状態を更新
  apps[appIndex] = {
    ...apps[appIndex],
    connected: true,
  }

  revalidatePath('/apps')
  return { message: 'App connected successfully' }
}

export async function disconnectApp(id: string) {
  const appIndex = apps.findIndex(app => app.id === id)
  if (appIndex === -1) {
    throw new Error('App not found')
  }

  // アプリの接続状態を更新
  apps[appIndex] = {
    ...apps[appIndex],
    connected: false,
  }

  revalidatePath('/apps')
  return { message: 'App disconnected successfully' }
}
