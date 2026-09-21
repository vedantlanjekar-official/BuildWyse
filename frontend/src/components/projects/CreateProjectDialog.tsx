import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { projectCreateSchema, type ProjectCreateForm } from '@/schemas/project'
import { projectService } from '@/services/projectService'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'

export const PROJECT_CATEGORIES = [
  { value: 'website', label: 'Website' },
  { value: 'web_app', label: 'Web application' },
  { value: 'mobile_app', label: 'Mobile app' },
  { value: 'landing_page', label: 'Landing page' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'internal_tool', label: 'Internal tool' },
  { value: 'api_backend', label: 'API / Backend' },
  { value: 'design_branding', label: 'Design / Branding' },
  { value: 'other', label: 'Other' },
] as const

export const PROJECT_INDUSTRIES = [
  { value: 'Construction', label: 'Construction' },
  { value: 'Real Estate', label: 'Real Estate' },
  { value: 'Manufacturing', label: 'Manufacturing' },
  { value: 'Software / SaaS', label: 'Software / SaaS' },
  { value: 'Healthcare', label: 'Healthcare' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Education', label: 'Education' },
  { value: 'Retail', label: 'Retail' },
  { value: 'Industrial Technology', label: 'Industrial Technology' },
  { value: 'Other', label: 'Other' },
] as const

const fieldLabel = 'mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7c78]'
const fieldClass =
  'h-11 rounded-xl border-[#dce6e3] bg-white focus-visible:ring-[var(--color-primary)]'

type CreateProjectDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [categoryChoice, setCategoryChoice] = useState('')
  const [categoryOther, setCategoryOther] = useState('')
  const [industryChoice, setIndustryChoice] = useState('')
  const [industryOther, setIndustryOther] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProjectCreateForm>({
    resolver: zodResolver(projectCreateSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      industry: '',
      complexity: undefined,
    },
  })

  useEffect(() => {
    if (!open) return
    reset({
      title: '',
      description: '',
      category: '',
      industry: '',
      complexity: undefined,
    })
    setCategoryChoice('')
    setCategoryOther('')
    setIndustryChoice('')
    setIndustryOther('')
  }, [open, reset])

  useEffect(() => {
    if (categoryChoice === 'other') {
      setValue('category', categoryOther.trim())
    } else {
      setValue('category', categoryChoice)
    }
  }, [categoryChoice, categoryOther, setValue])

  useEffect(() => {
    if (industryChoice === 'Other') {
      setValue('industry', industryOther.trim())
    } else {
      setValue('industry', industryChoice)
    }
  }, [industryChoice, industryOther, setValue])

  const mutation = useMutation({
    mutationFn: (data: ProjectCreateForm) =>
      projectService.create({
        title: data.title.trim(),
        description: data.description?.trim() || undefined,
        category: data.category?.trim() || undefined,
        industry: data.industry?.trim() || undefined,
        complexity: data.complexity || undefined,
      }),
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      onOpenChange(false)
      navigate(`/projects/${project.id}`)
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New project"
      description="Add title, scope, category, industry, and complexity to open the workspace."
      className="max-h-[90vh] max-w-xl overflow-y-auto rounded-3xl border-[#dce6e3] shadow-[0_28px_80px_rgba(13,42,40,0.18)]"
    >
      {mutation.isError ? (
        <Alert variant="destructive" className="mb-4">
          {(mutation.error as Error).message}
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-5">
        <div>
          <label className={fieldLabel}>Title</label>
          <Input {...register('title')} className={fieldClass} placeholder="e.g. Corporate website redesign" />
          {errors.title ? <p className="mt-1 text-xs text-red-600">{errors.title.message}</p> : null}
        </div>

        <div>
          <label className={fieldLabel}>Description</label>
          <Textarea
            {...register('description')}
            rows={4}
            className="rounded-xl border-[#dce6e3]"
            placeholder="What are you building, and what outcome matters most?"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={fieldLabel}>Category</label>
            <Select
              value={categoryChoice}
              onChange={(e) => setCategoryChoice(e.target.value)}
              className={fieldClass}
            >
              <option value="">Select category</option>
              {PROJECT_CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
            {categoryChoice === 'other' ? (
              <Input
                value={categoryOther}
                onChange={(e) => setCategoryOther(e.target.value)}
                className={`${fieldClass} mt-2`}
                placeholder="Describe the category"
              />
            ) : null}
          </div>

          <div>
            <label className={fieldLabel}>Industry</label>
            <Select
              value={industryChoice}
              onChange={(e) => setIndustryChoice(e.target.value)}
              className={fieldClass}
            >
              <option value="">Select industry</option>
              {PROJECT_INDUSTRIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
            {industryChoice === 'Other' ? (
              <Input
                value={industryOther}
                onChange={(e) => setIndustryOther(e.target.value)}
                className={`${fieldClass} mt-2`}
                placeholder="Describe the industry"
              />
            ) : null}
          </div>
        </div>

        <div>
          <label className={fieldLabel}>Complexity</label>
          <Select {...register('complexity')} className={fieldClass}>
            <option value="">Select complexity</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="enterprise">Enterprise</option>
          </Select>
          {errors.complexity ? <p className="mt-1 text-xs text-red-600">{errors.complexity.message}</p> : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[#eef3f1] pt-5">
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-xl bg-[#0d2a28] hover:bg-[#16403c]"
          >
            {mutation.isPending ? 'Creating…' : 'Create project'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
