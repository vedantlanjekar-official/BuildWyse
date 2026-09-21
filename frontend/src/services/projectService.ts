import { api, apiDownloadBlob } from '@/services/api'
import type {
  AIMessage,
  CalendarEvent,
  MatchingRunResponse,
  Project,
  Requirement,
  RequirementChatResponse,
} from '@/types'

export const projectService = {
  list: () => api.get<Project[]>('/api/v1/projects'),
  get: (id: string) => api.get<Project>(`/api/v1/projects/${id}`),
  create: (body: Record<string, unknown>) => api.post<Project>('/api/v1/projects', body),
  update: (id: string, body: Record<string, unknown>) => api.patch<Project>(`/api/v1/projects/${id}`, body),
  delete: (id: string) => api.delete<void>(`/api/v1/projects/${id}`),
  transition: (id: string, targetState: string, reason?: string) =>
    api.post(`/api/v1/projects/${id}/transition`, { target_state: targetState, reason }),

  requirements: (projectId: string) =>
    api.get<Requirement[]>(`/api/v1/requirements/project/${projectId}`),
  createRequirement: (projectId: string, body: Record<string, unknown>) =>
    api.post<Requirement>(`/api/v1/requirements/project/${projectId}`, body),
  requirementChat: (projectId: string, message: string, conversationId?: string) =>
    api.post<RequirementChatResponse>('/api/v1/ai/requirements/chat', {
      project_id: projectId,
      message,
      conversation_id: conversationId,
    }),
  listConversations: (projectId: string, conversationType?: string) =>
    api.get<Array<Record<string, unknown>>>(
      `/api/v1/ai/conversations/project/${projectId}${conversationType ? `?conversation_type=${conversationType}` : ''}`,
    ),
  listMessages: (conversationId: string) =>
    api.get<AIMessage[]>(`/api/v1/ai/conversations/${conversationId}/messages`),

  documents: (projectId: string) => api.get(`/api/v1/documents/project/${projectId}`),
  getDocument: (documentId: string) => api.get(`/api/v1/documents/${documentId}`),
  generateDocument: (body: Record<string, unknown>) =>
    api.post<{ count?: number; documents?: unknown[] }>('/api/v1/documents/generate', body),
  regenerateDocument: (documentId: string) => api.post(`/api/v1/documents/${documentId}/regenerate`, {}),
  documentPdfUrl: (documentId: string) => `/api/v1/documents/${documentId}/pdf`,

  listBudgets: (projectId: string) => api.get<Array<Record<string, unknown>>>(`/api/v1/budgets/project/${projectId}`),
  budgetEstimate: (body: Record<string, unknown>) => api.post('/api/v1/budgets/estimate', body),
  setBudgetPreference: (body: Record<string, unknown>) => api.post('/api/v1/budgets/preference', body),

  getMatchingResults: (projectId: string) =>
    api.get<{ matching_run: Record<string, unknown> | null; candidates: Array<Record<string, unknown>> }>(
      `/api/v1/matching/projects/${projectId}/results`,
    ),
  runMatching: (projectId: string) =>
    api.post<MatchingRunResponse>('/api/v1/matching/run', { project_id: projectId, include_embedding: false, limit: 10 }),
  selectCandidate: (projectId: string, freelancerId: string, reason?: string) =>
    api.post(`/api/v1/matching/projects/${projectId}/select`, {
      freelancer_id: freelancerId,
      selection_reason: reason,
    }),

  phases: (projectId: string) => api.get<Array<Record<string, unknown>>>(`/api/v1/phases/project/${projectId}`),
  getPhaseDetail: (phaseId: string) =>
    api.get<{
      phase: Record<string, unknown>
      submissions: Array<Record<string, unknown>>
      evidence: Array<Record<string, unknown>>
      payment_required_from: Record<string, unknown> | null
      is_paid: boolean
      project_id: string
    }>(`/api/v1/phases/${phaseId}`),
  updatePhase: (phaseId: string, body: Record<string, unknown>) =>
    api.patch<Record<string, unknown>>(`/api/v1/phases/${phaseId}`, body),
  phaseReport: (phaseId: string) => api.post<Record<string, unknown>>(`/api/v1/phases/${phaseId}/report`, {}),
  approveSubmission: (submissionId: string, approval_notes?: string) =>
    api.post('/api/v1/submissions/approve', {
      entity_type: 'submission',
      entity_id: submissionId,
      approval_notes,
    }),
  rejectSubmission: (submissionId: string, rejection_reason: string) =>
    api.post('/api/v1/submissions/reject', {
      submission_id: submissionId,
      rejection_reason,
      entity_type: 'submission',
    }),
  checkoutPhasePayment: (phaseId: string) =>
    api.post<{
      order: Record<string, unknown>
      checkout: Record<string, unknown>
      phase: Record<string, unknown>
      amount: string
      currency: string
    }>(`/api/v1/payments/phase/${phaseId}/checkout`, {}),
  completeCheckout: (body: {
    payment_order_id: string
    razorpay_payment_id?: string
    razorpay_order_id?: string
    razorpay_signature?: string
  }) => api.post('/api/v1/payments/checkout/complete', body),
  health: (projectId: string) => api.get(`/api/v1/health/project/${projectId}`),
  changes: (projectId: string) => api.get<Array<Record<string, unknown>>>(`/api/v1/change-requests/project/${projectId}`),
  getChange: (changeId: string) => api.get<Record<string, unknown>>(`/api/v1/change-requests/${changeId}`),
  createChange: (projectId: string, body: Record<string, unknown>) =>
    api.post(`/api/v1/change-requests/project/${projectId}`, body),
  freelancerChangeResponse: (
    changeId: string,
    body: { comment: string; budget_amount: number; currency?: string; estimated_days?: number },
  ) => api.post(`/api/v1/change-requests/${changeId}/freelancer-response`, body),
  approveChange: (changeId: string, body: { status?: string; notes?: string; approval_type?: string } = {}) =>
    api.post(`/api/v1/change-requests/${changeId}/approve`, body),
  services: (projectId: string) => api.get<Array<Record<string, unknown>>>(`/api/v1/services/project/${projectId}`),
  createService: (projectId: string, body: Record<string, unknown>) =>
    api.post(`/api/v1/services/project/${projectId}`, body),
  calendar: (projectId: string) => api.get<CalendarEvent[]>(`/api/v1/calendar/project/${projectId}`),
  createCalendarEvent: (body: {
    project_id: string
    title: string
    description?: string
    event_type?: string
    starts_at: string
    ends_at?: string | null
  }) => api.post<CalendarEvent>('/api/v1/calendar', body),

  listConnectMessages: (projectId: string) =>
    api.get<Array<Record<string, unknown>>>(`/api/v1/connect/project/${projectId}/messages`),
  sendConnectMessage: (projectId: string, body: string) =>
    api.post<Record<string, unknown>>(`/api/v1/connect/project/${projectId}/messages`, { body }),
  listMeetings: (projectId: string) =>
    api.get<Array<Record<string, unknown>>>(`/api/v1/connect/project/${projectId}/meetings`),
  scheduleMeeting: (
    projectId: string,
    body: {
      subject: string
      scheduled_at: string
      duration_minutes?: number
      notes?: string
      meeting_type?: string
    },
  ) => api.post<Record<string, unknown>>(`/api/v1/connect/project/${projectId}/meetings`, body),
  approveMeeting: (meetingId: string) =>
    api.post<Record<string, unknown>>(`/api/v1/connect/meetings/${meetingId}/approve`, {}),
  rejectMeeting: (meetingId: string, reason?: string) =>
    api.post<Record<string, unknown>>(`/api/v1/connect/meetings/${meetingId}/reject`, { reason }),

  proposals: (projectId: string) => api.get<Array<Record<string, unknown>>>(`/api/v1/proposals/project/${projectId}`),
  submitProposal: (body: Record<string, unknown>) => api.post('/api/v1/proposals', body),

  listTasks: (projectId: string) => api.get<Array<Record<string, unknown>>>(`/api/v1/tasks/project/${projectId}`),
  listMilestones: (projectId: string) =>
    api.get<Array<Record<string, unknown>>>(`/api/v1/milestones/project/${projectId}`),
  listSubmissions: (projectId: string) =>
    api.get<Array<Record<string, unknown>>>(`/api/v1/submissions/project/${projectId}`),
  createSubmission: (phaseId: string, body: Record<string, unknown>) =>
    api.post(`/api/v1/submissions/phase/${phaseId}`, body),
  listEvidence: (projectId: string) =>
    api.get<Array<Record<string, unknown>>>(`/api/v1/evidence/project/${projectId}`),
  addEvidence: (submissionId: string, body: Record<string, unknown>) =>
    api.post(`/api/v1/evidence/submission/${submissionId}`, body),
  listVerifications: (projectId: string) =>
    api.get<Array<Record<string, unknown>>>(`/api/v1/verification/project/${projectId}`),
  verifySubmission: (submissionId: string) =>
    api.post(`/api/v1/verification/submission/${submissionId}`, {}),
  listPayments: (projectId: string) =>
    api.get<{
      orders: Array<Record<string, unknown>>
      phase_payments: Array<Record<string, unknown>>
      totals: Record<string, number>
    }>(`/api/v1/payments/project/${projectId}`),
  getPaymentOrder: (orderId: string) => api.get<Record<string, unknown>>(`/api/v1/payments/orders/${orderId}`),
  downloadPaymentReceipt: async (orderId: string, filename = 'BuildWyse_Receipt.pdf') => {
    const blob = await apiDownloadBlob(`/api/v1/payments/orders/${orderId}/receipt.pdf`)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  },

  listCertificates: (projectId: string) =>
    api.get<Array<Record<string, unknown>>>(`/api/v1/certificates/project/${projectId}`),
  issueCertificate: (projectId: string, body: Record<string, unknown> = {}) =>
    api.post(`/api/v1/certificates/project/${projectId}`, body),
  downloadCertificatePdf: async (certificateId: string, filename = 'certificate.pdf') => {
    const blob = await apiDownloadBlob(`/api/v1/certificates/${certificateId}/pdf`)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  },
}

