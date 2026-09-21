import type { Role } from '@/types'

export function getDashboardPath(roles: Role[]): string {
  if (roles.includes('ADMIN')) return '/admin'
  if (roles.some((r) => r.startsWith('ENTERPRISE_'))) return '/dashboard/enterprise'
  if (roles.includes('FREELANCER')) return '/dashboard/freelancer'
  return '/dashboard/client'
}

export function roleLabel(role: Role): string {
  return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}
