import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  Search, ExternalLink, MapPin, Briefcase, Tag,
  Sparkles, FileText, BookmarkPlus, X,
  Clock, RefreshCw, ChevronDown, Zap, Copy, Check,
  Globe, Building2, Shuffle, Wifi, Send, Mail,
  Download, CheckCircle2, AlertCircle, Loader2,
  SkipForward, Trophy, PenLine
} from 'lucide-react'
import { jobsAPI, applicationsAPI } from '../api/client'

// ─── Constants ────────────────────────────────────────────────────────────────

const LOCATION_TYPES = [
  { value: 'any',    label: 'Any',     icon: Globe,     color: 'text-ink-muted' },
  { value: 'remote', label: 'Remote',  icon: Wifi,      color: 'text-emerald-600' },
  { value: 'hybrid', label: 'Hybrid',  icon: Shuffle,   color: 'text-amber-600' },
  { value: 'onsite', label: 'On-site', icon: Building2, color: 'text-sky-600' }
]

const SOURCE_BADGE = {
  Remotive: 'badge-cyan', Arbeitnow: 'badge-blue', Jobicy: 'badge-purple',
  Himalayas: 'badge-indigo', 'The Muse': 'badge-yellow',
  WeWorkRemotely: 'badge-green', Indeed: 'badge-red', LinkedIn: 'badge-blue',
  'JSearch (LinkedIn/Indeed/Glassdoor)': 'badge-purple'
}
const LOC_BADGE = { remote: 'badge-green', hybrid: 'badge-yellow', onsite: 'badge-blue', any: 'badge-gray' }

