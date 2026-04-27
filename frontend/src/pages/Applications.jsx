import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  ClipboardList, ExternalLink, Trash2, X,
  FileText, Mail, Send, RefreshCw, Eye, ChevronDown,
  CheckCircle2, Clock, XCircle, Trophy, Bookmark, Copy, Check,
  PlayCircle, Download, FileDown, AlertCircle, Loader2, Wand2,
  ClipboardPaste, MessageSquare, Zap
} from 'lucide-react'
import { applicationsAPI, jobsAPI } from '../api/client'

const STATUSES = [
  { value: 'saved',     label: 'Saved',     icon: Bookmark,  cls: 'badge-gray',   dotCls: 'bg-gray-400' },
  { value: 'applied',   label: 'Applied',   icon: Send,      cls: 'badge-blue',   dotCls: 'bg-blue-400' },
  { value: 'interview', label: 'Interview', icon: Clock,     cls: 'badge-green',  dotCls: 'bg-emerald-400' },
  { value: 'offer',     label: 'Offer',     icon: Trophy,    cls: 'badge-purple', dotCls: 'bg-violet-400' },
  { value: 'rejected',  label: 'Rejected',  icon: XCircle,   cls: 'badge-red',    dotCls: 'bg-red-400' }
]

const PASTE_STEPS = [
  { key: 'parse',     label: 'Reading job details' },
  { key: 'match',     label: 'Analyzing job match' },
  { key: 'tailor',    label: 'Tailoring resume' },
  { key: 'cover',     label: 'Writing cover letter' },
  { key: 'email_gen', label: 'Drafting application email' },
  { key: 'send',      label: 'Sending application' }
]

const APPLY_STEPS = [
  { key: 'match',     label: 'Analyzing job match' },
  { key: 'tailor',    label: 'Tailoring resume' },
  { key: 'cover',     label: 'Writing cover letter' },
  { key: 'email_gen', label: 'Drafting application email' },
  { key: 'send',      label: 'Sending application' }
]

// ─── Tab config ───────────────────────────────────────────────────────────────

const TABS = [
  { key: 'all',      label: 'All',         icon: ClipboardList },
  { key: 'board',    label: 'Job Boards',  icon: Zap },
  { key: 'manual',   label: 'Manual',      icon: ClipboardPaste },
  { key: 'whatsapp', label: 'WhatsApp Bot',icon: MessageSquare },
]

