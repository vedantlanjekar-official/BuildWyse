import { env } from '@/utils/env'
import type { ApiError } from '@/types'

type RequestOptions = RequestInit & {
  params?: Record<string, string | number | boolean | undefined>
}

let accessToken: string | null = null
let devUserId: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function setDevUserId(userId: string | null) {
  devUserId = userId
}

export function getDevUserId(): string | null {
  return devUserId
}

export class ApiClientError extends Error {
  status: number
  body: ApiError | unknown

  constructor(status: number, message: string, body: ApiError | unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  // In dev, route through the Vite proxy (/api → backend) to avoid CORS/network issues.
  const base = import.meta.env.DEV ? window.location.origin : env.apiUrl.replace(/\/$/, '')
  const url = new URL(`${base}${normalizedPath}`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as ApiError
    if (typeof body.detail === 'string') return body.detail
    if (Array.isArray(body.detail)) return body.detail.map((d) => d.msg).join(', ')
    return res.statusText
  } catch {
    return res.statusText
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...rest } = options
  const reqHeaders = new Headers(headers)

  if (!reqHeaders.has('Content-Type') && rest.body && !(rest.body instanceof FormData)) {
    reqHeaders.set('Content-Type', 'application/json')
  }

  if (accessToken) {
    reqHeaders.set('Authorization', `Bearer ${accessToken}`)
  } else if (env.devAuth && devUserId) {
    reqHeaders.set('X-Dev-User-Id', devUserId)
  }

  const res = await fetch(buildUrl(path, params), {
    ...rest,
    headers: reqHeaders,
  })

  if (!res.ok) {
    const message = await parseError(res)
    throw new ApiClientError(res.status, message, message)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export async function apiDownloadBlob(path: string, params?: RequestOptions['params']): Promise<Blob> {
  const reqHeaders = new Headers()
  if (accessToken) {
    reqHeaders.set('Authorization', `Bearer ${accessToken}`)
  } else if (env.devAuth && devUserId) {
    reqHeaders.set('X-Dev-User-Id', devUserId)
  }

  const res = await fetch(buildUrl(path, params), { method: 'GET', headers: reqHeaders })
  if (!res.ok) {
    const message = await parseError(res)
    throw new ApiClientError(res.status, message, message)
  }
  return res.blob()
}

export const api = {
  get: <T>(path: string, params?: RequestOptions['params']) =>
    apiRequest<T>(path, { method: 'GET', params }),
  post: <T>(path: string, body?: unknown, params?: RequestOptions['params']) =>
    apiRequest<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      params,
    }),
  patch: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
}
