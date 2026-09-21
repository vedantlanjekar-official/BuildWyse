import { Button } from '@/components/ui/button'
import { useLogout } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/utils/cn'
import { getNavItems } from '@/router/navConfig'
import { Building2, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

export function AppShell() {
  const profile = useAuthStore((s) => s.profile)
  const roles = useAuthStore((s) => s.roles())
  const logout = useLogout()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navItems = getNavItems(roles)

  return (
    <div className="flex min-h-screen bg-[var(--color-background)]">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[var(--color-sidebar)] text-[var(--color-sidebar-foreground)] transition-transform',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-[var(--color-sidebar-muted)] px-5">
          <Building2 className="h-6 w-6 text-[var(--color-sidebar-accent)]" />
          <span className="font-display text-lg font-bold">BuildWyse</span>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--color-sidebar-accent)] text-white'
                    : 'text-[var(--color-sidebar-foreground)]/80 hover:bg-[var(--color-sidebar-muted)] hover:text-white',
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="shrink-0 border-t border-[var(--color-sidebar-muted)] p-4">
          <p className="truncate text-sm font-medium">{profile?.full_name ?? profile?.email}</p>
          <p className="truncate text-xs text-[var(--color-sidebar-foreground)]/60">{profile?.email}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 w-full justify-start text-[var(--color-sidebar-foreground)] hover:bg-[var(--color-sidebar-muted)] hover:text-white"
            onClick={() => void logout()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <div className="flex items-center px-4 pt-4 lg:hidden">
          <button
            type="button"
            className="rounded-md p-2 hover:bg-[var(--color-muted)]"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
