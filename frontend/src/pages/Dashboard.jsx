import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, FileText, Search, ChevronRight, Upload } from 'lucide-react'
import { resumeAPI, applicationsAPI } from '../api/client'

const STATUS_BADGE = {
  saved:     'badge-gray',
  applied:   'badge-blue',
  interview: 'badge-green',
  rejected:  'badge-red',
  offer:     'badge-purple',
}
const STATUS_LABEL = {
  saved: 'Saved', applied: 'Applied', interview: 'Interview',
  rejected: 'Rejected', offer: 'Offer',
}

export default function Dashboard() {
  const [resume, setResume]             = useState(null)
  const [applications, setApplications] = useState([])
  const [loading, setLoading]           = useState(true)

  useEffect(() => {
    Promise.all([resumeAPI.get(), applicationsAPI.list()])
      .then(([r, a]) => {
        setResume(r.resume)
        setApplications(a.applications || [])
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-edge border-t-brand rounded-full animate-spin" />
      </div>
    )
  }

  const counts = {
    total:     applications.length,
    applied:   applications.filter(a => a.status === 'applied').length,
    interview: applications.filter(a => a.status === 'interview').length,
    offer:     applications.filter(a => a.status === 'offer').length,
    saved:     applications.filter(a => a.status === 'saved').length,
  }
  const recent = applications.slice(0, 7)

  return (
    <div className="min-h-full">

      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="px-8 pt-9 border-b border-edge bg-white">
        <div className="flex items-baseline gap-3 pb-5">
          <h1 className="text-2xl font-bold text-ink leading-none tracking-tight">
            Dashboard
          </h1>
          {counts.total > 0 && (
            <span className="text-sm text-ink-sub">{counts.total} tracked</span>
          )}
        </div>
      </div>

      {/* ── Inline stats ─────────────────────────────────────────── */}
      <div className="px-8 pt-6">
        {counts.total === 0 ? (
          <p className="text-sm text-ink-muted">No applications yet.</p>
        ) : (
          <div className="flex items-center gap-5 text-sm flex-wrap">
            <span>
              <span className="text-2xl font-bold text-ink mr-1.5">{counts.applied}</span>
              <span className="text-ink-sub">applied</span>
            </span>
            <span className="text-edge">·</span>
            <span>
              <span className="text-2xl font-bold text-ink mr-1.5">{counts.interview}</span>
              <span className="text-ink-sub">interviews</span>
            </span>
            <span className="text-edge">·</span>
            <span>
              <span className="text-2xl font-bold text-ink mr-1.5">{counts.offer}</span>
              <span className="text-ink-sub">offers</span>
            </span>
            {counts.saved > 0 && (
              <>
                <span className="text-edge">·</span>
                <span>
                  <span className="text-lg font-semibold text-ink-muted mr-1">{counts.saved}</span>
                  <span className="text-ink-muted">saved</span>
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Resume status ────────────────────────────────────────── */}
      <div className="px-8 pt-4">
        {resume ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-ink-sub">
              {resume.analysis?.name || 'Resume'} ready
            </span>
            {resume.analysis?.primaryRole && (
              <span className="text-ink-muted">· {resume.analysis.primaryRole}</span>
            )}
            {resume.analysis?.atsScore && (
              <span className="text-ink-muted">· ATS {resume.analysis.atsScore}%</span>
            )}
            <Link
              to="/jobs"
              className="ml-1 text-brand hover:text-brand-dark flex items-center gap-0.5 transition-colors font-medium"
            >
              Find jobs <ChevronRight size={12} />
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            <span className="text-ink-sub">No resume uploaded</span>
            <Link
              to="/resume"
              className="ml-1 text-brand hover:text-brand-dark flex items-center gap-0.5 transition-colors font-medium"
            >
              Upload now <ChevronRight size={12} />
            </Link>
          </div>
        )}
      </div>

      {/* ── Main body — 3/5 + 2/5 ───────────────────────────────── */}
      <div className="px-8 pt-8 pb-12 grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

        {/* Recent applications ───────────────────────────────────── */}
        <div className="lg:col-span-3 card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-edge">
            <span className="section-title">Recent applications</span>
            {recent.length > 0 && (
              <Link to="/applications" className="text-xs text-brand hover:text-brand-dark transition-colors font-medium">
                All →
              </Link>
            )}
          </div>

          {recent.length === 0 ? (
            <div className="py-14 text-center">
              <Briefcase size={26} className="text-ink-faint mx-auto mb-3" />
              <p className="text-sm text-ink-sub">Nothing tracked yet.</p>
              <p className="text-xs text-ink-muted mt-1">
                Apply from{' '}
                <Link to="/jobs" className="text-brand hover:text-brand-dark underline underline-offset-2">
                  Discover
                </Link>{' '}
                to start.
              </p>
            </div>
          ) : (
            <div>
              {recent.map((app, i) => (
                <div
                  key={app.id}
                  className={`flex items-center gap-3 px-5 py-3 hover:bg-brand-faint transition-colors ${
                    i < recent.length - 1 ? 'border-b border-edge-soft' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-md bg-brand-light border border-edge-active flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-brand">
                      {(app.job?.company || 'C')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{app.job?.title}</p>
                    <p className="text-xs text-ink-muted truncate">{app.job?.company}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={STATUS_BADGE[app.status] || 'badge-gray'}>
                      {STATUS_LABEL[app.status] || app.status}
                    </span>
                    <span className="text-[11px] text-ink-muted tabular-nums hidden sm:block">
                      {new Date(app.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick links ───────────────────────────────────────────── */}
        <div className="lg:col-span-2 lg:pt-1 card">
          <div className="px-5 py-4 border-b border-edge">
            <span className="section-title">Quick links</span>
          </div>
          <div className="p-2">
            {[
              {
                to:    '/resume',
                icon:  Upload,
                label: resume ? 'Update resume' : 'Upload resume',
                sub:   resume ? 'Re-analyze or replace' : 'Required before applying',
              },
              {
                to:    '/jobs',
                icon:  Search,
                label: 'Find jobs',
                sub:   'Search across job boards',
              },
              {
                to:    '/applications',
                icon:  FileText,
                label: 'Applications',
                sub:   counts.total > 0 ? `${counts.total} total` : 'Track progress',
              },
            ].map(({ to, icon: Icon, label, sub }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-3 px-3 py-3 rounded-md hover:bg-brand-faint transition-colors group"
              >
                <div className="w-8 h-8 rounded-md bg-brand-light flex items-center justify-center shrink-0">
                  <Icon size={14} className="text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink group-hover:text-brand transition-colors">{label}</p>
                  <p className="text-xs text-ink-muted">{sub}</p>
                </div>
                <ChevronRight size={14} className="text-ink-muted group-hover:text-brand transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
