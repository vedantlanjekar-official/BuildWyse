import type { Role } from '@/types'
import {
  Award,
  BarChart3,
  Bell,
  Briefcase,
  Building,
  Calendar,
  ClipboardList,
  CreditCard,
  FileText,
  FolderKanban,
  HeartPulse,
  History,
  LayoutDashboard,
  Shield,
  Sparkles,
  User,
  Users,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

export function getNavItems(roles: Role[]): NavItem[] {
  if (roles.includes('ADMIN')) return adminNav
  if (roles.some((r) => r.startsWith('ENTERPRISE_'))) return enterpriseNav
  if (roles.includes('FREELANCER')) return freelancerNav
  return clientNav
}

const clientNav: NavItem[] = [
  { to: '/dashboard/client', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/notifications', label: 'Notifications', icon: Bell },
]

const freelancerNav: NavItem[] = [
  { to: '/dashboard/freelancer', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/opportunities', label: 'Opportunities', icon: Sparkles },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/portfolio', label: 'Portfolio', icon: Briefcase },
  { to: '/skills', label: 'Skills', icon: Wrench },
  { to: '/certifications', label: 'Certifications', icon: Award },
  { to: '/teams', label: 'Teams', icon: Users },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/notifications', label: 'Notifications', icon: Bell },
]

const enterpriseNav: NavItem[] = [
  { to: '/dashboard/enterprise', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/company', label: 'Company', icon: Building },
  { to: '/employees', label: 'Employees', icon: Users },
  { to: '/teams', label: 'Teams', icon: Users },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/tasks', label: 'Tasks', icon: ClipboardList },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/submissions', label: 'Submissions', icon: FileText },
  { to: '/health', label: 'Health', icon: HeartPulse },
  { to: '/payments', label: 'Payments', icon: CreditCard },
  { to: '/history', label: 'History', icon: History },
  { to: '/profile', label: 'Profile', icon: User },
]

const adminNav: NavItem[] = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/clients', label: 'Clients', icon: User },
  { to: '/admin/freelancers', label: 'Freelancers', icon: Briefcase },
  { to: '/admin/organizations', label: 'Organizations', icon: Building },
  { to: '/admin/projects', label: 'Projects', icon: FolderKanban },
  { to: '/admin/verification', label: 'Verification', icon: Shield },
  { to: '/admin/matching', label: 'Matching', icon: Sparkles },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
  { to: '/admin/changes', label: 'Changes', icon: ClipboardList },
  { to: '/admin/services', label: 'Services', icon: Wrench },
  { to: '/admin/ai', label: 'AI', icon: Sparkles },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { to: '/admin/audit', label: 'Audit', icon: History },
  { to: '/admin/certificates', label: 'Certificates', icon: Award },
]
