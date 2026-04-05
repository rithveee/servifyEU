'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth'
import { apiClient } from '@/lib/api'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { refreshToken, setTokens, setUser, logout } = useAuthStore()

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken')
    if (accessToken) return // already have a valid token in memory

    if (!refreshToken) return

    // Try to refresh the access token
    apiClient
      .post('/auth/refresh', { refreshToken })
      .then((res) => {
        const { accessToken: newAccess, refreshToken: newRefresh } = res.data
        setTokens(newAccess, newRefresh)

        return apiClient.get('/auth/me')
      })
      .then((res) => {
        setUser(res.data)
      })
      .catch(() => {
        logout()
      })
  }, [])

  return <>{children}</>
}
