/**
 * Central axios instance for all backend calls.
 *
 * Why one shared instance instead of calling axios directly everywhere:
 * we want the JWT token attached to every request automatically, and a
 * single place to handle 401s (token expired -> log out) once auth grows.
 *
 * baseURL is '/api' (not a full backend URL) because vite.config.js proxies
 * '/api/*' requests to the FastAPI server. This avoids hardcoding
 * 'http://127.0.0.1:8000' in the frontend, so the same code works
 * unchanged when deployed behind a real domain.
 */
import axios from 'axios'

const apiClient = axios.create({
  baseURL: '/api',
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// If the token is missing/expired the backend returns 401
// ("Could not validate credentials"). Rather than surfacing a confusing error
// on protected actions (like filing a complaint), clear the stale token and
// send the user to the right login so they can re-authenticate cleanly.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      const path = window.location.pathname
      if (!path.endsWith('/login') && !path.includes('/login')) {
        window.location.assign(path.startsWith('/citizen') ? '/citizen/login' : '/login')
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
