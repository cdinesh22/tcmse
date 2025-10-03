import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { jwtDecode } from 'jwt-decode'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('tcm_token')
    if (token) {
      try {
        const decoded = jwtDecode(token)
        if (decoded?.exp * 1000 > Date.now()) {
          api.get('/api/auth/me').then(res => {
            setUser(res.data.data.user)
          }).catch(() => {
            localStorage.removeItem('tcm_token')
          }).finally(() => setLoading(false))
          return
        }
      } catch (_) {}
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password })
    const { user, token } = res.data.data
    localStorage.setItem('tcm_token', token)
    setUser(user)
    return user
  }

  const register = async (payload) => {
    const res = await api.post('/api/auth/register', payload)
    const { user, token } = res.data.data
    localStorage.setItem('tcm_token', token)
    setUser(user)
    return user
  }

  const logout = () => {
    localStorage.removeItem('tcm_token')
    setUser(null)
  }

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
