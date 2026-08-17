import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardLayout from './components/DashboardLayout'
import RoleSelection from './pages/RoleSelection'
import Login from './pages/Login'
import Signup from './pages/Signup'
import CitizenLogin from './pages/CitizenLogin'
import CitizenSignup from './pages/CitizenSignup'
import CitizenRoute from './components/CitizenRoute'
import CitizenLayout from './components/CitizenLayout'
import CitizenHome from './pages/citizen/CitizenHome'
import CitizenReport from './pages/citizen/CitizenReport'
import CitizenCheck from './pages/citizen/CitizenCheck'
import CitizenComplaints from './pages/citizen/CitizenComplaints'
import CitizenComplaintDetail from './pages/citizen/CitizenComplaintDetail'
import CyberSafety from './pages/citizen/CyberSafety'
import GuardianExtension from './pages/citizen/GuardianExtension'
import GuardianGuide from './pages/citizen/GuardianGuide'
import CitizenProfile from './pages/citizen/CitizenProfile'
import CheckThreat from './pages/CheckThreat'
import LiveFeed from './pages/LiveFeed'
import ThreatFeed from './pages/ThreatFeed'
import Cases from './pages/Cases'
import InvestigationWorkspace from './pages/InvestigationWorkspace'
import IncidentDetail from './pages/IncidentDetail'
import Analytics from './pages/Analytics'
import ThreatIntelligenceGraph from './pages/ThreatIntelligenceGraph'
import InvestigationCopilot from './pages/InvestigationCopilot'
import AdminSystem from './pages/AdminSystem'
import AdminRoute from './components/AdminRoute'
import PoliceRoute from './components/PoliceRoute'
import CrimeGPT from './pages/CrimeGPT'
import Heatmap from './pages/Heatmap'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RoleSelection />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/citizen/login" element={<CitizenLogin />} />
          <Route path="/citizen/signup" element={<CitizenSignup />} />

          <Route
            path="/citizen"
            element={
              <CitizenRoute>
                <CitizenLayout />
              </CitizenRoute>
            }
          >
            <Route index element={<CitizenHome />} />
            <Route path="report" element={<CitizenReport />} />
            <Route path="check" element={<CitizenCheck />} />
            <Route path="complaints" element={<CitizenComplaints />} />
            <Route path="complaints/:id" element={<CitizenComplaintDetail />} />
            <Route path="safety" element={<CyberSafety />} />
            <Route path="guardian" element={<GuardianExtension />} />
            <Route path="guardian/guide" element={<GuardianGuide />} />
            <Route path="profile" element={<CitizenProfile />} />
          </Route>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<LiveFeed />} />
            <Route path="feed" element={<ThreatFeed />} />
            <Route path="cases" element={<Cases />} />
            <Route path="investigate/:id" element={<InvestigationWorkspace />} />
            <Route path="check" element={<CheckThreat />} />
            <Route path="incidents/:id" element={<IncidentDetail />} />
            <Route path="analytics" element={<Analytics />} />
            {/* Single threat-graph page. `intel-graph` is kept as an alias
                (rendering the same page, so query params survive) for any
                older deep links. */}
            <Route path="graph" element={<ThreatIntelligenceGraph />} />
            <Route path="intel-graph" element={<ThreatIntelligenceGraph />} />
            <Route path="copilot" element={<InvestigationCopilot />} />
            <Route
              path="crimegpt"
              element={
                <PoliceRoute>
                  <CrimeGPT />
                </PoliceRoute>
              }
            />
            <Route
              path="crimegpt/:id"
              element={
                <PoliceRoute>
                  <CrimeGPT />
                </PoliceRoute>
              }
            />
            <Route
              path="admin"
              element={
                <AdminRoute>
                  <AdminSystem />
                </AdminRoute>
              }
            />
            <Route path="map" element={<Heatmap />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
