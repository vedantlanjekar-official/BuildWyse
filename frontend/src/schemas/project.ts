import { z } from 'zod'

export const projectCreateSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().optional(),
  category: z.string().optional(),
  industry: z.string().optional(),
  complexity: z.enum(['low', 'medium', 'high', 'enterprise']).optional(),
})

export type ProjectCreateForm = z.infer<typeof projectCreateSchema>
