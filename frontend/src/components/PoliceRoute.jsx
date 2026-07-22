import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Guards police-only routes (CrimeGPT). Requires an authenticated user whose
 * JWT role is "police" or "admin"; otherwise redirects. Reuses the existing
 * JWT/role model — the backend independently enforces the same check on
 * /api/crimegpt routes.
 */
export default function PoliceRoute({ children }) {
  const { isAuthenticated, role } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (role !== 'police' && role !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}
