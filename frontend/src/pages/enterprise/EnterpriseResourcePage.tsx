import { QueryState } from '@/components/QueryState'
import { PageHeader } from '@/components/PageHeader'
import { JsonTable } from '@/components/JsonTable'
import { adminService, orgService, projectService } from '@/services/projectService'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'

type Resource =
  | 'company'
  | 'employees'
  | 'teams'
  | 'projects'
  | 'tasks'
  | 'calendar'
  | 'submissions'
  | 'verification'
  | 'health'
  | 'payments'
  | 'history'

const titles: Record<Resource, string> = {
  company: 'Company',
  employees: 'Employees',
  teams: 'Teams',
  projects: 'Projects',
  tasks: 'Tasks',
  calendar: 'Calendar',
  submissions: 'Submissions',
  verification: 'Verification',
  health: 'Health',
  payments: 'Payments',
  history: 'History',
}

export function EnterpriseResourcePage({ resource }: { resource: Resource }) {
  const query = useQuery({
    queryKey: ['enterprise', resource],
    queryFn: async () => {
      switch (resource) {
        case 'company':
        case 'teams':
          return orgService.list()
        case 'employees':
          return adminService.users()
        case 'projects':
          return projectService.list()
        case 'tasks':
        case 'submissions':
        case 'calendar':
        case 'verification':
        case 'health':
        case 'payments':
        case 'history': {
          const projects = await projectService.list()
          if (!projects.length) return []
          const first = projects[0]
          if (resource === 'health') return projectService.health(first.id)
          if (resource === 'calendar') return projectService.calendar(first.id)
          if (resource === 'payments') return adminService.payments()
          return projectService.phases(first.id)
        }
        default:
          return []
      }
    },
  })

  const rows = normalize(query.data)

  return (
    <div>
      <PageHeader title={titles[resource]} description={`Enterprise ${titles[resource].toLowerCase()} management`} />
      <QueryState isLoading={query.isLoading} isError={query.isError} error={query.error} data={query.data} emptyTitle={`No ${titles[resource].toLowerCase()} data`}>
        {() =>
          rows.length > 0 ? (
            <JsonTable rows={rows} />
          ) : (
            <Card><CardContent className="p-4"><pre className="text-xs">{JSON.stringify(query.data, null, 2)}</pre></CardContent></Card>
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
