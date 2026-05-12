import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Bot, Play, Square, X, ExternalLink, Eye, Mail, CheckCircle2,
  AlertCircle, Loader2, MapPin, Briefcase, ChevronRight
} from 'lucide-react'
import { botAPI, resumeAPI } from '../api/client'
import { loadLocalSettings } from '../utils/localSettings'

// ─── Job Detail Modal ─────────────────────────────────────────────────────────

function JobModal({ job, onClose, onApply }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl flex flex-col card shadow-2xl max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-edge">
          <div className="min-w-0 pr-4">
            <h3 className="font-semibold text-ink text-base leading-tight">{job.jobTitle}</h3>
            <p className="text-sm text-ink-muted mt-0.5">{job.company}</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 shrink-0"><X size={16} /></button>
        </div>

        {/* Meta */}
        <div className="px-5 py-3 bg-gray-50 border-b border-edge flex flex-wrap gap-4 text-xs text-ink-muted">
          {job.jobUrl && (
            <a href={job.jobUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-brand hover:underline">
              <ExternalLink size={12} /> View on LinkedIn
            </a>
          )}
          {job.recruiterName && (
            <span className="flex items-center gap-1.5">
              <Briefcase size={12} /> Posted by {job.recruiterName}
            </span>
          )}
          {job.recruiterEmail ? (
            <span className="flex items-center gap-1.5 text-emerald-700">
              <Mail size={12} /> {job.recruiterEmail}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-600">
              <AlertCircle size={12} /> No recruiter email found
            </span>
          )}
        </div>

        {/* Description */}
        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-xs font-medium text-ink-sub mb-2">Job Description</p>
          <pre className="whitespace-pre-wrap font-sans text-sm text-ink-mid leading-relaxed">
            {job.jobDescription || 'No description available.'}
          </pre>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-edge flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary text-sm">Close</button>
          <button
            onClick={() => { onClose(); onApply(job) }}
            className="btn-primary text-sm"
          >
            <ChevronRight size={14} /> Apply with Paste & Apply
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function BotSearch() {
  const navigate = useNavigate()
  const logRef = useRef(null)

  const [jobTitle, setJobTitle]   = useState('')
  const [location, setLocation]   = useState('')
  const [running, setRunning]     = useState(false)
  const [stopping, setStopping]   = useState(false)
  const linkedinCookie = loadLocalSettings().linkedinCookie || ''
  const [results, setResults] = useState([])
  const [log, setLog] = useState([])
  const [summary, setSummary] = useState(null)
  const [viewJob, setViewJob] = useState(null)

  // On mount: check if bot is already running on backend (handles page reloads)
  useEffect(() => {
    botAPI.status().then(r => { if (r.running) setRunning(true) }).catch(() => {})
  }, [])

  // Pre-fill job title from resume on mount
  useEffect(() => {
    resumeAPI.get()
      .then(r => {
        const role = r?.resume?.analysis?.primaryRole
        if (role) setJobTitle(role)
      })
      .catch(() => {})
  }, [])

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [log])


  const addLog = msg => setLog(prev => [...prev, msg])

  const handleStop = async () => {
    setStopping(true)
    try {
      await botAPI.stop()
      toast('Stop signal sent — finishing current job then stopping.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setStopping(false)
    }
  }

  const handleRun = async () => {
    if (!jobTitle.trim()) { toast.error('Enter a job title first'); return }
    if (!linkedinCookie) toast('No li_at cookie set — recruiter names will be missing', { icon: '⚠️' })
    setRunning(true)
    setResults([])
    setLog([])
    setSummary(null)

    try {
      const done = await botAPI.run(
        jobTitle.trim(),
        location.trim() || '',
        job => setResults(prev => [...prev, job]),
        msg => msg && addLog(msg)
      )
      setSummary(done)
      toast.success(`Done — ${done.emailsFound} recruiter email${done.emailsFound !== 1 ? 's' : ''} found`)
    } catch (err) {
      toast.error(err.message)
      addLog(`Error: ${err.message}`)
    } finally {
      setRunning(false)
    }
  }

  const handleApply = (job) => {
    const jobText = [
      job.jobTitle,
      job.company && `Company: ${job.company}`,
      job.jobDescription
    ].filter(Boolean).join('\n\n')

    navigate('/applications', {
      state: {
        openPaste: true,
        jobText,
        recruiterEmail: job.recruiterEmail || ''
      }
    })
  }

  return (
    <div className="px-8 pt-9 pb-12 space-y-6 max-w-5xl">

      {/* Page header */}
      <div className="border-b border-edge pb-5">
        <h1 className="text-2xl font-bold text-ink leading-none tracking-tight flex items-center gap-2.5">
          <Bot size={22} className="text-brand" />
          Bot Search
        </h1>
        <p className="text-ink-sub text-sm mt-2">
          Automatically find jobs on LinkedIn, look up recruiter emails, and apply with one click.
        </p>
      </div>

      {/* Search config */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink">Search Configuration</h2>
          {linkedinCookie ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
              <CheckCircle2 size={11} /> Recruiter names active
            </span>
          ) : (
            <button onClick={() => navigate('/settings')} className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 hover:bg-amber-100 transition-colors">
              <AlertCircle size={11} /> Add li_at for recruiter names
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-ink-sub mb-1.5 font-medium flex items-center gap-1.5">
              <Briefcase size={12} /> Job Title
            </label>
            <input
              type="text"
              className="input-field"
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
              placeholder="Auto-detected from resume…"
              disabled={running}
            />
            <p className="text-xs text-ink-muted mt-1">Auto-filled from your uploaded resume</p>
          </div>

          <div>
            <label className="text-xs text-ink-sub mb-1.5 font-medium flex items-center gap-1.5">
              <MapPin size={12} /> Location <span className="text-ink-muted font-normal">(optional)</span>
            </label>
            <input
              type="text"
              className="input-field"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. London, Remote, New York…"
              disabled={running}
            />
            <p className="text-xs text-ink-muted mt-1">Leave blank to search all locations</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!running ? (
            <button onClick={handleRun} className="btn-primary">
              <Play size={14} /> Run Bot
            </button>
          ) : (
            <>
              <span className="flex items-center gap-2 text-sm text-ink-muted">
                <Loader2 size={14} className="animate-spin text-brand" />
                Bot running…
              </span>
              <button
                onClick={handleStop}
                disabled={stopping}
                className="btn-danger text-sm flex items-center gap-1.5"
              >
                {stopping
                  ? <Loader2 size={13} className="animate-spin" />
                  : <Square size={13} />}
                {stopping ? 'Stopping…' : 'Stop Bot'}
              </button>
            </>
          )}

          {summary && !running && (
            <span className="text-sm text-ink-muted">
              {summary.total} jobs · {summary.emailsFound} emails found
            </span>
          )}
        </div>
      </div>

      {/* Live log */}
      {(running || log.length > 0) && (
        <div className="card p-4 space-y-2">
          <p className="text-xs font-medium text-ink-sub">Bot Log</p>
          <div
            ref={logRef}
            className="bg-gray-950 rounded-lg p-3 h-36 overflow-y-auto font-mono text-xs text-emerald-400 space-y-0.5"
          >
            {log.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
            {running && <p className="animate-pulse">▋</p>}
          </div>
        </div>
      )}

      {/* Results table */}
      {results.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-edge flex items-center justify-between">
            <p className="text-sm font-medium text-ink">
              Results <span className="text-ink-muted font-normal">({results.length})</span>
            </p>
            {running && (
              <span className="text-xs text-ink-muted flex items-center gap-1.5">
                <Loader2 size={11} className="animate-spin" /> finding more…
              </span>
            )}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-edge text-xs text-ink-muted">
                <th className="text-left px-5 py-2.5 font-medium">#</th>
                <th className="text-left px-3 py-2.5 font-medium">Job Title</th>
                <th className="text-left px-3 py-2.5 font-medium">Company</th>
                <th className="text-left px-3 py-2.5 font-medium">Recruiter Email</th>
                <th className="text-right px-5 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map((job, i) => (
                <tr key={i} className="border-b border-edge last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-ink-muted text-xs">{i + 1}</td>
                  <td className="px-3 py-3">
                    <p className="text-ink font-medium leading-tight truncate max-w-[200px]">{job.jobTitle}</p>
                    {job.recruiterName && (
                      <p className="text-xs text-ink-muted mt-0.5 truncate max-w-[200px]">{job.recruiterName}</p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-ink-sub truncate max-w-[160px]">{job.company}</td>
                  <td className="px-3 py-3">
                    {job.recruiterEmail ? (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-700">
                        <CheckCircle2 size={11} className="shrink-0" />
                        {job.recruiterEmail}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-ink-muted">
                        <AlertCircle size={11} className="shrink-0" />
                        Not found
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {job.jobUrl && (
                        <a
                          href={job.jobUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-ghost p-1.5"
                          title="View job on LinkedIn"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button
                        onClick={() => setViewJob(job)}
                        className="btn-ghost p-1.5"
                        title="View details"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleApply(job)}
                        className="btn-primary text-xs py-1 px-2.5"
                        title="Apply with Paste & Apply"
                      >
                        Apply
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!running && results.length === 0 && log.length === 0 && (
        <div className="text-center py-16 text-ink-muted">
          <Bot size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Configure your search above and click Run Bot</p>
          <p className="text-xs mt-1 opacity-70">The bot will scrape LinkedIn and look up recruiter emails automatically</p>
        </div>
      )}

      {/* Job detail modal */}
      {viewJob && (
        <JobModal
          job={viewJob}
          onClose={() => setViewJob(null)}
          onApply={handleApply}
        />
      )}
    </div>
  )
}
