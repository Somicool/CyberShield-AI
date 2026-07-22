/**
 * Auth API calls.
 *
 * Note: the backend's /api/auth/login expects form-encoded data
 * (FastAPI's OAuth2PasswordRequestForm), not JSON — that's why login()
 * builds a URLSearchParams body instead of passing a plain object.
 * /api/auth/signup expects normal JSON.
 */
import apiClient from './client'

export async function signup({ email, password, full_name }) {
  const { data } = await apiClient.post('/auth/signup', {
    email,
    password,
    full_name,
  })
  return data
}

export async function login({ email, password }) {
  const body = new URLSearchParams()
  body.append('username', email)
  body.append('password', password)

  const { data } = await apiClient.post('/auth/login', body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return data // { access_token, token_type }
}

export async function getMe() {
  const { data } = await apiClient.get('/auth/me')
  return data // { id, email, full_name, role }
}
