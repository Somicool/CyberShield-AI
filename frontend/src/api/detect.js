import apiClient from './client'

export async function submitDetection({ type, content }) {
  const { data } = await apiClient.post('/detect', { type, content })
  return data
}