export const clientService = {
  dashboard: () => api.get('/api/v1/clients/dashboard'),
  list: () => api.get('/api/v1/clients'),
}

export const freelancerService = {
  list: () => api.get('/api/v1/freelancers'),
  get: (id: string) => api.get(`/api/v1/freelancers/${id}`),
  me: () => api.get('/api/v1/freelancers/me/profile'),
}

export const userService = {
  me: () => api.get('/api/v1/users/me'),
  updateMe: (body: Record<string, unknown>) => api.patch('/api/v1/users/me', body),
  uploadAvatar: (body: { filename: string; content_type: string; data_base64: string }) =>
    api.post('/api/v1/users/me/avatar', body),
  sendOtp: (channel: 'email' | 'phone') =>
    api.post<{ status: string; channel: string; destination: string; expires_in_seconds: number; debug_code?: string | null }>(
      '/api/v1/users/me/otp/send',
      { channel },
    ),
  verifyOtp: (channel: 'email' | 'phone', code: string) =>
    api.post('/api/v1/users/me/otp/verify', { channel, code }),
  submitGovernmentId: (body: {
    id_type: string
    id_number: string
    filename: string
    content_type: string
    data_base64: string
  }) => api.post('/api/v1/users/me/government-id', body),
  listPaymentMethods: () => api.get<PaymentMethod[]>('/api/v1/users/me/payment-methods'),
  createPaymentMethod: (body: Record<string, unknown>) =>
    api.post<PaymentMethod>('/api/v1/users/me/payment-methods', body),
  setAutopay: (methodId: string) =>
    api.post<PaymentMethod>(`/api/v1/users/me/payment-methods/${methodId}/autopay`, {}),
  deletePaymentMethod: (methodId: string) =>
    api.delete(`/api/v1/users/me/payment-methods/${methodId}`),
}

