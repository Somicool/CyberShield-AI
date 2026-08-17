import apiClient from './client'

export async function listIncidents({ page = 1, pageSize = 20, threatLevel, incidentType, search } = {}) {
  const { data } = await apiClient.get('/incidents', {
    params: {
      page,
      page_size: pageSize,
      threat_level: threatLevel || undefined,
      incident_type: incidentType || undefined,
      search: search || undefined,
    },
  })
  return data
}

export async function getIncident(id) {
  const { data } = await apiClient.get(`/incidents/${id}`)
  return data
}

export async function getStats(days = 14) {
  const { data } = await apiClient.get('/incidents/stats', { params: { days } })
  return data
}

/**
 * Permanently deletes a case. Police/admin only (enforced server-side) and
 * irreversible — always confirm with the officer before calling this.
 */
export async function deleteIncident(id) {
  await apiClient.delete(`/incidents/${id}`)
}

export async function investigateIncident(id) {
  const { data } = await apiClient.post(`/detect/${id}/investigate`)
  return data
}

export async function getGraphConnections(entityType, entityValue) {
  const { data } = await apiClient.get(`/detect/graph/${entityType}/${encodeURIComponent(entityValue)}`)
  return data
}


export async function getMapPoints() {
  const { data } = await apiClient.get('/incidents/map/points')
  return data
}
