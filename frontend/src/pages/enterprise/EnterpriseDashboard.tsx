import { QueryState } from '@/components/QueryState'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { orgService, projectService } from '@/services/projectService'
import { useQuery } from '@tanstack/react-query'

export function EnterpriseDashboard() {
  const orgs = useQuery({ queryKey: ['organizations'], queryFn: orgService.list })
  const projects = useQuery({ queryKey: ['projects'], queryFn: projectService.list })

  return (
    <div>
      <PageHeader title="Enterprise Dashboard" description="Organization-wide project overview" />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--color-muted-foreground)]">Organizations</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{Array.isArray(orgs.data) ? orgs.data.length : '—'}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--color-muted-foreground)]">Projects</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold">{Array.isArray(projects.data) ? projects.data.length : '—'}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--color-muted-foreground)]">Active</CardTitle></CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {Array.isArray(projects.data) ? projects.data.filter((p: { state: string }) => p.state === 'EXECUTION').length : '—'}
            </p>
          </CardContent>
        </Card>
      </div>
      <QueryState isLoading={projects.isLoading} isError={projects.isError} error={projects.error} data={projects.data} emptyTitle="No projects">
        {(items) => (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {items.slice(0, 6).map((p: { id: string; title: string; state: string }) => (
              <Card key={p.id}><CardContent className="p-4"><p className="font-medium">{p.title}</p><p className="text-sm text-[var(--color-muted-foreground)]">{p.state}</p></CardContent></Card>
            ))}
          </div>
        )}
      </QueryState>
    </div>
  )
}
