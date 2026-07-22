import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Guards admin-only routes. Requires an authenticated user whose JWT role is
 * "admin"; otherwise redirects. Reuses the existing JWT/role model — the
 * backend independently enforces the same check on /api/admin routes.
 */
export default function AdminRoute({ children }) {
  const { isAuthenticated, role } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (role !== 'admin') return <Navigate to="/dashboard" replace />
  return children
}
