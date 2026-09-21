import {
  DocumentSheet,
  RegenerateButton,
  SectionHeader,
  StatePanel,
  formatDate,
} from '@/components/client/SectionKit'
import { Badge } from '@/components/ui/badge'
import { PROJECT_LIVE_MS } from '@/lib/liveQuery'
import { Button } from '@/components/ui/button'
import { projectService } from '@/services/projectService'
import type { Project } from '@/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Award, Download } from 'lucide-react'
import { useParams, useOutletContext } from 'react-router-dom'

type Cert = Record<string, unknown>

export function ProjectCertificatesPage() {
  const { id } = useParams<{ id: string }>()
  const { project } = useOutletContext<{ project: Project }>()
  const queryClient = useQueryClient()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['certificates', id],
    queryFn: () => projectService.listCertificates(id!),
    enabled: !!id,
    refetchInterval: PROJECT_LIVE_MS,
  })

  const issueMutation = useMutation({
    mutationFn: () => projectService.issueCertificate(id!, { certificate_type: 'project_completion' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['certificates', id] }),
  })

  const certs = (data ?? []) as Cert[]
  const primary = certs[0]
  const hasSaved = certs.length > 0

  return (
    <div>
      <SectionHeader
        live
        title="Certificates"
        description="Completion certificates are issued once and reloaded from storage on every visit."
        saved={hasSaved}
        actions={
          !hasSaved ? (
            <Button onClick={() => issueMutation.mutate()} disabled={issueMutation.isPending}>
              {issueMutation.isPending ? 'Issuing…' : 'Issue certificate'}
            </Button>
          ) : (
            <RegenerateButton
              label="Issue additional"
              onClick={() => issueMutation.mutate()}
              pending={issueMutation.isPending}
            />
          )
        }
      />

      <StatePanel
        isLoading={isLoading}
        isError={isError || issueMutation.isError}
        error={(error || issueMutation.error) as Error | null}
        isEmpty={!hasSaved}
        emptyTitle="No certificate issued yet"
        emptyDescription="Issue a BuildWyse completion certificate when the project is ready."
        emptyAction={
          <Button onClick={() => issueMutation.mutate()} disabled={issueMutation.isPending}>
            Issue certificate
          </Button>
        }
      >
        {primary && (
          <DocumentSheet title="Project Completion Certificate" subtitle="Official BuildWyse record">
            <div className="rounded-xl border-2 border-[var(--color-primary)]/30 bg-white px-6 py-10 text-center shadow-inner">
              <Award className="mx-auto h-12 w-12 text-[var(--color-primary)]" />
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--color-primary)]">
                BuildWyse.in
              </p>
              <h3 className="mt-3 font-display text-3xl font-semibold">Certificate of Completion</h3>
              <p className="mx-auto mt-4 max-w-xl text-[var(--color-muted-foreground)]">
                This certifies successful delivery of <strong>{project.title}</strong> through the BuildWyse project
                execution platform.
              </p>
              <div className="mx-auto mt-8 grid max-w-lg gap-3 text-left text-sm">
                <div className="flex justify-between border-b border-dashed border-[var(--color-border)] pb-2">
                  <span className="text-[var(--color-muted-foreground)]">Certificate ID</span>
                  <span className="font-medium">{String(primary.certificate_number)}</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-[var(--color-border)] pb-2">
                  <span className="text-[var(--color-muted-foreground)]">Status</span>
                  <Badge variant="success">{String(primary.status)}</Badge>
                </div>
                <div className="flex justify-between border-b border-dashed border-[var(--color-border)] pb-2">
                  <span className="text-[var(--color-muted-foreground)]">Issued</span>
                  <span className="font-medium">{formatDate(String(primary.issued_at ?? primary.created_at ?? ''))}</span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-[var(--color-muted-foreground)]">Recipient</span>
                  <span className="font-medium">{String(primary.issued_to)}</span>
                </div>
              </div>
              <Button
                className="mt-8"
                variant="outline"
                onClick={() =>
                  void projectService.downloadCertificatePdf(
                    String(primary.id),
                    `${String(primary.certificate_number)}.pdf`,
                  )
                }
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </div>

            {certs.length > 1 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">All certificates</p>
                {certs.map((c) => (
                  <div key={String(c.id)} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-white px-4 py-3 text-sm">
                    <span>{String(c.certificate_number)}</span>
                    <Badge variant="outline">{String(c.status)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </DocumentSheet>
        )}
      </StatePanel>
    </div>
  )
}