export type PaymentMethod = {
  id: string
  user_id: string
  method_type: 'bank' | 'card' | string
  label?: string | null
  bank_name?: string | null
  bank_branch?: string | null
  account_holder_name?: string | null
  account_number?: string | null
  ifsc_code?: string | null
  card_type?: string | null
  card_number?: string | null
  card_expiry?: string | null
  is_autopay?: boolean
  created_at: string
  updated_at?: string | null
}

export const notificationService = {
  list: () => api.get('/api/v1/notifications'),
  markRead: (ids: string[]) => api.post('/api/v1/notifications/mark-read', { notification_ids: ids }),
}

export const paymentService = {
  createOrder: (body: Record<string, unknown>) => api.post('/api/v1/payments/orders', body),
  approve: (body: Record<string, unknown>) => api.post('/api/v1/payments/approve', body),
  byProject: (projectId: string) => api.get<Array<Record<string, unknown>>>(`/api/v1/payments/project/${projectId}`),
  checkoutPhase: (phaseId: string) => projectService.checkoutPhasePayment(phaseId),
  completeCheckout: (body: {
    payment_order_id: string
    razorpay_payment_id?: string
    razorpay_order_id?: string
    razorpay_signature?: string
  }) => projectService.completeCheckout(body),
  adminList: () => api.get('/api/v1/admin/payments'),
}

