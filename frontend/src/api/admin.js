import apiClient from './client'

/** Admin API — all endpoints require an admin JWT (enforced server-side). */

export async function getAdminOverview() {
  const { data } = await apiClient.get('/admin/overview')
  return data
}

export async function getAdminUsers({ search, role } = {}) {
  const { data } = await apiClient.get('/admin/users', {
    params: { search: search || undefined, role: role || undefined },
  })
  return data
}

export async function changeUserRole(id, role) {
  const { data } = await apiClient.patch(`/admin/users/${id}/role`, { role })
  return data
}

export async function changeUserStatus(id, isActive) {
  const { data } = await apiClient.patch(`/admin/users/${id}/status`, { is_active: isActive })
  return data
}

export async function resetUserPassword(id) {
  const { data } = await apiClient.post(`/admin/users/${id}/reset-password`)
  return data
}

export async function getSystemHealth() {
  const { data } = await apiClient.get('/admin/health')
  return data
}
