import { z } from 'zod'

export const appSchema = z.object({
  id: z.string(),
  name: z.string(),
  logo: z.any(), // IconコンポーネントはTypeScriptの型で表現が難しいためanyを使用
  connected: z.boolean(),
  desc: z.string(),
})

export type App = z.infer<typeof appSchema>
