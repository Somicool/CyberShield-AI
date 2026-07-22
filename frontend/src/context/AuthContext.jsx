/**
 * Minimal auth state shared across the app via React Context.
 *
 * Why Context instead of a state library (Redux/Zustand): for a hackathon
 * MVP, auth state (token + logged-in flag) is the only truly global state
 * we need right now. Context is built into React, zero extra dependency,
 * and easy to explain. If app state grows complex later (e.g. live threat
 * feed needs shared state across many components), Zustand is a good
 * lightweight upgrade — but we don't need that yet.
 */
import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

/** Decode the role claim from the JWT we already hold (no extra request). */
function decodeRole(token) {
  if (!token) return null
  try {
    return JSON.parse(atob(token.split('.')[1])).role || null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('access_token'))

  function loginWithToken(accessToken) {
    localStorage.setItem('access_token', accessToken)
    setToken(accessToken)
  }

  function logout() {
    localStorage.removeItem('access_token')
    setToken(null)
  }

  const value = {
    token,
    role: decodeRole(token),
    isAuthenticated: Boolean(token),
    loginWithToken,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- intentional: hook + provider share one file
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
