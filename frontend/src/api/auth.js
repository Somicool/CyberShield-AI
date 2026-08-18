/**
 * Auth API calls.
 *
 * Note: the backend's /api/auth/login expects form-encoded data
 * (FastAPI's OAuth2PasswordRequestForm), not JSON — that's why login()
 * builds a URLSearchParams body instead of passing a plain object.
 * /api/auth/signup expects normal JSON.
 */
import apiClient from './client'

/** Citizen self-registration. The backend always assigns the citizen role. */
export async function signup({ email, password, full_name }) {
  const { data } = await apiClient.post('/auth/signup', {
    email,
    password,
    full_name,
  })
  return data
}

/**
 * Officer registration — requires the department access code. Fails with 403
 * if the deployment has officer self-registration switched off, in which case
 * an administrator has to create the account.
 */
export async function signupOfficer({ email, password, full_name, access_code }) {
  const { data } = await apiClient.post('/auth/signup/officer', {
    email,
    password,
    full_name,
    access_code,
  })
  return data
}

/**
 * Sign in. `otp` carries the authenticator code for police/admin accounts.
 *
 * Returns one of:
 *   { access_token }                                     — signed in
 *   { mfa_enrollment_required: true, enrollment_token }  — must set up 2FA first
 *
 * A 401 with detail "mfa_required" means the password was right but a code is
 * still needed.
 */
export async function login({ email, password, otp }) {
  const body = new URLSearchParams()
  body.append('username', email)
  body.append('password', password)
  if (otp) body.append('otp', otp)

  const { data } = await apiClient.post('/auth/login', body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return data
}

/** Begins 2FA enrollment using the short-lived enrollment token. */
export async function mfaSetup(enrollmentToken) {
  const { data } = await apiClient.post('/auth/mfa/setup', null, {
    headers: { Authorization: `Bearer ${enrollmentToken}` },
  })
  return data // { secret, otpauth_uri }
}

/** Confirms enrollment with the first generated code; returns a real session. */
export async function mfaEnable(enrollmentToken, code) {
  const { data } = await apiClient.post(
    '/auth/mfa/enable',
    { code },
    { headers: { Authorization: `Bearer ${enrollmentToken}` } }
  )
  return data // { access_token }
}

export async function getMe() {
  const { data } = await apiClient.get('/auth/me')
  return data // { id, email, full_name, role }
}
