import {
  DetailDialog,
  InteractiveCard,
  RegenerateButton,
  SectionHeader,
  StatePanel,
  formatCurrency,
} from '@/components/client/SectionKit'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { PROJECT_LIVE_MS } from '@/lib/liveQuery'
import { freelancerService, projectService } from '@/services/projectService'
import type { Project } from '@/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Award,
  Briefcase,
  ExternalLink,
  Globe,
  Link2,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { useState } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'

type Candidate = Record<string, unknown>
type FreelancerDetail = Record<string, unknown>

function mapRunCandidates(result: {
  matching_run_id: string
  algorithm_version: string
  completed_at: string
  candidates?: Array<Record<string, unknown> & { scores?: Record<string, number>; explanation?: string }>
}) {
  return {
    matching_run: {
      id: result.matching_run_id,
      algorithm_version: result.algorithm_version,
      completed_at: result.completed_at,
      candidate_count: result.candidates?.length ?? 0,
      status: 'completed',
    },
    candidates: (result.candidates ?? []).map((c) => ({
      ...c,
      overall_score: c.scores?.overall_score ?? c.overall_score,
      skills: c.skills ?? [],
    })),
  }
}

function scoreValue(scores: Record<string, number> | undefined, ...keys: string[]) {
  for (const key of keys) {
    if (scores?.[key] != null) return Math.round(Number(scores[key]))
  }
  return null
}