export const adminService = {
  overview: () => api.get('/api/v1/admin/overview'),
  users: () => api.get('/api/v1/admin/users'),
  projects: () => api.get('/api/v1/admin/projects'),
  auditLogs: () => api.get('/api/v1/admin/audit-logs'),
  payments: () => api.get('/api/v1/admin/payments'),
}

export const orgService = {
  list: () => api.get<Array<Record<string, unknown>>>('/api/v1/organizations'),
  create: (body: Record<string, unknown>) => api.post('/api/v1/organizations', body),
}

export const taskService = {
  byProject: (projectId: string) => api.get<Array<Record<string, unknown>>>(`/api/v1/tasks/project/${projectId}`),
  byPhase: (phaseId: string) => api.get(`/api/v1/tasks/phase/${phaseId}`),
  create: (phaseId: string, body: Record<string, unknown>) =>
    api.post(`/api/v1/tasks/phase/${phaseId}`, body),
}

export const milestoneService = {
  byProject: (projectId: string) =>
    api.get<Array<Record<string, unknown>>>(`/api/v1/milestones/project/${projectId}`),
  byPhase: (phaseId: string) => api.get(`/api/v1/milestones/phase/${phaseId}`),
}

export const submissionService = {
  byProject: (projectId: string) =>
    api.get<Array<Record<string, unknown>>>(`/api/v1/submissions/project/${projectId}`),
  create: (phaseId: string, body: Record<string, unknown>) =>
    api.post(`/api/v1/submissions/phase/${phaseId}`, body),
  approve: (submissionId: string, approval_notes?: string) =>
    projectService.approveSubmission(submissionId, approval_notes),
  reject: (submissionId: string, rejection_reason: string) =>
    projectService.rejectSubmission(submissionId, rejection_reason),
}

export const verificationService = {
  byProject: (projectId: string) =>
    api.get<Array<Record<string, unknown>>>(`/api/v1/verification/project/${projectId}`),
  verifySubmission: (submissionId: string) =>
    api.post(`/api/v1/verification/submission/${submissionId}`, {}),
}