const APPLY_STEPS = [
  { key: 'match',     label: 'Analyzing job match',          icon: Zap },
  { key: 'tailor',   label: 'Tailoring resume',             icon: FileText },
  { key: 'cover',    label: 'Writing cover letter',         icon: PenLine },
  { key: 'email_gen',label: 'Generating application email', icon: Mail },
  { key: 'send',     label: 'Sending application',          icon: Send }
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jobKey(job) {
  if (!job) return ''
  if (job.url) return job.url.trim()
  return `${(job.title || '').toLowerCase().trim()}|${(job.company || '').toLowerCase().trim()}`
}

function downloadText(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function ScoreBadge({ score }) {
  if (score == null) return null
  const cls = score >= 75 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : score >= 50 ? 'bg-amber-50 text-amber-700 border border-amber-200'
            : 'bg-red-50 text-red-700 border border-red-200'
  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${cls}`}>
      <Zap size={10} />{score}% match
    </span>
  )
}

// ─── Apply Modal ──────────────────────────────────────────────────────────────

function ApplyModal({ job, onClose, onApplied }) {
  const [phase, setPhase]           = useState('input')
  const [recruiterEmail, setEmail]  = useState('')
  const [steps, setSteps]           = useState({})
  const [result, setResult]         = useState(null)
  const [copyWhich, setCopyWhich]   = useState(null)
  const [tab, setTab]               = useState('cover')
  const [pdfLoading, setPdfLoading] = useState(false)

  const updateStep = (key, status) =>
    setSteps(prev => ({ ...prev, [key]: status }))

  const handleStart = async () => {
    setPhase('running')
    setSteps({})
    setResult(null)
    try {
      const data = await jobsAPI.apply(job, recruiterEmail.trim(), ({ key, status }) => {
        updateStep(key, status)
      })
      setResult(data)
      setPhase('done')
      onApplied?.(job)
      if (data.emailSent) toast.success(`Application sent to ${job.company}!`)
    } catch (err) {
      toast.error(err.message)
      setPhase('input')
    }
  }

  const copy = (text, which) => {
    navigator.clipboard.writeText(text)
    setCopyWhich(which)
    setTimeout(() => setCopyWhich(null), 2000)
  }

  const stepIcon = (key) => {
    const s = steps[key]
    if (s === 'loading') return <Loader2 size={15} className="text-brand animate-spin" />
    if (s === 'done')    return <CheckCircle2 size={15} className="text-emerald-500" />
    if (s === 'error')   return <AlertCircle size={15} className="text-red-500" />
    if (s === 'skipped') return <SkipForward size={15} className="text-amber-500" />
    return <div className="w-3.5 h-3.5 rounded-full border-2 border-edge" />
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-xl flex flex-col card shadow-2xl max-h-[92vh]">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-edge">
          <div>
            <h2 className="font-bold text-ink text-lg">Apply to {job.title}</h2>
            <p className="text-sm text-ink-muted mt-0.5">{job.company} · {job.location}</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 mt-0.5"><X size={16} /></button>
        </div>

        {/* ── Phase: input ────────────────────────────────────────────── */}
        {phase === 'input' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div className="bg-brand-light border border-edge-active rounded-lg p-4 text-sm space-y-1.5">
              <p className="font-semibold text-brand">What happens when you click Apply:</p>
              {APPLY_STEPS.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-ink-sub">
                  <Icon size={13} className="text-brand shrink-0" /> {label}
                </div>
              ))}
            </div>

            <div>
              <label className="text-sm text-ink-sub mb-1.5 block">
                Recruiter email <span className="text-ink-muted">(optional — skip to get downloadable docs)</span>
              </label>
              <input
                type="email"
                className="input-field"
                value={recruiterEmail}
                onChange={e => setEmail(e.target.value)}
                placeholder="recruiter@company.com"
                autoFocus
              />
            </div>

            {!recruiterEmail && (
              <p className="text-xs text-amber-700 flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertCircle size={13} />
                Without an email, the app will prepare all documents and let you download them to apply manually.
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={handleStart} className="btn-primary flex-1 justify-center">
                <Zap size={15} /> Start Apply
              </button>
            </div>
          </div>
        )}

        {/* ── Phase: running ──────────────────────────────────────────── */}
        {phase === 'running' && (
          <div className="flex-1 p-6 space-y-3">
            <p className="text-sm text-ink-sub mb-4">Working through your application…</p>
            {APPLY_STEPS.map(({ key, label }) => {
              const s = steps[key]
              return (
                <div
                  key={key}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    s === 'loading' ? 'bg-brand-light border border-edge-active'
                  : s === 'done'   ? 'bg-emerald-50 border border-emerald-200'
                  : s === 'error'  ? 'bg-red-50 border border-red-200'
                  : s === 'skipped'? 'bg-amber-50 border border-amber-200'
                  : 'bg-gray-50 border border-transparent'
                  }`}
                >
                  {stepIcon(key)}
                  <span className={`text-sm ${s ? 'text-ink' : 'text-ink-muted'}`}>{label}</span>
                  {s === 'done'    && <span className="ml-auto text-xs text-emerald-600">Done</span>}
                  {s === 'error'   && <span className="ml-auto text-xs text-red-600">Failed</span>}
                  {s === 'skipped' && <span className="ml-auto text-xs text-amber-600">Skipped</span>}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Phase: done ─────────────────────────────────────────────── */}
        {phase === 'done' && result && (
          <div className="flex-1 overflow-y-auto">
            {/* Result banner */}
            <div className={`px-5 py-4 border-b border-edge flex items-center gap-3 ${
              result.emailSent ? 'bg-emerald-50' : 'bg-amber-50'
            }`}>
              {result.emailSent
                ? <><Trophy size={18} className="text-emerald-600 shrink-0" /><div><p className="font-semibold text-emerald-700 text-sm">Application sent!</p><p className="text-xs text-emerald-600 mt-0.5">Email delivered with tailored resume & cover letter.</p></div></>
                : <><AlertCircle size={18} className="text-amber-600 shrink-0" /><div><p className="font-semibold text-amber-700 text-sm">Couldn't send email — download documents below</p><p className="text-xs text-amber-600 mt-0.5">{result.emailError}</p></div></>
              }
            </div>

            <div className="p-5 space-y-4">
              {/* Match summary */}
              {result.match && (
                <div className="flex items-center gap-4 bg-gray-50 border border-edge rounded-lg p-3">
                  <div>
                    <span className={`text-3xl font-black ${result.match.score >= 75 ? 'text-emerald-600' : result.match.score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                      {result.match.score}%
                    </span>
                    <p className="text-xs text-ink-muted mt-0.5">match score</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    {result.match.missingSkills?.length > 0 && (
                      <p className="text-xs text-ink-sub">
                        <span className="text-amber-600 font-medium">Gaps addressed:</span>{' '}
                        {result.match.missingSkills.join(', ')}
                      </p>
                    )}
                    {result.match.recommendation && (
                      <p className="text-xs text-ink-muted mt-1 line-clamp-2">{result.match.recommendation}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Document tabs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
                    {[{ key: 'cover', label: 'Cover Letter' }, { key: 'resume', label: 'Tailored Resume' }].map(t => (
                      <button key={t.key} onClick={() => setTab(t.key)}
                        className={`px-3 py-1.5 text-xs rounded-md transition-all font-medium ${tab === t.key ? 'bg-white text-ink shadow-sm' : 'text-ink-muted hover:text-ink-sub'}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => copy(tab === 'cover' ? result.coverLetter : result.tailoredResume, tab)} className="btn-ghost text-xs">
                    {copyWhich === tab ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    {copyWhich === tab ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="bg-gray-50 border border-edge rounded-lg p-3 max-h-44 overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-sans text-xs text-ink-mid leading-relaxed">
                    {tab === 'cover' ? result.coverLetter : result.tailoredResume}
                  </pre>
                </div>
              </div>

              {/* Download buttons */}
              <div className="space-y-2">
                <button
                  onClick={async () => {
                    setPdfLoading(true)
                    try {
                      await jobsAPI.downloadResumePDF(result.tailoredResume, result.match?.name)
                      toast.success('Resume PDF downloaded!')
                    } catch (err) {
                      toast.error(err.message)
                    } finally { setPdfLoading(false) }
                  }}
                  disabled={pdfLoading}
                  className="btn-primary w-full justify-center text-sm py-2.5"
                >
                  {pdfLoading
                    ? <><RefreshCw size={14} className="animate-spin" /> Generating PDF…</>
                    : <><FileText size={14} /> Download Resume as PDF</>}
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => downloadText(result.coverLetter, `CoverLetter_${job.company?.replace(/\s+/g,'_')}.txt`)}
                    className="btn-secondary flex-1 justify-center text-sm"
                  >
                    <Download size={13} /> Cover Letter (.txt)
                  </button>
                  {result.jobUrl && (
                    <a href={result.jobUrl} target="_blank" rel="noreferrer" className="btn-secondary text-sm flex items-center gap-2 shrink-0">
                      <ExternalLink size={13} /> Apply on Site
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Other Modals ─────────────────────────────────────────────────────────────

function TextModal({ title, content, job, type, onClose, onSave }) {
  const [copied, setCopied]      = useState(false)
  const [saving, setSaving]      = useState(false)
  const [pdfLoading, setPdfLoad] = useState(false)

  const copy = () => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  const save = async () => {
    setSaving(true)
    try {
      await applicationsAPI.create({ job, [type === 'cover' ? 'coverLetter' : 'tailoredResume']: content })
      toast.success('Saved to applications!')
      onSave?.()
    } catch (err) { toast.error(err.message) }
    finally { setSaving(false) }
  }
  const downloadPDF = async () => {
    setPdfLoad(true)
    try {
      await jobsAPI.downloadResumePDF(content)
      toast.success('PDF downloaded!')
    } catch (err) { toast.error(err.message) }
    finally { setPdfLoad(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col card shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-edge">
          <div>
            <h3 className="font-semibold text-ink">{title}</h3>
            <p className="text-xs text-ink-muted">{job.company}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={copy} className="btn-ghost text-xs">
              {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            {type !== 'cover' && (
              <button onClick={downloadPDF} disabled={pdfLoading} className="btn-ghost text-xs text-brand hover:text-brand-dark">
                {pdfLoading ? <RefreshCw size={12} className="animate-spin" /> : <FileText size={12} />}
                {pdfLoading ? 'Generating…' : 'PDF'}
              </button>
            )}
            <button
              onClick={() => downloadText(content, type === 'cover' ? `CoverLetter_${job.company}.txt` : `Resume_${job.title}.txt`)}
              className="btn-ghost text-xs"
            >
              <Download size={12} /> .txt
            </button>
            <button onClick={onClose} className="btn-ghost p-1.5"><X size={15} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <pre className="whitespace-pre-wrap font-sans text-sm text-ink-mid leading-relaxed">{content}</pre>
        </div>
        <div className="p-4 border-t border-edge flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary text-sm">Close</button>
          <button onClick={save} disabled={saving} className="btn-primary text-sm">
            {saving ? <RefreshCw size={13} className="animate-spin" /> : <BookmarkPlus size={13} />}
            Save to Applications
          </button>
        </div>
      </div>
    </div>
  )
}

function MatchModal({ match, job, onClose }) {
  const score = match.score || 0
  const color = score >= 75 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg card shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-edge">
          <h3 className="font-semibold text-ink">Match Analysis</h3>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={15} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="text-center">
            <div className="text-5xl font-black" style={{ color }}>{score}%</div>
            <p className="text-ink-sub text-sm mt-1">{job.title} at {job.company}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 border border-edge rounded-lg p-3">
              <p className="text-xs text-ink-muted mb-2 font-medium">Matched Skills</p>
              {match.matchedSkills?.length > 0
                ? match.matchedSkills.map(s => <div key={s} className="badge-green mb-1">{s}</div>)
                : <p className="text-xs text-ink-muted">None detected</p>}
            </div>
            <div className="bg-gray-50 border border-edge rounded-lg p-3">
              <p className="text-xs text-ink-muted mb-2 font-medium">Missing Skills</p>
              {match.missingSkills?.length > 0
                ? match.missingSkills.map(s => <div key={s} className="badge-red mb-1">{s}</div>)
                : <p className="text-xs text-ink-muted">None missing</p>}
            </div>
          </div>
          {match.recommendation && (
            <div className="bg-gray-50 border border-edge rounded-lg p-3 text-sm text-ink-sub">{match.recommendation}</div>
          )}
        </div>
        <div className="p-4 border-t border-edge flex justify-end">
          <button onClick={onClose} className="btn-secondary text-sm">Close</button>
        </div>
      </div>
    </div>
  )
}

// ─── Job Card ─────────────────────────────────────────────────────────────────

function JobCard({ job, onAction, isApplied }) {
  const [expanded, setExpanded] = useState(false)
  const dateStr = job.postedAt
    ? (() => { try { return new Date(job.postedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) } catch { return '' } })()
    : ''

  return (
    <div className={`card-hover p-4 space-y-3 ${isApplied ? 'border-emerald-200' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-brand-light border border-edge-active flex items-center justify-center shrink-0 text-sm font-bold text-brand">
          {(job.company || '?')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-ink text-sm leading-snug">{job.title}</h3>
              {isApplied && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
                  <CheckCircle2 size={10} /> Applied
                </span>
              )}
            </div>
            <ScoreBadge score={job.matchScore} />
          </div>
          <p className="text-sm text-ink-muted mt-0.5">{job.company}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-muted">
        <span className="flex items-center gap-1"><MapPin size={11} />{job.location}</span>
        <span className={LOC_BADGE[job.locationType] || 'badge-gray'}>{job.locationType || 'unknown'}</span>
        {job.salary && <span className="text-emerald-600 font-medium">{job.salary}</span>}
        {dateStr && <span className="flex items-center gap-1"><Clock size={11} />{dateStr}</span>}
        <span className={SOURCE_BADGE[job.source] || 'badge-gray'}>{job.source}</span>
      </div>

      {job.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {job.tags.slice(0, 5).map((tag, i) => (
            <span key={i} className="text-xs bg-gray-100 text-ink-muted px-2 py-0.5 rounded flex items-center gap-1">
              <Tag size={9} />{tag}
            </span>
          ))}
        </div>
      )}

      {job.description && (
        <div className="text-xs text-ink-muted leading-relaxed">
          <p className={expanded ? '' : 'line-clamp-2'}>{job.description.substring(0, expanded ? 600 : 200)}</p>
          {job.description.length > 200 && (
            <button onClick={() => setExpanded(!expanded)} className="text-brand hover:text-brand-dark mt-0.5 flex items-center gap-0.5">
              {expanded ? 'Less' : 'More'} <ChevronDown size={10} className={expanded ? 'rotate-180' : ''} />
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-edge-soft">
        <button
          onClick={() => onAction('apply', job)}
          className="btn-primary text-xs py-1.5 px-3"
        >
          <Zap size={12} /> Apply Now
        </button>

        <button onClick={() => onAction('match', job)} className="btn-ghost text-xs">
          <Zap size={11} className="text-amber-500" /> Match
        </button>
        <button onClick={() => onAction('tailor', job)} className="btn-ghost text-xs">
          <FileText size={11} className="text-brand" /> Tailor
        </button>
        <button onClick={() => onAction('cover', job)} className="btn-ghost text-xs">
          <Sparkles size={11} className="text-violet-500" /> Cover Letter
        </button>
        <button onClick={() => onAction('save', job)} className="btn-ghost text-xs">
          <BookmarkPlus size={11} className="text-emerald-500" /> Save
        </button>
        <a href={job.url} target="_blank" rel="noreferrer" className="btn-ghost text-xs ml-auto text-brand hover:text-brand-dark">
          View <ExternalLink size={11} />
        </a>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JobDiscovery() {
  const [jobs, setJobs]               = useState([])
  const [loading, setLoading]         = useState(false)
  const [searched, setSearched]       = useState(false)
  const [modal, setModal]             = useState(null)
  const [applyJob, setApplyJob]       = useState(null)
  const [appliedJobs, setAppliedJobs] = useState(new Set())
  const [visibleCount, setVisibleCount] = useState(30)

  const [keywords, setKeywords]      = useState('')
  const [locationType, setLocType]   = useState('any')
  const [location, setLocation]      = useState('')
  const [filterSource, setFSource]   = useState('all')
  const [filterLocType, setFLocType] = useState('all')

  useEffect(() => {
    applicationsAPI.list().then(r => {
      const keys = new Set((r.applications || []).map(a => jobKey(a.job)))
      setAppliedJobs(keys)
    }).catch(() => {})
  }, [])

  const handleSearch = async () => {
    setLoading(true); setSearched(false)
    const tid = toast.loading('Searching across job boards…')
    try {
      const result = await jobsAPI.search({ keywords, locationType, location })
      setJobs(result.jobs || [])
      setSearched(true); setFSource('all'); setFLocType('all'); setVisibleCount(30)
      toast.success(`Found ${result.total} jobs`, { id: tid })
    } catch (err) {
      toast.error(err.message, { id: tid })
    } finally { setLoading(false) }
  }

  const handleAction = async (type, job) => {
    if (type === 'apply') { setApplyJob(job); return }
    if (type === 'save') {
      try { await applicationsAPI.create({ job }); toast.success('Saved!') }
      catch (err) { toast.error(err.message) }
      return
    }
    const labels = { match: 'Analyzing…', tailor: 'Tailoring…', cover: 'Writing…' }
    const tid = toast.loading(labels[type])
    try {
      if (type === 'match') {
        const r = await jobsAPI.match(job)
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, matchScore: r.score } : j))
        setModal({ type: 'match', data: r, job }); toast.dismiss(tid)
      } else if (type === 'tailor') {
        const r = await jobsAPI.tailor(job)
        setModal({ type: 'tailor', data: r.tailoredResume, job }); toast.dismiss(tid)
      } else if (type === 'cover') {
        const r = await jobsAPI.coverLetter(job)
        setModal({ type: 'cover', data: r.coverLetter, job }); toast.dismiss(tid)
      }
    } catch (err) { toast.error(err.message, { id: tid }) }
  }

  const sources  = [...new Set(jobs.map(j => j.source).filter(Boolean))]
  const locTypes = [...new Set(jobs.map(j => j.locationType).filter(Boolean))]
  const filtered = jobs.filter(j =>
    (filterSource  === 'all' || j.source      === filterSource) &&
    (filterLocType === 'all' || j.locationType === filterLocType)
  )
  const visible = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  return (
    <div className="min-h-full">

      {/* Page header */}
      <div className="px-8 pt-9 border-b border-edge bg-white">
        <div className="pb-5">
          <h1 className="text-2xl font-bold text-ink leading-none tracking-tight">Discover</h1>
          <p className="text-ink-sub text-sm mt-1.5">Search LinkedIn, Indeed, Remotive, WeWorkRemotely, and more</p>
        </div>
      </div>

      <div className="px-8 pt-6 pb-12 max-w-5xl space-y-5">

        {/* Search form */}
        <div className="card p-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text" value={keywords} onChange={e => setKeywords(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Keywords (e.g. React developer, Product Manager…)"
                className="input-field pl-9"
              />
            </div>
            <button onClick={handleSearch} disabled={loading} className="btn-primary shrink-0 px-6">
              {loading ? <RefreshCw size={15} className="animate-spin" /> : <Search size={15} />}
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>

          <div className="flex gap-2 flex-wrap">
            <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
              {LOCATION_TYPES.map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value} onClick={() => setLocType(value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    locationType === value
                      ? 'bg-white text-ink shadow-sm'
                      : 'text-ink-muted hover:text-ink-sub'
                  }`}
                >
                  <Icon size={12} className={locationType === value ? color : ''} /> {label}
                </button>
              ))}
            </div>
            <div className="relative flex-1 min-w-[200px]">
              <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input
                type="text" value={location} onChange={e => setLocation(e.target.value)}
                placeholder={locationType === 'remote' ? 'Location preference (e.g. US only)' : 'City, Country (e.g. London, UK)'}
                className="input-field pl-8 text-xs py-2"
              />
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <RefreshCw size={32} className="text-brand animate-spin mx-auto mb-3" />
            <p className="text-ink font-medium">Searching across the web…</p>
            <p className="text-ink-muted text-sm mt-1">LinkedIn · Indeed · Remotive · WeWorkRemotely · and more</p>
          </div>
        )}

        {!loading && searched && jobs.length === 0 && (
          <div className="text-center py-16 card">
            <Search size={32} className="text-ink-faint mx-auto mb-3" />
            <p className="text-ink-sub font-medium">No jobs found</p>
            <p className="text-ink-muted text-sm mt-1">Try different keywords or change location type</p>
          </div>
        )}

        {!loading && !searched && (
          <div className="text-center py-16">
            <Globe size={44} className="text-ink-faint mx-auto mb-4" />
            <p className="text-ink-sub font-medium">Enter keywords and click Search</p>
            <p className="text-ink-muted text-sm mt-1">Searches LinkedIn, Indeed, Remotive, and 5+ more boards simultaneously</p>
          </div>
        )}

        {/* Results */}
        {!loading && jobs.length > 0 && (
          <>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-ink-sub">
                {visible.length} of {filtered.length} jobs
              </span>
              {sources.length > 1 && (
                <select value={filterSource} onChange={e => { setFSource(e.target.value); setVisibleCount(30) }}
                  className="bg-white border border-edge text-xs text-ink-mid rounded-md px-2.5 py-1.5 focus:outline-none focus:border-accent">
                  <option value="all">All sources</option>
                  {sources.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
              {locTypes.length > 1 && (
                <select value={filterLocType} onChange={e => { setFLocType(e.target.value); setVisibleCount(30) }}
                  className="bg-white border border-edge text-xs text-ink-mid rounded-md px-2.5 py-1.5 focus:outline-none focus:border-accent">
                  <option value="all">All types</option>
                  {locTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
              <button onClick={handleSearch} className="btn-ghost text-xs ml-auto">
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            <div className="grid gap-3">
              {visible.map(job => (
                <JobCard
                  key={job.id}
                  job={job}
                  onAction={handleAction}
                  isApplied={appliedJobs.has(jobKey(job))}
                />
              ))}
            </div>

            {hasMore && (
              <div className="flex flex-col items-center gap-2 pt-2">
                <button
                  onClick={() => setVisibleCount(c => c + 30)}
                  className="btn-secondary px-8"
                >
                  Load 30 more
                </button>
                <p className="text-xs text-ink-muted">
                  {filtered.length - visibleCount} remaining
                </p>
              </div>
            )}

            {!hasMore && filtered.length > 30 && (
              <p className="text-center text-xs text-ink-muted pt-2">
                All {filtered.length} jobs shown
              </p>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {modal?.type === 'match' && <MatchModal match={modal.data} job={modal.job} onClose={() => setModal(null)} />}
      {(modal?.type === 'tailor' || modal?.type === 'cover') && (
        <TextModal
          title={modal.type === 'tailor' ? `Tailored Resume — ${modal.job.title}` : `Cover Letter — ${modal.job.title}`}
          content={modal.data} job={modal.job} type={modal.type}
          onClose={() => setModal(null)} onSave={() => setModal(null)}
        />
      )}
      {applyJob && (
        <ApplyModal
          job={applyJob}
          onClose={() => setApplyJob(null)}
          onApplied={(job) => {
            setAppliedJobs(prev => new Set([...prev, jobKey(job)]))
            setApplyJob(null)
          }}
        />
      )}
    </div>
  )
}