export function ProjectMatchingPage() {
  const { id } = useParams<{ id: string }>()
  const { project } = useOutletContext<{ project: Project }>()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<Candidate | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['matching-results', id],
    queryFn: () => projectService.getMatchingResults(id!),
    enabled: !!id,
    refetchInterval: PROJECT_LIVE_MS,
  })

  const runMutation = useMutation({
    mutationFn: () => projectService.runMatching(id!),
    onSuccess: (result) => {
      queryClient.setQueryData(['matching-results', id], mapRunCandidates(result as never))
      void queryClient.invalidateQueries({ queryKey: ['matching-results', id] })
    },
  })

  const selectMutation = useMutation({
    mutationFn: (freelancerId: string) =>
      projectService.selectCandidate(id!, freelancerId, 'Selected from matching dashboard'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['project', id] })
      void queryClient.invalidateQueries({ queryKey: ['matching-results', id] })
    },
  })

  const candidates = (data?.candidates ?? []) as Candidate[]
  const hasSaved = candidates.length > 0

  return (
    <div>
      <SectionHeader
        live
        title="AI matching"
        description="Requirement DNA is scored against Expertise DNA. Saved ranking persists until you explicitly regenerate."
        saved={hasSaved}
        actions={
          !hasSaved ? (
            <Button className="rounded-xl bg-[#0d2a28] hover:bg-[#16403c]" onClick={() => runMutation.mutate()} disabled={runMutation.isPending}>
              {runMutation.isPending ? 'Matching…' : 'Run matching'}
            </Button>
          ) : (
            <RegenerateButton onClick={() => runMutation.mutate()} pending={runMutation.isPending} label="Re-run matching" />
          )
        }
      />

      <StatePanel
        isLoading={isLoading}
        isError={isError || runMutation.isError}
        error={(error || runMutation.error) as Error | null}
        isEmpty={!hasSaved}
        emptyTitle="No matching results saved"
        emptyDescription={`Run matching for “${project.title}” to generate a Top 10 shortlist.`}
        emptyAction={
          <Button className="rounded-xl bg-[#0d2a28] hover:bg-[#16403c]" onClick={() => runMutation.mutate()} disabled={runMutation.isPending}>
            Run matching
          </Button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {candidates.map((c) => (
            <CandidateCard
              key={String(c.freelancer_id)}
              candidate={c}
              onOpen={() => setSelected(c)}
              onSelect={() => selectMutation.mutate(String(c.freelancer_id))}
              selecting={selectMutation.isPending}
            />
          ))}
        </div>
      </StatePanel>

      <CandidateDetailDialog
        candidate={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        onSelect={(freelancerId) => {
          selectMutation.mutate(freelancerId)
          setSelected(null)
        }}
        selecting={selectMutation.isPending}
      />
    </div>
  )
}

/** @deprecated Candidates tab removed — kept as alias so old links land on matching. */
export function ProjectCandidatesPage() {
  return <ProjectMatchingPage />
}

function CandidateCard({
  candidate,
  onOpen,
  onSelect,
  selecting,
  compact,
}: {
  candidate: Candidate
  onOpen: () => void
  onSelect: () => void
  selecting?: boolean
  compact?: boolean
}) {
  const scores = (candidate.scores as Record<string, number>) || {}
  const skills = ((candidate.skills as string[]) || ((candidate.metadata as Record<string, unknown>)?.skills as string[]) || []) as string[]
  const name = String(candidate.full_name || candidate.headline || 'Candidate')
  const overall = Math.round(Number(scores.overall_score ?? candidate.overall_score ?? 0))

  return (
    <InteractiveCard onClick={onOpen}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <AvatarBubble name={name} avatarUrl={candidate.avatar_url as string | undefined} rank={Number(candidate.rank)} />
          <div>
            <p className="font-semibold text-[#0d2a28]">{name}</p>
            <p className="mt-0.5 text-xs text-[#6b7c78]">
              Rank #{String(candidate.rank)}
              {candidate.experience_years != null ? ` · ${candidate.experience_years} yrs` : ''}
              {candidate.platform_certified ? ' · Certified' : ''}
            </p>
          </div>
        </div>
        <Badge className="rounded-full border-0 bg-[#e8f6f1] text-[#0f6b5c]">{overall}% match</Badge>
      </div>
      {candidate.headline && String(candidate.headline) !== name ? (
        <p className="text-sm text-[#3d524e]">{String(candidate.headline)}</p>
      ) : null}
      <p className={`mt-2 text-sm text-[#6b7c78] ${compact ? 'line-clamp-3' : 'line-clamp-2'}`}>
        {String(candidate.explanation || candidate.bio || 'Open for the full freelancer profile.')}
      </p>
      <div className="mt-3 flex flex-wrap gap-1">
        {skills.slice(0, compact ? 5 : 4).map((s) => (
          <Badge key={s} className="rounded-full border-0 bg-[#f4f7f6] text-[#3d524e]">
            {s}
          </Badge>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <Button
          size="sm"
          className="rounded-xl bg-[#0d2a28] hover:bg-[#16403c]"
          onClick={(e) => {
            e.stopPropagation()
            onSelect()
          }}
          disabled={selecting}
        >
          Select
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl"
          onClick={(e) => {
            e.stopPropagation()
            onOpen()
          }}
        >
          Full profile
        </Button>
      </div>
    </InteractiveCard>
  )
}

function CandidateDetailDialog({
  candidate,
  open,
  onOpenChange,
  onSelect,
  selecting,
}: {
  candidate: Candidate | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onSelect: (freelancerId: string) => void
  selecting?: boolean
}) {
  const freelancerId = candidate ? String(candidate.freelancer_id) : ''

  const detailQuery = useQuery({
    queryKey: ['freelancer-detail', freelancerId],
    queryFn: () => freelancerService.get(freelancerId) as Promise<FreelancerDetail>,
    enabled: open && !!freelancerId,
  })

  const detail = detailQuery.data
  const scores = ((candidate?.scores as Record<string, number>) || {}) as Record<string, number>
  const fallbackSkills = ((candidate?.skills as string[]) || []) as string[]
  const skillRows = ((detail?.skills as Array<Record<string, unknown>>) || []).filter(Boolean)
  const experience = ((detail?.experience as Array<Record<string, unknown>>) || []) as Array<Record<string, unknown>>
  const certifications = ((detail?.certifications as Array<Record<string, unknown>>) || []) as Array<Record<string, unknown>>
  const portfolioProjects = ((detail?.portfolio_projects as Array<Record<string, unknown>>) || []) as Array<
    Record<string, unknown>
  >
  const portfolio = detail?.portfolio as Record<string, unknown> | undefined

  const name = String(detail?.full_name || candidate?.full_name || candidate?.headline || 'Freelancer')
  const headline = String(detail?.headline || candidate?.headline || '')
  const bio = String(detail?.bio || candidate?.bio || candidate?.explanation || 'No biography available yet.')
  const overall = scoreValue(scores, 'overall_score') ?? Math.round(Number(candidate?.overall_score ?? 0))

  return (
    <DetailDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Freelancer profile"
      description="Full match profile with skills, experience, portfolio, and verification."
    >
      {!candidate ? null : detailQuery.isLoading && !detail ? (
        <div className="flex min-h-[240px] items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="space-y-6">
          {detailQuery.isError ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Could not load full profile from server — showing saved match card data instead.
            </p>
          ) : null}
          <div className="overflow-hidden rounded-[22px] border border-[#e2ebe8] bg-gradient-to-br from-[#0d2a28] via-[#16403c] to-[#1f6b63] p-5 text-white">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <AvatarBubble name={name} avatarUrl={(detail?.avatar_url || candidate.avatar_url) as string | undefined} large />
                <div>
                  <p className="font-display text-2xl font-semibold">{name}</p>
                  {headline ? <p className="mt-1 text-sm text-teal-50/90">{headline}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-teal-100/85">
                    {detail?.availability_status || candidate.availability_status ? (
                      <span className="rounded-full bg-white/10 px-2.5 py-1 capitalize">
                        {String(detail?.availability_status || candidate.availability_status)}
                      </span>
                    ) : null}
                    {(detail?.experience_years ?? candidate.experience_years) != null ? (
                      <span className="rounded-full bg-white/10 px-2.5 py-1">
                        {String(detail?.experience_years ?? candidate.experience_years)} yrs experience
                      </span>
                    ) : null}
                    {detail?.platform_certified || candidate.platform_certified ? (
                      <span className="rounded-full bg-emerald-400/20 px-2.5 py-1">Platform certified</span>
                    ) : null}
                    <span className="rounded-full bg-white/10 px-2.5 py-1">Rank #{String(candidate.rank)}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3 text-center backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal-100/80">Match</p>
                <p className="mt-1 font-display text-3xl font-semibold">{overall}%</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-teal-50/90">{bio}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(detail?.github_url || candidate.github_url) ? (
                <a
                  href={String(detail?.github_url || candidate.github_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15"
                >
                  <Link2 className="h-3.5 w-3.5" /> GitHub
                </a>
              ) : null}
              {(detail?.linkedin_url || candidate.linkedin_url) ? (
                <a
                  href={String(detail?.linkedin_url || candidate.linkedin_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15"
                >
                  <Link2 className="h-3.5 w-3.5" /> LinkedIn
                </a>
              ) : null}
              {(detail?.website_url || candidate.website_url) ? (
                <a
                  href={String(detail?.website_url || candidate.website_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15"
                >
                  <Globe className="h-3.5 w-3.5" /> Website
                </a>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Overall', overall],
              ['Skills', scoreValue(scores, 'skills_score', 'technology_score')],
              ['Experience', scoreValue(scores, 'experience_score')],
              ['Verification', scoreValue(scores, 'verification_score')],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border border-[#e2ebe8] bg-[#f8fbfa] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a9a96]">{label}</p>
                <p className="mt-1 font-display text-2xl font-semibold text-[#0d2a28]">{value != null ? `${value}%` : '—'}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[20px] border border-[#e2ebe8] p-4">
              <p className="text-sm font-semibold text-[#0d2a28]">Contact & status</p>
              <dl className="mt-3 space-y-2 text-sm">
                <InfoRow label="Email" value={String(detail?.email || candidate.email || '—')} />
                <InfoRow label="Country" value={String(detail?.country || '—')} />
                <InfoRow label="Verification" value={String(detail?.verification_status || '—')} />
                <InfoRow label="Interview" value={String(detail?.interview_status || candidate.interview_status || '—')} />
                <InfoRow
                  label="Rate"
                  value={
                    detail?.hourly_rate != null || candidate.hourly_rate != null
                      ? `${formatCurrency(detail?.hourly_rate ?? candidate.hourly_rate, String(detail?.currency || candidate.currency || 'INR'))}/hr`
                      : '—'
                  }
                />
              </dl>
            </div>
            <div className="rounded-[20px] border border-[#e2ebe8] bg-[#eef8f6] p-4">
              <div className="mb-2 flex items-center gap-2 text-[var(--color-primary)]">
                <Sparkles className="h-4 w-4" />
                <p className="text-sm font-semibold">Match explanation</p>
              </div>
              <p className="text-sm leading-relaxed text-[#3d524e]">
                {String(candidate.explanation || 'No explanation available for this match.')}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-[#0d2a28]">Skills</p>
            <div className="flex flex-wrap gap-2">
              {skillRows.length
                ? skillRows.map((skill) => (
                    <span
                      key={String(skill.name)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#dce6e3] bg-white px-3 py-1.5 text-xs font-medium text-[#0d2a28]"
                    >
                      {String(skill.name)}
                      {skill.proficiency_level ? (
                        <span className="text-[#8a9a96]">· {String(skill.proficiency_level)}</span>
                      ) : null}
                      {skill.verified ? <CheckCircle2 className="h-3.5 w-3.5 text-[#0f6b5c]" /> : null}
                    </span>
                  ))
                : fallbackSkills.length
                  ? fallbackSkills.map((s) => (
                      <Badge key={s} className="rounded-full border-0 bg-[#f4f7f6] text-[#3d524e]">
                        {s}
                      </Badge>
                    ))
                  : <span className="text-sm text-[#6b7c78]">No skills listed</span>}
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-[#0d2a28]">Experience</p>
            {experience.length === 0 ? (
              <p className="text-sm text-[#6b7c78]">No work history saved yet.</p>
            ) : (
              <div className="space-y-3">
                {experience.map((job) => (
                  <div key={String(job.id)} className="rounded-[18px] border border-[#e2ebe8] p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-[#f4f7f6] p-2 text-[#1a5c55]">
                        <Briefcase className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#0d2a28]">{String(job.role_title)}</p>
                        <p className="text-sm text-[#6b7c78]">{String(job.company_name)}</p>
                        <p className="mt-1 text-xs text-[#8a9a96]">
                          {String(job.start_date || '').slice(0, 10) || '—'} →{' '}
                          {job.is_current ? 'Present' : String(job.end_date || '').slice(0, 10) || '—'}
                        </p>
                        {job.description ? <p className="mt-2 text-sm text-[#3d524e]">{String(job.description)}</p> : null}
                        {Array.isArray(job.technologies) && job.technologies.length ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {(job.technologies as string[]).map((tech) => (
                              <Badge key={tech} className="rounded-full border-0 bg-[#f4f7f6] text-[#3d524e]">
                                {tech}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-[#0d2a28]">Certifications</p>
            {certifications.length === 0 && !(detail?.platform_certified || candidate.platform_certified) ? (
              <p className="text-sm text-[#6b7c78]">No certifications on file.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {(detail?.platform_certified || candidate.platform_certified) ? (
                  <div className="rounded-[18px] border border-[#dce6e3] bg-[#e8f6f1] p-4">
                    <div className="flex items-start gap-3">
                      <Award className="h-5 w-5 text-[#0f6b5c]" />
                      <div>
                        <p className="font-semibold text-[#0d2a28]">BuildWyse Platform Certified</p>
                        <p className="mt-1 text-xs text-[#0f6b5c]">Verified for BuildWyse delivery workflows</p>
                      </div>
                    </div>
                  </div>
                ) : null}
                {certifications.map((cert) => (
                  <div key={String(cert.id)} className="rounded-[18px] border border-[#e2ebe8] p-4">
                    <div className="flex items-start gap-3">
                      <Award className="h-5 w-5 text-[#1a5c55]" />
                      <div>
                        <p className="font-semibold text-[#0d2a28]">{String(cert.name)}</p>
                        <p className="text-sm text-[#6b7c78]">{String(cert.issuer || 'Issuer not listed')}</p>
                        {cert.issued_at ? <p className="mt-1 text-xs text-[#8a9a96]">Issued {String(cert.issued_at).slice(0, 10)}</p> : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[#0d2a28]">Portfolio</p>
              {portfolio?.title ? <span className="text-xs text-[#8a9a96]">{String(portfolio.title)}</span> : null}
            </div>
            {portfolio?.summary ? <p className="mb-3 text-sm text-[#6b7c78]">{String(portfolio.summary)}</p> : null}
            {portfolioProjects.length === 0 ? (
              <p className="text-sm text-[#6b7c78]">No portfolio projects saved yet.</p>
            ) : (
              <div className="grid gap-3">
                {portfolioProjects.map((project) => (
                  <div key={String(project.id)} className="rounded-[18px] border border-[#e2ebe8] bg-[#f8fbfa] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[#0d2a28]">{String(project.title)}</p>
                        {project.role ? <p className="text-xs text-[#8a9a96]">{String(project.role)}</p> : null}
                      </div>
                      {project.project_url ? (
                        <a
                          href={String(project.project_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)]"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </div>
                    {project.description ? <p className="mt-2 text-sm text-[#3d524e]">{String(project.description)}</p> : null}
                    {Array.isArray(project.technologies) && project.technologies.length ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(project.technologies as string[]).map((tech) => (
                          <Badge key={tech} className="rounded-full border-0 bg-white text-[#3d524e]">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    {Array.isArray(project.highlights) && project.highlights.length ? (
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-[#6b7c78]">
                        {(project.highlights as string[]).map((h) => (
                          <li key={h}>{h}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-[#eef3f1] pt-4">
            <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              className="rounded-xl bg-[#0d2a28] hover:bg-[#16403c]"
              disabled={selecting}
              onClick={() => onSelect(String(candidate.freelancer_id))}
            >
              {selecting ? 'Selecting…' : 'Select this freelancer'}
            </Button>
          </div>
        </div>
      )}
    </DetailDialog>
  )
}

function AvatarBubble({
  name,
  avatarUrl,
  rank,
  large,
}: {
  name: string
  avatarUrl?: string
  rank?: number
  large?: boolean
}) {
  const size = large ? 'h-16 w-16 text-xl' : 'h-11 w-11 text-sm'
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className={`${size} rounded-full object-cover`} />
  }
  return (
    <div className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0d2a28] to-[#3db8a8] font-semibold text-white`}>
      {rank === 1 && !large ? <Trophy className="h-5 w-5" /> : name.slice(0, 1).toUpperCase()}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-[#8a9a96]">{label}</dt>
      <dd className="max-w-[60%] text-right font-medium capitalize text-[#0d2a28]">{value}</dd>
    </div>
  )
}
