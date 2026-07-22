/**
 * Post-login routing helpers. Citizens land on the simple Citizen Portal;
 * police officers and admins land on the existing advanced dashboard. The role
 * is read from the JWT we already hold (no extra request).
 */
export function decodeRole(token) {
  if (!token) return null
  try {
    return JSON.parse(atob(token.split('.')[1])).role || null
  } catch {
    return null
  }
}

export function pathForRole(role) {
  return role === 'citizen' ? '/citizen' : '/dashboard'
}
