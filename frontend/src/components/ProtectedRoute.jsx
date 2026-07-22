import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/** Redirects to /login if there's no auth token. Wrap any page that requires login. */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return children
}
