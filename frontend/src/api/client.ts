import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'

/** Relative URL uses Vite dev proxy (→ :8001); override with VITE_API_URL if needed. */
const API_BASE = import.meta.env.VITE_API_URL ?? '/api/v1'

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const { refreshToken, setTokens, logout } = useAuthStore.getState()
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${API_BASE}/auth/token/refresh/`,
            { refresh: refreshToken }
          )
          setTokens(data.access, data.refresh ?? refreshToken)
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch {
          logout()
        }
      } else {
        logout()
      }
    }
    return Promise.reject(error)
  }
)

export default api
