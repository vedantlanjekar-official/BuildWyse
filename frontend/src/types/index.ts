export type Role =
  | 'CLIENT'
  | 'FREELANCER'
  | 'TEAM_MEMBER'
  | 'TEAM_LEADER'
  | 'ENTERPRISE_EMPLOYEE'
  | 'ENTERPRISE_MANAGER'
  | 'ADMIN'

export type ProjectState =
  | 'DRAFT'
  | 'REQUIREMENTS'
  | 'DOCUMENTATION'
  | 'BUDGETING'
  | 'MATCHING'
  | 'FREELANCER_SELECTION'
  | 'CONTRACTING'
  | 'EXECUTION'
  | 'VERIFICATION'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ON_HOLD'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  phone?: string | null
  avatar_url?: string | null
  account_type: string
  verification_status: string
  country?: string | null
  address?: string | null
  address_line1?: string | null
  address_line2?: string | null
  state?: string | null
  city?: string | null
  pincode?: string | null
  email_verified?: boolean
  phone_verified?: boolean
  government_id_verified?: boolean
  government_id_type?: string | null
  government_id_number?: string | null
  aadhaar_number?: string | null
  government_id_url?: string | null
  bank_name?: string | null
  bank_branch?: string | null
  account_holder_name?: string | null
  account_number?: string | null
  ifsc_code?: string | null
  card_type?: string | null
  card_number?: string | null
  card_expiry?: string | null
  is_fully_verified?: boolean
  roles: Role[]
  created_at: string
  updated_at?: string | null
}

export interface SessionInfo {
  user_id: string
  email: string | null
  roles: Role[]
  is_admin: boolean
}

export interface Project {
  id: string
  client_id: string
  title: string
  description: string | null
  state: ProjectState
  category: string | null
  industry: string | null
  complexity: string | null
  assigned_freelancer_id: string | null
  assigned_org_id: string | null
  assigned_freelancer_name?: string | null
  development_model: string | null
  estimated_budget: string | null
  currency: string
  created_at: string
  updated_at: string | null
}

export interface Requirement {
  id: string
  project_id: string
  title: string
  description: string | null
  priority: string
  status: string
  category: string | null
  created_at: string
}

export interface AIMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: Record<string, unknown>
  created_at: string
}

export interface RequirementChatResponse {
  conversation_id: string
  user_message: AIMessage
  assistant_message: AIMessage
  structured_output: Record<string, unknown>
}

export interface MatchingCandidate {
  freelancer_id: string
  user_id: string
  headline: string | null
  rank: number
  scores: Record<string, number>
  explanation: string
}

export interface MatchingRunResponse {
  matching_run_id: string
  project_id: string
  candidates: MatchingCandidate[]
  algorithm_version: string
  completed_at: string
}

export interface Notification {
  id: string
  user_id: string
  project_id?: string | null
  title: string
  body: string | null
  is_read: boolean
  notification_type: string
  created_at: string
}

export interface FreelancerProfile {
  id: string
  user_id: string
  headline: string | null
  experience_years: number | null
  platform_certified: boolean
  availability_status: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface Phase {
  id: string
  project_id: string
  name: string
  description: string | null
  status: string
  order_index: number
  created_at: string
}

export interface CalendarEvent {
  id: string
  project_id: string
  phase_id?: string | null
  milestone_id?: string | null
  title: string
  description?: string | null
  event_type?: string | null
  starts_at: string
  ends_at?: string | null
  synthetic?: boolean
  /** Attached client-side when aggregating across projects */
  projectTitle?: string
}

export interface Task {
  id: string
  phase_id: string
  title: string
  description: string | null
  status: string
  assignee_id: string | null
  created_at: string
}

export interface Milestone {
  id: string
  phase_id: string
  title: string
  description: string | null
  due_date: string | null
  status: string
  created_at: string
}

export interface ChangeRequest {
  id: string
  project_id: string
  title: string
  description: string | null
  status: string
  requested_by: string
  created_at: string
}

export interface PaymentOrder {
  id: string
  project_id: string
  amount: string
  currency: string
  status: string
  created_at: string
}

export interface AdminOverview {
  memory_mode: boolean
  counts: Record<string, number>
}

export interface ApiError {
  detail: string | { msg: string }[]
}
