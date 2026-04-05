const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

interface RequestOptions {
  headers?: Record<string, string>
  body?: unknown
}

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private getAuthHeader(): Record<string, string> {
    if (typeof window === 'undefined') return {}
    const token = localStorage.getItem('accessToken')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async get(path: string, options: RequestOptions = {}) {
    const response = await fetch(`${this.baseURL}${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw Object.assign(new Error(error.error ?? 'Request failed'), { response: { data: error } })
    }

    return response.json()
  }

  async post(path: string, body?: unknown, options: RequestOptions = {}) {
    const response = await fetch(`${this.baseURL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
        ...options.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw Object.assign(new Error(error.error ?? 'Request failed'), { response: { data: error } })
    }

    return response.json()
  }

  async put(path: string, body?: unknown, options: RequestOptions = {}) {
    const response = await fetch(`${this.baseURL}${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
        ...options.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw Object.assign(new Error(error.error ?? 'Request failed'), { response: { data: error } })
    }

    return response.json()
  }

  async delete(path: string, options: RequestOptions = {}) {
    const response = await fetch(`${this.baseURL}${path}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }))
      throw Object.assign(new Error(error.error ?? 'Request failed'), { response: { data: error } })
    }

    return response.json()
  }
}

export const apiClient = new ApiClient(API_URL)
