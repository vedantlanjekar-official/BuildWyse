import { QueryState } from '@/components/QueryState'
import { PageHeader } from '@/components/PageHeader'
import { JsonTable } from '@/components/JsonTable'
import { adminService, freelancerService, orgService, projectService } from '@/services/projectService'
import { api } from '@/services/api'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'

type AdminResource =
  | 'users'
  | 'clients'
  | 'freelancers'
  | 'organizations'
  | 'projects'
  | 'verification'
  | 'matching'
  | 'payments'
  | 'changes'
  | 'services'
  | 'ai'
  | 'reports'
  | 'audit'
  | 'certificates'

const titles: Record<AdminResource, string> = {
  users: 'Users',
  clients: 'Clients',
  freelancers: 'Freelancers',
  organizations: 'Organizations',
  projects: 'Projects',
  verification: 'Verification',
  matching: 'Matching',
  payments: 'Payments',
  changes: 'Change Requests',
  services: 'After-sales Services',
  ai: 'AI Operations',
  reports: 'Reports',
  audit: 'Audit Logs',
  certificates: 'Certificates',
}

export function AdminResourcePage({ resource }: { resource: AdminResource }) {
  const query = useQuery({
    queryKey: ['admin', resource],
    queryFn: async () => {
      switch (resource) {
        case 'users':
          return adminService.users()
        case 'clients':
          return api.get('/api/v1/clients')
        case 'freelancers':
          return freelancerService.list()
        case 'organizations':
          return orgService.list()
        case 'projects':
          return adminService.projects()
        case 'payments':
          return adminService.payments()
        case 'audit':
          return adminService.auditLogs()
        case 'matching': {
          const projects = await projectService.list()
          if (!projects[0]) return []
          return projectService.runMatching(projects[0].id)
        }
        case 'changes': {
          const projects = await projectService.list()
          if (!projects[0]) return []
          return projectService.changes(projects[0].id)
        }
        case 'services': {
          const projects = await projectService.list()
          if (!projects[0]) return []
          return projectService.services(projects[0].id)
        }
        case 'verification':
          return adminService.users()
        case 'ai':
          return api.post('/api/v1/ai/research', undefined, { message: 'platform overview' }).catch(() => ({ note: 'AI stub mode available' }))
        case 'reports':
          return adminService.overview()
        case 'certificates':
          return adminService.projects()
        default:
          return []
      }
    },
  })

  const rows = normalize(query.data)

  return (
    <div>
      <PageHeader title={titles[resource]} description={`Admin ${titles[resource].toLowerCase()} view`} />
      <QueryState isLoading={query.isLoading} isError={query.isError} error={query.error} data={query.data} emptyTitle={`No ${titles[resource].toLowerCase()} data`}>
        {() =>
          rows.length > 0 ? (
            <JsonTable rows={rows} />
          ) : (
            <Card><CardContent className="p-4"><pre className="overflow-auto text-xs">{JSON.stringify(query.data, null, 2)}</pre></CardContent></Card>
          )
        }
      </QueryState>
    </div>
  )
}

function normalize(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[]
  if (data && typeof data === 'object') return [data as Record<string, unknown>]
  return []
}
