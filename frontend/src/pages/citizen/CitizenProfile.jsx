import { useEffect, useState } from 'react'
import { LogOut, Loader2, ClipboardList } from 'lucide-react'
import { getMe } from '../../api/auth'
import { listMyComplaints } from '../../api/complaints'
import { useAuth } from '../../context/AuthContext'
import { PageHeader, Panel, PanelHead, Row } from '../../components/citizen/Panel'

/** Profile — the citizen's account details and a quick activity summary. */
export default function CitizenProfile() {
  const { logout } = useAuth()
  const [me, setMe] = useState(null)
  const [count, setCount] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getMe().catch(() => null), listMyComplaints().catch(() => [])])
      .then(([user, complaints]) => {
        setMe(user)
        setCount(complaints.length)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-full">
      <div className="mx-auto flex max-w-2xl flex-col gap-3 p-6 sm:p-8">
        <PageHeader title="My Profile" subtitle="Your CyberAid account details." />

        {loading ? (
          <p className="inline-flex items-center gap-2 text-[13.5px] text-slate-400">
            <Loader2 size={15} className="animate-spin" /> Loading…
          </p>
        ) : (
          <>
            <Panel>
              <PanelHead title="Account" />
              <div className="divide-y divide-white/6">
                <Row label="Name">{me?.full_name || 'Not provided'}</Row>
                <Row label="Email">{me?.email || '—'}</Row>
                <Row label="Account type">
                  <span className="capitalize">{me?.role || 'citizen'}</span>
                </Row>
              </div>
            </Panel>

            <Panel>
              <PanelHead title="Activity" />
              <div className="flex items-center gap-3 px-4 py-3">
                <ClipboardList size={18} className="shrink-0 text-cyan-300/85" />
                <div>
                  <div className="text-[14px] text-slate-200">
                    {count ?? 0} complaint{count === 1 ? '' : 's'} filed
                  </div>
                  <div className="text-[12.5px] text-slate-500">
                    Thank you for helping keep the community safe.
                  </div>
                </div>
              </div>
            </Panel>

            <button
              onClick={logout}
              className="inline-flex w-fit items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3.5 py-2 text-[13.5px] text-slate-200 transition hover:border-white/20 hover:text-white"
            >
              <LogOut size={15} /> Log out
            </button>
          </>
        )}
      </div>
    </div>
  )
}
