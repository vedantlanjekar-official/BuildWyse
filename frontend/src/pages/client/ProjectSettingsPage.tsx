import {
  SectionHeader,
  SoftCard,
  formatDate,
  formatState,
} from '@/components/client/SectionKit'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { PROJECT_CATEGORIES, PROJECT_INDUSTRIES } from '@/components/projects/CreateProjectDialog'
import { projectService } from '@/services/projectService'
import { useAuthStore } from '@/stores/authStore'
import type { Project } from '@/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'

const COMPLEXITY = ['low', 'medium', 'high', 'enterprise'] as const

export function ProjectSettingsPage() {
  const { id } = useParams<{ id: string }>()
  const { project } = useOutletContext<{ project: Project }>()
  const roles = useAuthStore((s) => s.roles())
  const canEdit = roles.includes('CLIENT') || roles.includes('ADMIN')
  const queryClient = useQueryClient()

  const [title, setTitle] = useState(project.title)
  const [description, setDescription] = useState(project.description ?? '')
  const [category, setCategory] = useState(project.category ?? '')
  const [industry, setIndustry] = useState(project.industry ?? '')
  const [complexity, setComplexity] = useState(project.complexity ?? '')
  const [budget, setBudget] = useState(project.estimated_budget ?? '')
  const [devModel, setDevModel] = useState(project.development_model ?? '')
  const [savedMsg, setSavedMsg] = useState<string | null>(null)

  useEffect(() => {
    setTitle(project.title)
    setDescription(project.description ?? '')
    setCategory(project.category ?? '')
    setIndustry(project.industry ?? '')
    setComplexity(project.complexity ?? '')
    setBudget(project.estimated_budget ?? '')
    setDevModel(project.development_model ?? '')
  }, [project])

  const updateMutation = useMutation({
    mutationFn: () =>
      projectService.update(id!, {
        title: title.trim(),
        description: description.trim() || null,
        category: category || null,
        industry: industry || null,
        complexity: complexity || null,
        estimated_budget: budget === '' ? null : Number(budget),
        development_model: devModel.trim() || null,
      }),
    onSuccess: async () => {
      setSavedMsg('Project settings saved.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project', id] }),
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
        queryClient.invalidateQueries({ queryKey: ['client', 'dashboard'] }),
      ])
    },
  })

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Project settings"
        description="Manage title, description, category, industry, complexity, and commercial details."
        actions={
          canEdit ? (
            <Button
              className="rounded-xl bg-[#0d2a28] hover:bg-[#16403c]"
              disabled={updateMutation.isPending || title.trim().length < 3}
              onClick={() => {
                setSavedMsg(null)
                updateMutation.mutate()
              }}
            >
              <Save className="mr-2 h-4 w-4" />
              {updateMutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          ) : null
        }
      />

      {updateMutation.isError ? (
        <Alert variant="destructive">{(updateMutation.error as Error).message}</Alert>
      ) : null}
      {savedMsg ? <Alert>{savedMsg}</Alert> : null}
      {!canEdit ? (
        <Alert>Only the project client can edit these settings. You can still review the details below.</Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)]">
        <SoftCard title="Project details" subtitle="Core identity for this engagement">
          <div className="space-y-4">
            <Field label="Project title">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!canEdit}
                className="rounded-xl"
              />
            </Field>
            <Field label="Description">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!canEdit}
                rows={5}
                className="rounded-xl"
                placeholder="Describe goals, scope, and outcomes…"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category">
                <select
                  className="h-10 w-full rounded-xl border border-[var(--color-input)] bg-white px-3 text-sm"
                  value={category}
                  disabled={!canEdit}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Select category</option>
                  {PROJECT_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Industry">
                <select
                  className="h-10 w-full rounded-xl border border-[var(--color-input)] bg-white px-3 text-sm"
                  value={industry}
                  disabled={!canEdit}
                  onChange={(e) => setIndustry(e.target.value)}
                >
                  <option value="">Select industry</option>
                  {PROJECT_INDUSTRIES.map((i) => (
                    <option key={i.value} value={i.value}>
                      {i.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Complexity">
                <select
                  className="h-10 w-full rounded-xl border border-[var(--color-input)] bg-white px-3 text-sm"
                  value={complexity}
                  disabled={!canEdit}
                  onChange={(e) => setComplexity(e.target.value)}
                >
                  <option value="">Select complexity</option>
                  {COMPLEXITY.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Development model">
                <Input
                  value={devModel}
                  onChange={(e) => setDevModel(e.target.value)}
                  disabled={!canEdit}
                  className="rounded-xl"
                  placeholder="e.g. fixed_price, time_material"
                />
              </Field>
              <Field label={`Estimated budget (${project.currency || 'INR'})`}>
                <Input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  disabled={!canEdit}
                  className="rounded-xl"
                  placeholder="0"
                />
              </Field>
            </div>
          </div>
        </SoftCard>

        <SoftCard title="Read-only metadata" subtitle="System-managed fields">
          <dl className="space-y-3 text-sm">
            <MetaRow label="State" value={formatState(project.state)} />
            <MetaRow label="Project ID" value={project.id} />
            <MetaRow label="Client ID" value={project.client_id} />
            <MetaRow
              label="Assigned freelancer"
              value={project.assigned_freelancer_name || project.assigned_freelancer_id || '—'}
            />
            <MetaRow label="Created" value={formatDate(project.created_at)} />
            <MetaRow label="Updated" value={formatDate(project.updated_at)} />
            <MetaRow label="Currency" value={project.currency || 'INR'} />
          </dl>
        </SoftCard>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a9a96]">
        {label}
      </span>
      {children}
    </label>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#eef3f1] bg-[#fbfcfb] px-3 py-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a9a96]">{label}</dt>
      <dd className="mt-1 break-all text-[#0d2a28]">{value}</dd>
    </div>
  )
}
