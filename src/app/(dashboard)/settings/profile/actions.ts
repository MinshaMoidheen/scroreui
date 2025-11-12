'use server'

import { revalidatePath } from 'next/cache'
import { profileFormSchema, type ProfileFormValues } from './schema'

type GetProfileResult = 
  | { status: 'success', data: ProfileFormValues }
  | { status: 'error', message: string }

export async function getProfile(): Promise<GetProfileResult> {
  try {
    // TODO: 実際のデータベースからの取得処理をここに実装
    // この例では、ダミーデータを返します
    return {
      status: 'success',
      data: {
        username: 'demo-user',
        email: 'm@example.com',
        bio: 'I own a computer.',
        urls: [
          { value: 'https://shadcn.com' },
          { value: 'http://twitter.com/shadcn' },
        ],
      } as ProfileFormValues
    }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to fetch profile'
    }
  }
}

type UpdateProfileResult = 
  | { status: 'success', message: string }
  | { status: 'error', message: string }

export async function updateProfile(data: ProfileFormValues): Promise<UpdateProfileResult> {
  // バリデーション
  profileFormSchema.parse(data)

  try {
    // TODO: 実際のデータベース更新処理をここに実装
    // この例では、成功したと仮定します
    
    // キャッシュの再検証
    revalidatePath('/settings/profile')
    
    return { status: 'success', message: 'Profile updated successfully' }
  } catch (error) {
    return { 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Failed to update profile' 
    }
  }
}
