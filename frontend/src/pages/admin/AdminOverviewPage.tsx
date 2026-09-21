import { QueryState } from '@/components/QueryState'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { adminService } from '@/services/projectService'
import type { AdminOverview } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export function AdminOverviewPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: () => adminService.overview() as Promise<AdminOverview>,
  })

  return (
    <div>
      <PageHeader title="Admin Overview" description="Platform metrics and system status" />
      <QueryState isLoading={isLoading} isError={isError} error={error} data={data}>
        {(overview) => {
          const chartData = Object.entries(overview.counts).map(([name, value]) => ({
            name: name.replace(/_/g, ' '),
            count: value,
          }))
          return (
            <>
              <div className="mb-6 flex items-center gap-2">
                <span className="text-sm text-[var(--color-muted-foreground)]">Storage mode:</span>
                <Badge variant={overview.memory_mode ? 'warning' : 'success'}>
                  {overview.memory_mode ? 'Memory (dev)' : 'Supabase'}
                </Badge>
              </div>
              <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {Object.entries(overview.counts).map(([key, value]) => (
                  <Card key={key}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-medium capitalize text-[var(--color-muted-foreground)]">
                        {key.replace(/_/g, ' ')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent><p className="text-2xl font-bold">{value}</p></CardContent>
                  </Card>
                ))}
              </div>
              <Card>
                <CardHeader><CardTitle>Platform counts</CardTitle></CardHeader>
                <CardContent className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )
        }}
      </QueryState>
    </div>
  )
}
