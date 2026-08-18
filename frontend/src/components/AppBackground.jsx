import { useLocation } from 'react-router-dom'
import NetworkBackground from './NetworkBackground'
import CitizenBackground from './CitizenBackground'

/**
 * Chooses the backdrop for the current route so the two portals never look
 * alike:
 *
 *  - Citizen portal  → calm navy field with slow periwinkle blooms.
 *  - Police console  → graphite with the live cyan threat-intelligence mesh.
 *
 * Mounted once inside the router; individual pages never render a background.
 */
export default function AppBackground() {
  const { pathname } = useLocation()

  // The role-selection landing page renders its own photographic backdrop, so
  // no shared background is drawn there — two stacked backgrounds would fight
  // each other and hurt the contrast of the choice cards.
  if (pathname === '/') return null

  const isCitizen = pathname === '/citizen' || pathname.startsWith('/citizen/')
  return isCitizen ? <CitizenBackground /> : <NetworkBackground />
}
