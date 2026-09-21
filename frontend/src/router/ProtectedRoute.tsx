import { Spinner } from '@/components/ui/spinner'
import { useAuthStore } from '@/stores/authStore'
import type { Role } from '@/types'
import { getDashboardPath } from '@/utils/roles'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

export function ProtectedRoute({ allowedRoles }: { allowedRoles?: Role[] }) {
  const { isAuthenticated, isLoading, roles } = useAuthStore()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && !allowedRoles.some((r) => roles().includes(r)) && !roles().includes('ADMIN')) {
    return <Navigate to={getDashboardPath(roles())} replace />
  }

  return <Outlet />
}
