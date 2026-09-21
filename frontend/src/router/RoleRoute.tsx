import { useAuthStore } from '@/stores/authStore'
import type { Role } from '@/types'
import { getDashboardPath } from '@/utils/roles'
import { Navigate, Outlet } from 'react-router-dom'

export function RoleRoute({ allowedRoles }: { allowedRoles: Role[] }) {
  const roles = useAuthStore((s) => s.roles())

  if (roles.includes('ADMIN')) return <Outlet />
  if (allowedRoles.some((r) => roles.includes(r))) return <Outlet />

  return <Navigate to={getDashboardPath(roles)} replace />
}