function filterByTab(apps, tab) {
  if (tab === 'all') return apps
  if (tab === 'manual') return apps.filter(a => a.applicationMethod === 'pasted')
  if (tab === 'whatsapp') return apps.filter(a => a.applicationMethod === 'whatsapp')
  return apps.filter(a => !a.applicationMethod || a.applicationMethod === 'board')
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StepList({ steps, stepDefs }) {
  return (
    <div className="space-y-2">
      {stepDefs.map(s => {
        const st = steps[s.key]
        return (
          <div key={s.key} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
            !st                    ? 'border-edge bg-gray-50 opacity-40' :
            st.status === 'loading'  ? 'border-edge-active bg-brand-light' :
            st.status === 'done'     ? 'border-emerald-200 bg-emerald-50' :
            st.status === 'skipped'  ? 'border-amber-200 bg-amber-50' :
                                       'border-red-200 bg-red-50'
          }`}>
            <div className="w-5 h-5 flex items-center justify-center shrink-0">
              {!st                    ? <div className="w-2 h-2 rounded-full bg-edge" /> :
               st.status === 'loading'  ? <Loader2 size={13} className="animate-spin text-brand" /> :
               st.status === 'done'     ? <CheckCircle2 size={13} className="text-emerald-500" /> :
               st.status === 'skipped'  ? <AlertCircle size={13} className="text-amber-500" /> :
                                          <XCircle size={13} className="text-red-500" />}
            </div>
            <p className="text-sm text-ink">{s.label}</p>
            {st?.message && <p className="text-xs text-ink-muted ml-auto max-w-[200px] text-right truncate">{st.message}</p>}
          </div>
        )
      })}
    </div>
  )
}

// ─── Result panel (shared by both modals) ─────────────────────────────────────

function ResultPanel({ result, job, onClose, onReload }) {
  const [tab, setTab] = useState('cover')
  const [dlLoading, setDlLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const content = tab === 'cover' ? result.coverLetter : result.tailoredResume

  const copy = () => {
    navigator.clipboard.writeText(content || '')
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const downloadTxt = () => {
    const blob = new Blob([content || ''], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const name = tab === 'cover'
      ? `Cover_Letter_${(result.job?.company || job?.company || 'Company').replace(/\s+/g,'_')}.txt`
      : `Tailored_Resume_${(result.job?.company || job?.company || 'Company').replace(/\s+/g,'_')}.txt`
    a.href = url; a.download = name; a.click()
    URL.revokeObjectURL(url)
  }

  const downloadPDF = async () => {
    if (!result.tailoredResume) return
    setDlLoading(true)
    try { await jobsAPI.downloadResumePDF(result.tailoredResume, result.job?.company || job?.company) }
    catch (err) { toast.error('PDF failed: ' + err.message) }
    finally { setDlLoading(false) }
  }

  return (
    <>
      {/* Match + status */}
      <div className="p-4 border-b border-edge flex items-center gap-4">
        <div>
          <div className="text-2xl font-bold text-brand">{result.match?.score ?? '—'}%</div>
          <div className="text-xs text-ink-muted">match</div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink truncate">{result.job?.title || job?.title}</p>
          <p className="text-xs text-ink-muted">{result.job?.company || job?.company}</p>
          {result.emailSent
            ? <p className="text-xs text-emerald-600 mt-0.5">Application email sent</p>
            : <p className="text-xs text-amber-600 mt-0.5">{result.emailError || 'Download documents below'}</p>
          }
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-3 border-b border-edge pb-2">
        {['cover', 'resume'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${tab === t ? 'bg-brand-light text-brand font-medium' : 'text-ink-muted hover:text-ink-sub'}`}>
            {t === 'cover' ? 'Cover Letter' : 'Tailored Resume'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <pre className="whitespace-pre-wrap font-sans text-sm text-ink-mid leading-relaxed">{content}</pre>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-edge flex flex-wrap gap-2 justify-end">
        <button onClick={() => { onReload?.(); onClose() }} className="btn-secondary text-xs">Done</button>
        {(result.job?.url || result.jobUrl) && (
          <a href={result.job?.url || result.jobUrl} target="_blank" rel="noreferrer" className="btn-secondary text-xs">
            <ExternalLink size={12} /> Job Page
          </a>
        )}
        <button onClick={copy} className="btn-secondary text-xs">
          {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button onClick={downloadTxt} className="btn-secondary text-xs"><FileDown size={12} /> .txt</button>
        <button onClick={downloadPDF} disabled={dlLoading} className="btn-primary text-xs">
          {dlLoading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
          PDF
        </button>
      </div>
    </>
  )
}

// ─── Paste & Apply Modal ──────────────────────────────────────────────────────

function PasteModal({ onClose, onDone }) {
  const [phase, setPhase] = useState('input')
  const [jobText, setJobText] = useState('')
  const [recruiterEmail, setRecruiterEmail] = useState('')
  const [steps, setSteps] = useState({})
  const [result, setResult] = useState(null)

  const handleApply = async () => {
    if (!jobText.trim()) { toast.error('Paste a job description first'); return }
    setPhase('running')
    setSteps({})
    try {
      const res = await jobsAPI.pasteApply(jobText, recruiterEmail || null, (step) => {
        setSteps(prev => ({ ...prev, [step.key]: step }))
      })
      setResult(res)
      setPhase('done')
      if (res.emailSent) toast.success(`Application sent to ${res.job?.company || 'company'}!`)
    } catch (err) {
      toast.error(err.message)
      setPhase('input')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl flex flex-col card shadow-2xl max-h-[92vh]">

        <div className="flex items-center justify-between p-4 border-b border-edge">
          <div>
            <h3 className="font-semibold text-ink flex items-center gap-2">
              <ClipboardPaste size={16} className="text-brand" /> Paste & Apply
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">Paste any job description — AI handles the rest</p>
          </div>
          {phase !== 'running' && <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>}
        </div>

        {/* INPUT */}
        {phase === 'input' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="text-xs text-ink-sub mb-1.5 block font-medium">Job Description</label>
                <textarea
                  className="input-field font-mono text-xs leading-relaxed"
                  rows={12}
                  value={jobText}
                  onChange={e => setJobText(e.target.value)}
                  placeholder="Paste the full job posting here — include the title, company, description, requirements, and any contact email or application URL..."
                  autoFocus
                />
                <p className="text-xs text-ink-muted mt-1">
                  Paste as much as possible. AI extracts: title, company, email, link, skills.
                </p>
              </div>
              <div>
                <label className="text-xs text-ink-sub mb-1 block">Recruiter Email <span className="text-ink-muted">(optional — overrides any found in the text)</span></label>
                <input
                  type="email"
                  className="input-field"
                  value={recruiterEmail}
                  onChange={e => setRecruiterEmail(e.target.value)}
                  placeholder="recruiter@company.com"
                />
              </div>
            </div>
            <div className="p-4 border-t border-edge flex gap-2 justify-end">
              <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
              <button onClick={handleApply} disabled={!jobText.trim()} className="btn-primary text-sm">
                <Zap size={14} /> Apply Now
              </button>
            </div>
          </>
        )}

        {/* RUNNING */}
        {phase === 'running' && (
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-sm text-ink-sub mb-4">Processing your application…</p>
            <StepList steps={steps} stepDefs={PASTE_STEPS} />
          </div>
        )}

        {/* DONE */}
        {phase === 'done' && result && (
          <ResultPanel result={result} onClose={onClose} onReload={onDone} />
        )}
      </div>
    </div>
  )
}

// ─── Apply Again Modal ────────────────────────────────────────────────────────

function ApplyModal({ application, onClose, onDone }) {
  const [phase, setPhase] = useState('input')
  const [recruiterEmail, setRecruiterEmail] = useState('')
  const [steps, setSteps] = useState({})
  const [result, setResult] = useState(null)
  const [dlLoading, setDlLoading] = useState(false)

  const handleApply = async () => {
    setPhase('running')
    setSteps({})
    try {
      const res = await jobsAPI.apply(application.job, recruiterEmail || null, (step) => {
        setSteps(prev => ({ ...prev, [step.key]: step }))
      })
      setResult(res)
      setPhase('done')
      if (res.emailSent) toast.success(`Application sent to ${application.job?.company}!`)
    } catch (err) {
      toast.error(err.message)
      setPhase('input')
    }
  }

  const downloadPDF = async () => {
    const resumeText = result?.tailoredResume
    if (!resumeText) return
    setDlLoading(true)
    try { await jobsAPI.downloadResumePDF(resumeText, application.job?.company) }
    catch (err) { toast.error('PDF failed: ' + err.message) }
    finally { setDlLoading(false) }
  }

  const downloadTxt = (content, filename) => {
    const blob = new Blob([content || ''], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-xl flex flex-col card shadow-2xl max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-edge">
          <div>
            <h3 className="font-semibold text-ink">Apply Again</h3>
            <p className="text-xs text-ink-muted">{application.job?.title} · {application.job?.company}</p>
          </div>
          {phase !== 'running' && <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>}
        </div>

        {phase === 'input' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-1.5">
                {APPLY_STEPS.map(s => (
                  <div key={s.key} className="flex items-center gap-2 text-sm text-ink-muted">
                    <div className="w-1.5 h-1.5 rounded-full bg-edge flex-shrink-0" />
                    {s.label}
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs text-ink-sub mb-1 block">Recruiter Email (optional)</label>
                <input type="email" className="input-field" value={recruiterEmail}
                  onChange={e => setRecruiterEmail(e.target.value)} placeholder="recruiter@company.com" />
                <p className="text-xs text-ink-muted mt-1">Leave blank to skip email</p>
              </div>
            </div>
            <div className="p-4 border-t border-edge flex justify-end gap-2">
              <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
              <button onClick={handleApply} className="btn-primary text-sm">
                <PlayCircle size={13} /> Start Apply
              </button>
            </div>
          </>
        )}

        {phase === 'running' && (
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-sm text-ink-sub mb-4">Processing…</p>
            <StepList steps={steps} stepDefs={APPLY_STEPS} />
          </div>
        )}

        {phase === 'done' && result && (
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 border-b border-edge">
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-brand">{result.match?.score ?? '—'}%</div>
                  <div>
                    <p className="text-sm font-medium text-ink">Match Score</p>
                    {result.emailSent
                      ? <p className="text-xs text-emerald-600">Application sent successfully</p>
                      : <p className="text-xs text-amber-600">{result.emailError || 'Download documents below'}</p>
                    }
                  </div>
                </div>
              </div>
              <div className="flex gap-1 px-4 pt-3 border-b border-edge pb-2">
                {['cover', 'resume'].map(t => (
                  <button key={t} onClick={() => {}}
                    className="px-3 py-1.5 text-sm rounded-md text-ink-muted">
                    {t === 'cover' ? 'Cover Letter' : 'Tailored Resume'}
                  </button>
                ))}
              </div>
              <div className="p-4 max-h-56 overflow-y-auto">
                <pre className="whitespace-pre-wrap font-sans text-sm text-ink-mid leading-relaxed">
                  {result.coverLetter}
                </pre>
              </div>
            </div>
            <div className="p-4 border-t border-edge flex flex-wrap gap-2 justify-end">
              <button onClick={onDone} className="btn-secondary text-xs">Done</button>
              {result.jobUrl && (
                <a href={result.jobUrl} target="_blank" rel="noreferrer" className="btn-secondary text-xs">
                  <ExternalLink size={12} /> Job Posting
                </a>
              )}
              <button
                onClick={() => downloadTxt(result.coverLetter, `Cover_Letter_${application.job?.company?.replace(/\s+/g, '_') || 'Company'}.txt`)}
                className="btn-secondary text-xs"
              >
                <FileDown size={12} /> Cover Letter (.txt)
              </button>
              <button onClick={downloadPDF} disabled={dlLoading} className="btn-primary text-xs">
                {dlLoading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                Download PDF
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Status select ────────────────────────────────────────────────────────────

function StatusSelect({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const current = STATUSES.find(s => s.value === value) || STATUSES[0]
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className={`${current.cls} flex items-center gap-1.5 cursor-pointer`}>
        {current.label} <ChevronDown size={10} className={open ? 'rotate-180' : ''} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-edge rounded-lg shadow-lg overflow-hidden min-w-[130px]">
          {STATUSES.map(s => (
            <button key={s.value} onClick={() => { onChange(s.value); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-brand-faint transition-colors ${s.value === value ? 'bg-brand-light' : ''}`}>
              <div className={`w-2 h-2 rounded-full ${s.dotCls}`} />
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Email Modal ──────────────────────────────────────────────────────────────

function EmailModal({ application, onClose, onSent }) {
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState(`Application for ${application.job?.title} – ${application.job?.company}`)
  const [body, setBody] = useState(
    `Dear Hiring Manager,\n\nPlease find my application for the ${application.job?.title} position at ${application.job?.company}.\n\n${application.coverLetter || ''}\n\nBest regards`
  )
  const [sending, setSending] = useState(false)

  const send = async () => {
    if (!to.trim()) { toast.error('Please enter recipient email'); return }
    setSending(true)
    try {
      await applicationsAPI.sendEmail({ applicationId: application.id, to: to.trim(), subject, body })
      toast.success('Email sent successfully!')
      onSent?.(); onClose()
    } catch (err) { toast.error(err.message) }
    finally { setSending(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-xl flex flex-col card shadow-2xl max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-edge">
          <h3 className="font-semibold text-ink flex items-center gap-2">
            <Mail size={16} className="text-brand" /> Send Application Email
          </h3>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div>
            <label className="text-xs text-ink-sub mb-1 block">To (recruiter email)</label>
            <input type="email" className="input-field" value={to} onChange={e => setTo(e.target.value)} placeholder="recruiter@company.com" />
          </div>
          <div>
            <label className="text-xs text-ink-sub mb-1 block">Subject</label>
            <input type="text" className="input-field" value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-ink-sub mb-1 block">Body</label>
            <textarea className="input-field" rows={10} value={body} onChange={e => setBody(e.target.value)} />
          </div>
        </div>
        <div className="p-4 border-t border-edge flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button onClick={send} disabled={sending} className="btn-primary text-sm">
            {sending ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
            {sending ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({ application, onClose, onRetailor }) {
  const [tab, setTab] = useState(application.coverLetter ? 'cover' : 'resume')
  const [copied, setCopied] = useState(false)
  const [dlLoading, setDlLoading] = useState(false)
  const [retailoring, setRetailoring] = useState(false)
  const [resumeText, setResumeText] = useState(application.tailoredResume)

  const content = tab === 'cover' ? application.coverLetter : resumeText

  const copy = () => {
    navigator.clipboard.writeText(content || '')
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const downloadTxt = () => {
    const blob = new Blob([content || ''], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const name = tab === 'cover'
      ? `Cover_Letter_${application.job?.company?.replace(/\s+/g, '_') || 'Company'}.txt`
      : `Tailored_Resume_${application.job?.company?.replace(/\s+/g, '_') || 'Company'}.txt`
    a.href = url; a.download = name; a.click()
    URL.revokeObjectURL(url)
  }

  const downloadPDF = async () => {
    if (!resumeText) return
    setDlLoading(true)
    try { await jobsAPI.downloadResumePDF(resumeText, application.job?.company) }
    catch (err) { toast.error('PDF failed: ' + err.message) }
    finally { setDlLoading(false) }
  }

  const handleRetailor = async () => {
    setRetailoring(true)
    try {
      const res = await applicationsAPI.retailor(application.id)
      setResumeText(res.tailoredResume)
      setTab('resume')
      toast.success('Resume re-tailored')
      onRetailor?.(application.id, res.tailoredResume)
    } catch (err) { toast.error(err.message) }
    finally { setRetailoring(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl flex flex-col card shadow-2xl max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-edge">
          <div>
            <h3 className="font-semibold text-ink">{application.job?.title}</h3>
            <p className="text-xs text-ink-muted">{application.job?.company}{application.whatsappGroup ? ` · via ${application.whatsappGroup}` : ''}</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-edge pb-2">
          {['cover', 'resume'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${tab === t ? 'bg-brand-light text-brand font-medium' : 'text-ink-muted hover:text-ink-sub'}`}>
              {t === 'cover' ? 'Cover Letter' : 'Tailored Resume'}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1">
            {tab === 'resume' && (
              <button onClick={handleRetailor} disabled={retailoring} className="btn-ghost text-xs" title="Re-tailor">
                {retailoring ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                {retailoring ? 'Tailoring…' : 'Retailor'}
              </button>
            )}
            <button onClick={copy} className="btn-ghost text-xs">
              {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button onClick={downloadTxt} className="btn-ghost text-xs"><FileDown size={12} /> .txt</button>
            {tab === 'resume' && resumeText && (
              <button onClick={downloadPDF} disabled={dlLoading} className="btn-primary text-xs py-1 px-2">
                {dlLoading ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
                PDF
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {content
            ? <pre className="whitespace-pre-wrap font-sans text-sm text-ink-mid leading-relaxed">{content}</pre>
            : <p className="text-ink-muted text-sm text-center py-8">No {tab === 'cover' ? 'cover letter' : 'tailored resume'} saved</p>
          }
        </div>
      </div>
    </div>
  )
}

// ─── Source badge ─────────────────────────────────────────────────────────────

function SourceTag({ app }) {
  if (app.applicationMethod === 'pasted') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-violet-50 text-violet-700 border border-violet-200 px-1.5 py-0.5 rounded">
      <ClipboardPaste size={9} /> Manual
    </span>
  )
  if (app.applicationMethod === 'whatsapp') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
      <MessageSquare size={9} /> WhatsApp
    </span>
  )
  return null
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Applications() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [emailModal, setEmailModal] = useState(null)
  const [detailModal, setDetailModal] = useState(null)
  const [applyModal, setApplyModal] = useState(null)
  const [pasteModal, setPasteModal] = useState(false)
  const [retailoringId, setRetailoringId] = useState(null)

  const load = () => {
    applicationsAPI.list()
      .then(r => setApplications(r.applications || []))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleStatusChange = async (id, status) => {
    try {
      await applicationsAPI.update(id, { status })
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status } : a))
    } catch (err) { toast.error(err.message) }
  }

  const handleRowRetailor = async (id) => {
    setRetailoringId(id)
    try {
      const res = await applicationsAPI.retailor(id)
      setApplications(prev => prev.map(a => a.id === id ? { ...a, tailoredResume: res.tailoredResume } : a))
      toast.success('Resume re-tailored')
    } catch (err) { toast.error(err.message) }
    finally { setRetailoringId(null) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this application?')) return
    try {
      await applicationsAPI.delete(id)
      setApplications(prev => prev.filter(a => a.id !== id))
      toast.success('Deleted')
    } catch (err) { toast.error(err.message) }
  }

  const tabCounts = {
    all:      applications.length,
    board:    applications.filter(a => !a.applicationMethod || a.applicationMethod === 'board').length,
    manual:   applications.filter(a => a.applicationMethod === 'pasted').length,
    whatsapp: applications.filter(a => a.applicationMethod === 'whatsapp').length,
  }

  const visible = filterByTab(applications, activeTab)

  const stats = {
    applied:   applications.filter(a => a.status === 'applied').length,
    interview: applications.filter(a => a.status === 'interview').length,
    offer:     applications.filter(a => a.status === 'offer').length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-edge border-t-brand rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-full">

      {/* Page header */}
      <div className="px-8 pt-9 border-b border-edge bg-white">
        <div className="flex items-start justify-between pb-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold text-ink leading-none tracking-tight">Applications</h1>
            {applications.length > 0 && (
              <span className="text-sm text-ink-sub">{applications.length} tracked</span>
            )}
          </div>
          <button
            onClick={() => setPasteModal(true)}
            className="btn-primary text-sm"
          >
            <ClipboardPaste size={14} /> Paste & Apply
          </button>
        </div>

        {/* Stats row */}
        {applications.length > 0 && (
          <div className="flex items-center gap-5 text-sm pb-4">
            <span>
              <span className="text-2xl font-bold text-ink mr-1.5">{stats.applied}</span>
              <span className="text-ink-sub">applied</span>
            </span>
            <span className="text-edge">·</span>
            <span>
              <span className="text-2xl font-bold text-ink mr-1.5">{stats.interview}</span>
              <span className="text-ink-sub">interviews</span>
            </span>
            <span className="text-edge">·</span>
            <span>
              <span className="text-2xl font-bold text-ink mr-1.5">{stats.offer}</span>
              <span className="text-ink-sub">offers</span>
            </span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-0.5">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-brand text-brand'
                  : 'border-transparent text-ink-muted hover:text-ink-sub'
              }`}
            >
              <Icon size={13} />
              {label}
              {tabCounts[key] > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === key ? 'bg-brand-light text-brand' : 'bg-gray-100 text-ink-muted'}`}>
                  {tabCounts[key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-8 pt-6 pb-12 max-w-6xl">
        {visible.length === 0 ? (
          <div className="card py-20 text-center mt-2">
            <ClipboardList size={32} className="text-ink-faint mx-auto mb-3" />
            <p className="text-sm font-medium text-ink-sub">
              {activeTab === 'manual' ? 'No manual applications yet' :
               activeTab === 'whatsapp' ? 'No WhatsApp bot applications yet' :
               activeTab === 'board' ? 'No board applications yet' :
               'No applications yet'}
            </p>
            {activeTab === 'manual' && (
              <p className="text-xs text-ink-muted mt-1">
                Click <button onClick={() => setPasteModal(true)} className="text-brand hover:underline">Paste & Apply</button> to apply from a job description
              </p>
            )}
          </div>
        ) : (
          <div className="card overflow-hidden mt-2">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-edge">
                    {['Job', 'Company', 'Location', 'Status', 'Date', 'Actions'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-ink-muted uppercase tracking-widest px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge-soft">
                  {visible.map(app => (
                    <tr key={app.id} className="hover:bg-brand-faint transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="text-sm font-medium text-ink max-w-[180px] truncate">{app.job?.title}</p>
                            {app.job?.url && (
                              <a href={app.job.url} target="_blank" rel="noreferrer" className="text-xs text-brand hover:text-brand-dark flex items-center gap-0.5 mt-0.5">
                                <ExternalLink size={10} /> View
                              </a>
                            )}
                          </div>
                          <SourceTag app={app} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-ink-mid">{app.job?.company}</p>
                        <p className="text-xs text-ink-muted">{app.whatsappGroup || app.job?.source}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-ink-muted">{app.job?.location}</p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusSelect value={app.status} onChange={v => handleStatusChange(app.id, v)} />
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-muted tabular-nums">
                        {new Date(app.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {app.status === 'saved' && (
                            <button onClick={() => setApplyModal(app)} className="btn-ghost p-1.5" title="Apply Now">
                              <PlayCircle size={13} />
                            </button>
                          )}
                          {app.tailoredResume && (
                            <button onClick={() => handleRowRetailor(app.id)} className="btn-ghost p-1.5" title="Re-tailor"
                              disabled={retailoringId === app.id}>
                              {retailoringId === app.id ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                            </button>
                          )}
                          {(app.coverLetter || app.tailoredResume) && (
                            <button onClick={() => setDetailModal(app)} className="btn-ghost p-1.5" title="View Documents">
                              <Eye size={13} />
                            </button>
                          )}
                          <button onClick={() => setEmailModal(app)} className="btn-ghost p-1.5" title="Send Email">
                            <Mail size={13} />
                          </button>
                          <button onClick={() => handleDelete(app.id)} className="btn-ghost p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50" title="Delete">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {pasteModal && (
        <PasteModal onClose={() => setPasteModal(false)} onDone={() => { setPasteModal(false); load() }} />
      )}
      {emailModal && (
        <EmailModal application={emailModal} onClose={() => setEmailModal(null)} onSent={load} />
      )}
      {detailModal && (
        <DetailModal application={detailModal} onClose={() => setDetailModal(null)}
          onRetailor={(id, r) => setApplications(prev => prev.map(a => a.id === id ? { ...a, tailoredResume: r } : a))} />
      )}
      {applyModal && (
        <ApplyModal application={applyModal} onClose={() => setApplyModal(null)}
          onDone={() => { setApplyModal(null); load() }} />
      )}
    </div>
  )
}
