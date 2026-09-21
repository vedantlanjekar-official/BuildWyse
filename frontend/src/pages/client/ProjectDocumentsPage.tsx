import {
  SectionHeader,
  StatePanel,
} from '@/components/client/SectionKit'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { PROJECT_LIVE_MS } from '@/lib/liveQuery'
import { apiDownloadBlob } from '@/services/api'
import { projectService } from '@/services/projectService'
import type { Project } from '@/types'
import { cn } from '@/utils/cn'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, FileText, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'

type ProjectDocument = {
  id: string
  project_id: string
  document_type: string
  title: string
  status: string
  current_version: number
  pdf_available: boolean
  pdf_url?: string | null
  version_created_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

const DOC_TYPE_LABELS: Record<string, string> = {
  concept_logic: 'Concept Logic',
  prd: 'PRD',
  technology_stack: 'Technology Stack',
  frontend_design: 'Frontend Design',
  hardware_spec: 'Hardware Spec',
  architecture: 'Architecture',
  development_phases: 'Development Phases',
  budget: 'Budget Recommendation',
}

const DOC_ORDER = Object.keys(DOC_TYPE_LABELS)

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function displayTitle(doc: ProjectDocument) {
  return DOC_TYPE_LABELS[doc.document_type] ?? doc.title ?? doc.document_type
}

export function ProjectDocumentsPage() {
  const { id } = useParams<{ id: string }>()
  const { project } = useOutletContext<{ project: Project }>()
  const queryClient = useQueryClient()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['project', id, 'documents'],
    queryFn: () => projectService.documents(id!) as Promise<ProjectDocument[]>,
    enabled: !!id,
    refetchInterval: PROJECT_LIVE_MS,
  })

  const documents = useMemo(
    () =>
      [...(data ?? [])].sort(
        (a, b) => DOC_ORDER.indexOf(a.document_type) - DOC_ORDER.indexOf(b.document_type),
      ),
    [data],
  )

  const selectedDoc = documents.find((d) => d.id === selectedId) ?? null

  const [generatingLabel, setGeneratingLabel] = useState<string | null>(null)

  const generateAllMutation = useMutation({
    mutationFn: async () => {
      const types = Object.keys(DOC_TYPE_LABELS)
      for (const document_type of types) {
        setGeneratingLabel(DOC_TYPE_LABELS[document_type] ?? document_type)
        await projectService.generateDocument({ project_id: id!, document_type })
        await queryClient.invalidateQueries({ queryKey: ['project', id, 'documents'] })
      }
    },
    onSuccess: async () => {
      setGeneratingLabel(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project', id, 'documents'] }),
        queryClient.invalidateQueries({ queryKey: ['budgets', id] }),
      ])
    },
    onError: () => setGeneratingLabel(null),
    onSettled: () => setGeneratingLabel(null),
  })

  const regenerateMutation = useMutation({
    mutationFn: (documentId: string) => projectService.regenerateDocument(documentId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['project', id, 'documents'] }),
        queryClient.invalidateQueries({ queryKey: ['project', id, 'document'] }),
        queryClient.invalidateQueries({ queryKey: ['budgets', id] }),
      ])
    },
  })

  useEffect(() => {
    if (!documents.length) {
      setSelectedId(null)
      return
    }
    if (!selectedId || !documents.some((d) => d.id === selectedId)) {
      const firstWithPdf = documents.find((d) => d.pdf_available) ?? documents[0]
      setSelectedId(firstWithPdf.id)
    }
  }, [documents, selectedId])

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null

    async function loadPreview() {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      setPreviewError(null)

      if (!selectedDoc?.pdf_available) {
        setPreviewLoading(false)
        return
      }

      setPreviewLoading(true)
      try {
        const blob = await apiDownloadBlob(`/api/v1/documents/${selectedDoc.id}/pdf`, {
          version: selectedDoc.current_version,
        })
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setPreviewUrl(objectUrl)
      } catch (err) {
        if (cancelled) return
        setPreviewError(err instanceof Error ? err.message : 'Failed to load PDF preview')
      } finally {
        if (!cancelled) setPreviewLoading(false)
      }
    }

    void loadPreview()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [selectedDoc?.id, selectedDoc?.pdf_available, selectedDoc?.current_version])

  async function downloadPdf(documentId: string, version: number, documentType: string) {
    const blob = await apiDownloadBlob(`/api/v1/documents/${documentId}/pdf`, { version })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const label = DOC_TYPE_LABELS[documentType] ?? documentType
    link.download = `${label.replaceAll(' ', '_')}_v${version}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Documents"
        description={`Definition package for ${project.title}.`}
        actions={
          <Button
            className="rounded-xl bg-[#0d2a28] hover:bg-[#16403c]"
            onClick={() => generateAllMutation.mutate()}
            disabled={generateAllMutation.isPending}
          >
            <FileText className="mr-1 h-4 w-4" />
            {generateAllMutation.isPending
              ? generatingLabel
                ? `Generating ${generatingLabel}…`
                : 'Generating…'
              : 'Generate Documents'}
          </Button>
        }
      />

      {(generateAllMutation.isError || regenerateMutation.isError) && (
        <Alert variant="destructive">
          {((generateAllMutation.error ?? regenerateMutation.error) as Error).message}
        </Alert>
      )}

      <StatePanel
        isLoading={isLoading || generateAllMutation.isPending}
        isError={isError}
        error={error as Error | null}
        isEmpty={documents.length === 0}
        emptyTitle="No documents yet"
        emptyDescription="Generate Concept Logic, PRD, Technology Stack, and the rest of the package."
        emptyAction={
          <Button
            className="rounded-xl bg-[#0d2a28] hover:bg-[#16403c]"
            onClick={() => generateAllMutation.mutate()}
            disabled={generateAllMutation.isPending}
          >
            {generateAllMutation.isPending
              ? generatingLabel
                ? `Generating ${generatingLabel}…`
                : 'Generating…'
              : 'Generate Documents'}
          </Button>
        }
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] xl:items-start">
          <div className="grid gap-3 sm:grid-cols-2">
            {documents.map((doc) => {
              const active = doc.id === selectedId
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setSelectedId(doc.id)}
                  className={cn(
                    'group flex h-full flex-col rounded-2xl border bg-white p-4 text-left transition',
                    active
                      ? 'border-[#0d2a28] shadow-[0_14px_36px_rgba(13,42,40,0.12)]'
                      : 'border-[#e2ebe8] shadow-[0_8px_24px_rgba(13,42,40,0.04)] hover:border-[#0d2a28]/30 hover:shadow-[0_12px_30px_rgba(13,42,40,0.08)]',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                        active ? 'bg-[#0d2a28] text-[#8fd4c5]' : 'bg-[#eef8f6] text-[#1a5c55]',
                      )}
                    >
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-display text-base font-semibold tracking-tight text-[#0d2a28]">
                        {displayTitle(doc)}
                      </h3>
                      <p className="mt-0.5 text-xs capitalize text-[#8a9a96]">
                        {doc.document_type.replaceAll('_', ' ')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[#eef3f1] pt-3 text-[11px] text-[#6b7c78]">
                    <span className="font-semibold text-[#0d2a28]">v{doc.current_version}</span>
                    <span aria-hidden>·</span>
                    <span>{formatDate(doc.version_created_at ?? doc.updated_at ?? doc.created_at)}</span>
                    <span aria-hidden>·</span>
                    <span className="capitalize">{doc.status.replaceAll('_', ' ')}</span>
                    {doc.pdf_available ? (
                      <span className="ml-auto rounded-md bg-[#e8f6f1] px-1.5 py-0.5 font-semibold text-[#0f6b5c]">
                        PDF
                      </span>
                    ) : (
                      <span className="ml-auto rounded-md bg-[#fff4e8] px-1.5 py-0.5 font-semibold text-[#9a5b12]">
                        Pending
                      </span>
                    )}
                  </div>

                  <div
                    className="mt-3 flex gap-2"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 flex-1 rounded-lg text-xs"
                      disabled={!doc.pdf_available}
                      onClick={() => void downloadPdf(doc.id, doc.current_version, doc.document_type)}
                    >
                      <Download className="mr-1 h-3.5 w-3.5" />
                      Download
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 rounded-lg px-2.5"
                      disabled={regenerateMutation.isPending}
                      aria-label={`Regenerate ${displayTitle(doc)}`}
                      onClick={() => regenerateMutation.mutate(doc.id)}
                    >
                      <RefreshCw className={cn('h-3.5 w-3.5', regenerateMutation.isPending && 'animate-spin')} />
                    </Button>
                  </div>
                </button>
              )
            })}
          </div>

          <aside className="sticky top-4 overflow-hidden rounded-2xl border border-[#e2ebe8] bg-white shadow-[0_16px_40px_rgba(13,42,40,0.08)]">
            <div className="relative bg-[#f4f7f6]" style={{ height: 'min(72vh, 720px)' }}>
              {!selectedDoc ? (
                <EmptyPreview message="Select a document to preview." />
              ) : !selectedDoc.pdf_available ? (
                <EmptyPreview message="No PDF yet. Generate or regenerate this document." />
              ) : previewLoading ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-[#6b7c78]">
                  <Spinner className="h-8 w-8 text-[#1a5c55]" />
                  <p className="text-sm">Loading preview…</p>
                </div>
              ) : previewError ? (
                <EmptyPreview message={previewError} />
              ) : previewUrl ? (
                <iframe
                  title={`${displayTitle(selectedDoc)} preview`}
                  src={`${previewUrl}#toolbar=1&navpanes=0`}
                  className="h-full w-full border-0 bg-white"
                />
              ) : (
                <EmptyPreview message="PDF preview unavailable." />
              )}
            </div>
          </aside>
        </div>
      </StatePanel>
    </div>
  )
}

function EmptyPreview({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center text-[#6b7c78]">
      <div className="rounded-2xl border border-[#e2ebe8] bg-white p-4 shadow-sm">
        <FileText className="h-8 w-8 text-[#1a5c55]" />
      </div>
      <p className="max-w-xs text-sm leading-relaxed">{message}</p>
    </div>
  )
}
