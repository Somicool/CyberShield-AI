import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Guards the Citizen Portal. Requires authentication; if a police/admin user
 * lands here they are redirected to their own dashboard so the two portals
 * stay cleanly separated.
 */
export default function CitizenRoute({ children }) {
  const { isAuthenticated, role } = useAuth()
  if (!isAuthenticated) return <Navigate to="/citizen/login" replace />
  if (role === 'police' || role === 'admin') return <Navigate to="/dashboard" replace />
  return children
}
