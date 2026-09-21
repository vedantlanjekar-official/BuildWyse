import {
  DetailDialog,
  InteractiveCard,
  SectionHeader,
  StatePanel,
} from '@/components/client/SectionKit'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { freelancerService, orgService } from '@/services/projectService'
import type { FreelancerProfile } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { Award, Briefcase, Building2, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

type Resource = 'portfolio' | 'skills' | 'certifications' | 'teams'

export function FreelancerResourcePage({ resource }: { resource: Resource }) {
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null)

  const query = useQuery({
    queryKey: ['freelancer', resource],
    queryFn: async () => {
      if (resource === 'teams') return orgService.list()
      return (await freelancerService.me()) as FreelancerProfile
    },
  })

  const titles: Record<Resource, string> = {
    portfolio: 'Portfolio',
    skills: 'Skills',
    certifications: 'Certifications',
    teams: 'Teams',
  }

  const profile = resource === 'teams' ? null : (query.data as FreelancerProfile | undefined)
  const skills = ((profile?.metadata?.skills as string[]) || []) as string[]
  const teams = resource === 'teams' ? ((query.data as Array<Record<string, unknown>>) ?? []) : []
  const hasSaved =
    resource === 'portfolio'
      ? !!profile
      : resource === 'skills'
        ? skills.length > 0
        : resource === 'certifications'
          ? !!profile?.platform_certified
          : teams.length > 0

  return (
    <div>
      <SectionHeader
        title={titles[resource]}
        description={`Your ${titles[resource].toLowerCase()} profile loads from saved freelancer data — no regenerate on visit.`}
        saved={hasSaved}
        actions={
          resource === 'portfolio' ? (
            <Link to="/profile"><Button variant="outline" size="sm">Edit profile</Button></Link>
          ) : undefined
        }
      />

      <StatePanel
        isLoading={query.isLoading}
        isError={query.isError}
        error={query.error as Error | null}
        isEmpty={!hasSaved}
        emptyTitle={`No ${titles[resource].toLowerCase()} yet`}
        emptyDescription="Update your freelancer profile to populate this section."
      >
        {resource === 'portfolio' && profile && (
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <InteractiveCard onClick={() => setSelected(profile as unknown as Record<string, unknown>)}>
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-[var(--color-accent)] p-2 text-[var(--color-primary)]"><Briefcase className="h-5 w-5" /></div>
                <div>
                  <p className="font-semibold">{profile.headline || 'Freelancer'}</p>
                  <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{profile.experience_years} years experience</p>
                  <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                    {String((profile.metadata as Record<string, unknown> | undefined)?.bio ?? (profile.metadata as Record<string, unknown> | undefined)?.summary ?? 'Open for full portfolio details.')}
                  </p>
                </div>
              </div>
            </InteractiveCard>
            <div className="rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold">Availability</p>
              <Badge className="mt-3" variant="outline">{profile.availability_status}</Badge>
              <p className="mt-4 text-sm font-semibold">Certification</p>
              <Badge className="mt-3" variant={profile.platform_certified ? 'success' : 'secondary'}>
                {profile.platform_certified ? 'Platform certified' : 'Not certified'}
              </Badge>
            </div>
          </div>
        )}

        {resource === 'skills' && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {skills.map((skill) => (
              <InteractiveCard key={skill} onClick={() => setSelected({ skill })}>
                <div className="flex items-center gap-3">
                  <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
                  <p className="font-medium">{skill}</p>
                </div>
              </InteractiveCard>
            ))}
          </div>
        )}

        {resource === 'certifications' && profile?.platform_certified && (
          <InteractiveCard onClick={() => setSelected({ name: 'BuildWyse Platform Certified', status: 'active' })}>
            <div className="flex items-start gap-3">
              <Award className="h-6 w-6 text-[var(--color-primary)]" />
              <div>
                <p className="font-semibold">BuildWyse Platform Certified</p>
                <Badge className="mt-2" variant="success">active</Badge>
                <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">Verified for BuildWyse delivery workflows.</p>
              </div>
            </div>
          </InteractiveCard>
        )}

        {resource === 'teams' && (
          <div className="grid gap-3 md:grid-cols-2">
            {teams.map((team) => (
              <InteractiveCard key={String(team.id)} onClick={() => setSelected(team)}>
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-[var(--color-primary)]" />
                  <div>
                    <p className="font-semibold">{String(team.name ?? 'Organization')}</p>
                    <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{String(team.description ?? team.industry ?? '')}</p>
                  </div>
                </div>
              </InteractiveCard>
            ))}
          </div>
        )}
      </StatePanel>

      <DetailDialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)} title={titles[resource]}>
        {selected && (
          <div className="space-y-2 text-sm">
            {Object.entries(selected)
              .filter(([k]) => !['metadata', 'id'].includes(k))
              .slice(0, 12)
              .map(([k, v]) => (
                <p key={k}><span className="font-medium capitalize">{k.replaceAll('_', ' ')}:</span> {typeof v === 'object' ? '—' : String(v)}</p>
              ))}
          </div>
        )}
      </DetailDialog>
    </div>
  )
}
