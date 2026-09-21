import { AppShell } from '@/layouts/AppShell'
import { ProjectLayout } from '@/layouts/ProjectLayout'
import { AdminOverviewPage } from '@/pages/admin/AdminOverviewPage'
import { AdminResourcePage } from '@/pages/admin/AdminResourcePage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ClientDashboard } from '@/pages/client/ClientDashboard'
import { ProjectBudgetPage } from '@/pages/client/ProjectBudgetPage'
import { ProjectCalendarPage } from '@/pages/client/ProjectCalendarPage'
import { ProjectCertificatesPage } from '@/pages/client/ProjectCertificatesPage'
import { ProjectChangesPage } from '@/pages/client/ProjectChangesPage'
import { ProjectConnectPage } from '@/pages/client/ProjectConnectPage'
import { ProjectDocumentsPage } from '@/pages/client/ProjectDocumentsPage'
import { ProjectDetailPage } from '@/pages/client/ProjectDetailPage'
import { ProjectHealthPage } from '@/pages/client/ProjectHealthPage'
import { ProjectMatchingPage } from '@/pages/client/ProjectMatchingPages'
import { ProjectNewPage } from '@/pages/client/ProjectNewPage'
import { ProjectPaymentsPage, ProjectServicesPage } from '@/pages/client/ProjectOpsPages'
import { ProjectRequirementsPage } from '@/pages/client/ProjectRequirementsPage'
import { ProjectsListPage } from '@/pages/client/ProjectsListPage'
import { EnterpriseDashboard } from '@/pages/enterprise/EnterpriseDashboard'
import { EnterpriseResourcePage } from '@/pages/enterprise/EnterpriseResourcePage'
import { CalendarPage } from '@/pages/shared/CalendarPage'
import { FreelancerDashboard } from '@/pages/freelancer/FreelancerDashboard'
import {
  FreelancerEvidencePage,
  FreelancerHistoryPage,
  FreelancerMilestonesPage,
  FreelancerProposalPage,
  FreelancerSubmissionsPage,
  FreelancerTasksPage,
  FreelancerVerificationPage,
} from '@/pages/freelancer/FreelancerProjectPages'
import { FreelancerResourcePage } from '@/pages/freelancer/FreelancerResourcePage'
import { OpportunitiesPage } from '@/pages/freelancer/OpportunitiesPage'
import { LandingPage } from '@/pages/LandingPage'
import { TeamPage } from '@/pages/TeamPage'
import { NotificationsPage } from '@/pages/shared/NotificationsPage'
import { ProfilePage } from '@/pages/shared/ProfilePage'
import { ProjectNotificationsPage } from '@/pages/client/ProjectNotificationsPage'
import { ProjectSettingsPage } from '@/pages/client/ProjectSettingsPage'
import { ProtectedRoute } from '@/router/ProtectedRoute'
import { RoleRoute } from '@/router/RoleRoute'
import { Navigate, createBrowserRouter } from 'react-router-dom'

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/team', element: <TeamPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          // Shared
          { path: '/profile', element: <ProfilePage /> },
          { path: '/notifications', element: <NotificationsPage /> },
          { path: '/projects', element: <ProjectsListPage /> },

          // Client routes
          {
            element: <RoleRoute allowedRoles={['CLIENT']} />,
            children: [
              { path: '/dashboard/client', element: <ClientDashboard /> },
              { path: '/projects/new', element: <ProjectNewPage /> },
              { path: '/verification', element: <Navigate to="/profile#verification" replace /> },
            ],
          },

          // Freelancer routes
          {
            element: <RoleRoute allowedRoles={['FREELANCER']} />,
            children: [
              { path: '/dashboard/freelancer', element: <FreelancerDashboard /> },
              { path: '/opportunities', element: <OpportunitiesPage /> },
              { path: '/portfolio', element: <FreelancerResourcePage resource="portfolio" /> },
              { path: '/skills', element: <FreelancerResourcePage resource="skills" /> },
              { path: '/certifications', element: <FreelancerResourcePage resource="certifications" /> },
            ],
          },

          // Enterprise routes
          {
            element: <RoleRoute allowedRoles={['ENTERPRISE_EMPLOYEE', 'ENTERPRISE_MANAGER', 'TEAM_LEADER', 'TEAM_MEMBER']} />,
            children: [
              { path: '/dashboard/enterprise', element: <EnterpriseDashboard /> },
              { path: '/company', element: <EnterpriseResourcePage resource="company" /> },
              { path: '/employees', element: <EnterpriseResourcePage resource="employees" /> },
              { path: '/tasks', element: <EnterpriseResourcePage resource="tasks" /> },
              { path: '/submissions', element: <EnterpriseResourcePage resource="submissions" /> },
              { path: '/health', element: <EnterpriseResourcePage resource="health" /> },
              { path: '/history', element: <EnterpriseResourcePage resource="history" /> },
              { path: '/payments', element: <EnterpriseResourcePage resource="payments" /> },
              { path: '/verification', element: <Navigate to="/profile#verification" replace /> },
            ],
          },

          // Shared routes (freelancer + enterprise)
          { path: '/teams', element: <FreelancerResourcePage resource="teams" /> },
          { path: '/calendar', element: <CalendarPage /> },

          // Project detail (role-aware tabs in ProjectLayout)
          {
            path: '/projects/:id',
            element: <ProjectLayout />,
            children: [
              { index: true, element: <ProjectDetailPage /> },
              { path: 'requirements', element: <ProjectRequirementsPage /> },
              { path: 'documents', element: <ProjectDocumentsPage /> },
              { path: 'budget', element: <ProjectBudgetPage /> },
              { path: 'matching', element: <ProjectMatchingPage /> },
              { path: 'candidates', element: <ProjectMatchingPage /> },
              { path: 'connect', element: <ProjectConnectPage /> },
              { path: 'calendar', element: <ProjectCalendarPage /> },
              { path: 'health', element: <ProjectHealthPage /> },
              { path: 'changes', element: <ProjectChangesPage /> },
              { path: 'services', element: <ProjectServicesPage /> },
              { path: 'payments', element: <ProjectPaymentsPage /> },
              { path: 'certificates', element: <ProjectCertificatesPage /> },
              { path: 'proposal', element: <FreelancerProposalPage /> },
              { path: 'tasks', element: <FreelancerTasksPage /> },
              { path: 'milestones', element: <FreelancerMilestonesPage /> },
              { path: 'submissions', element: <FreelancerSubmissionsPage /> },
              { path: 'evidence', element: <FreelancerEvidencePage /> },
              { path: 'verification', element: <FreelancerVerificationPage /> },
              { path: 'history', element: <FreelancerHistoryPage /> },
              { path: 'notifications', element: <ProjectNotificationsPage /> },
              { path: 'settings', element: <ProjectSettingsPage /> },
            ],
          },

          // Admin routes
          {
            element: <RoleRoute allowedRoles={['ADMIN']} />,
            children: [
              { path: '/admin', element: <AdminOverviewPage /> },
              { path: '/admin/users', element: <AdminResourcePage resource="users" /> },
              { path: '/admin/clients', element: <AdminResourcePage resource="clients" /> },
              { path: '/admin/freelancers', element: <AdminResourcePage resource="freelancers" /> },
              { path: '/admin/organizations', element: <AdminResourcePage resource="organizations" /> },
              { path: '/admin/projects', element: <AdminResourcePage resource="projects" /> },
              { path: '/admin/verification', element: <AdminResourcePage resource="verification" /> },
              { path: '/admin/matching', element: <AdminResourcePage resource="matching" /> },
              { path: '/admin/payments', element: <AdminResourcePage resource="payments" /> },
              { path: '/admin/changes', element: <AdminResourcePage resource="changes" /> },
              { path: '/admin/services', element: <AdminResourcePage resource="services" /> },
              { path: '/admin/ai', element: <AdminResourcePage resource="ai" /> },
              { path: '/admin/reports', element: <AdminResourcePage resource="reports" /> },
              { path: '/admin/audit', element: <AdminResourcePage resource="audit" /> },
              { path: '/admin/certificates', element: <AdminResourcePage resource="certificates" /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
