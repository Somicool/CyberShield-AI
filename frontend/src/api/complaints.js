/**
 * Citizen complaints API client. Reuses the shared axios instance (JWT
 * attached automatically). The backend runs the existing detection pipeline
 * on scannable reports and returns an AI summary with each complaint.
 */
import apiClient from './client'

export async function createComplaint(payload) {
  const { data } = await apiClient.post('/complaints', payload)
  return data
}

export async function listMyComplaints() {
  const { data } = await apiClient.get('/complaints/mine')
  return data
}

export async function getComplaint(id) {
  const { data } = await apiClient.get(`/complaints/${id}`)
  return data
}
