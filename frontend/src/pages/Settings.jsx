import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Key, Mail, Save, Eye, EyeOff, CheckCircle2,
  AlertCircle, RefreshCw, Shield, Search
} from 'lucide-react'
import { loadLocalSettings, saveLocalSettings, missingRequiredSettings } from '../utils/localSettings'

function FieldLabel({ label }) {
  return (
    <label className="text-sm text-ink-sub mb-1.5 flex items-center">
      {label}
    </label>
  )
}

function Section({ icon: Icon, title, description, children }) {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start gap-3 border-b border-edge pb-4">
        <Icon size={15} className="text-ink-muted mt-0.5 shrink-0" />
        <div>
          <h2 className="font-medium text-ink text-sm">{title}</h2>
          <p className="text-xs text-ink-muted mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [showKey, setShowKey]     = useState(false)
  const [showRapid, setShowRapid] = useState(false)
  const [showPass, setShowPass]   = useState(false)

  const [claudeKey, setClaudeKey]     = useState('')
  const [rapidApiKey, setRapidApiKey] = useState('')
  const [email, setEmail] = useState({
    host: '', port: '587', secure: false, user: '', pass: '', fromName: ''
  })

  useEffect(() => {
    const s = loadLocalSettings()
    setClaudeKey(s.claudeApiKey || '')
    setRapidApiKey(s.rapidApiKey || '')
    setEmail({
      host:     s.emailConfig.host     || '',
      port:     String(s.emailConfig.port || '587'),
      secure:   s.emailConfig.secure   || false,
      user:     s.emailConfig.user     || '',
      pass:     s.emailConfig.pass     || '',
      fromName: s.emailConfig.fromName || ''
    })
    setLoading(false)
  }, [])

  const handleSave = () => {
    setSaving(true)
    try {
      const settings = saveLocalSettings({
        claudeApiKey: claudeKey,
        rapidApiKey,
        emailConfig: { ...email, port: parseInt(email.port) || 587 }
      })
      const missing = missingRequiredSettings(settings)

      if (missing.length) {
        toast.error(`Still missing: ${missing.map(item => item.label).join(', ')}`)
      } else {
        toast.success('Settings saved. You are logged in.')
        navigate('/')
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setTimeout(() => setSaving(false), 250)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-edge border-t-brand rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-8 pt-9 pb-12 max-w-2xl space-y-5">
      <div className="border-b border-edge pb-5">
        <h1 className="text-2xl font-bold text-ink leading-none tracking-tight">Settings</h1>
        <p className="text-ink-sub text-sm mt-2">
          Configure the credentials used by this browser. They stay in localStorage and are cleared when you log out.
        </p>
      </div>

      <Section icon={Key} title="Claude AI" description="Required for resume analysis, job matching, and document generation">
        <div>
          <FieldLabel label="API Key" />
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              className="input-field pr-10"
              value={claudeKey}
              onChange={e => setClaudeKey(e.target.value)}
              placeholder="sk-ant-api03-..."
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-sub transition-colors"
            >
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <p className="text-xs text-ink-muted mt-1.5 flex items-center gap-1">
            <Shield size={11} /> Stored locally in this browser
          </p>
        </div>

        {claudeKey ? (
          <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
            <CheckCircle2 size={12} />
            Key configured
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            <AlertCircle size={12} />
            Required before you can log in
          </div>
        )}
      </Section>

      <Section icon={Search} title="Enhanced Job Search" description="Unlocks LinkedIn, Indeed, and Glassdoor results via JSearch">
        <div>
          <FieldLabel label="RapidAPI Key" />
          <div className="relative">
            <input
              type={showRapid ? 'text' : 'password'}
              className="input-field pr-10"
              value={rapidApiKey}
              onChange={e => setRapidApiKey(e.target.value)}
              placeholder="Paste your RapidAPI key"
            />
            <button
              type="button"
              onClick={() => setShowRapid(!showRapid)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-sub transition-colors"
            >
              {showRapid ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {rapidApiKey ? (
          <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
            <CheckCircle2 size={12} />
            JSearch active - LinkedIn / Indeed / Glassdoor enabled
          </div>
        ) : (
          <div className="bg-gray-50 border border-edge rounded-md p-3 text-xs text-ink-muted space-y-1">
            <p className="font-medium text-ink-sub">Get a free key:</p>
            <p>1. Go to rapidapi.com and create a free account.</p>
            <p>2. Search JSearch and subscribe to the free tier.</p>
            <p>3. Paste the key above.</p>
          </div>
        )}
      </Section>

      <Section icon={Mail} title="Email / SMTP" description="Required for generated application emails and sending messages">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <FieldLabel label="SMTP Host" />
            <input
              type="text"
              className="input-field"
              value={email.host}
              onChange={e => setEmail({ ...email, host: e.target.value })}
              placeholder="smtp.gmail.com"
            />
          </div>

          <div>
            <FieldLabel label="Port" />
            <input
              type="number"
              className="input-field"
              value={email.port}
              onChange={e => setEmail({ ...email, port: e.target.value })}
              placeholder="587"
            />
          </div>

          <div className="flex items-end pb-2.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={email.secure}
                onChange={e => setEmail({ ...email, secure: e.target.checked })}
                className="rounded border-edge"
              />
              <span className="text-sm text-ink-sub">Use SSL/TLS</span>
            </label>
          </div>

          <div>
            <FieldLabel label="Email Address" />
            <input
              type="email"
              className="input-field"
              value={email.user}
              onChange={e => setEmail({ ...email, user: e.target.value })}
              placeholder="you@gmail.com"
            />
          </div>

          <div>
            <FieldLabel label="Password / App Password" />
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                className="input-field pr-10"
                value={email.pass}
                onChange={e => setEmail({ ...email, pass: e.target.value })}
                placeholder="App password"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-sub transition-colors"
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="col-span-2">
            <FieldLabel label="Display Name (optional)" />
            <input
              type="text"
              className="input-field"
              value={email.fromName}
              onChange={e => setEmail({ ...email, fromName: e.target.value })}
              placeholder="John Doe"
            />
          </div>
        </div>

        <div className="bg-gray-50 border border-edge rounded-md p-3 text-xs text-ink-muted space-y-1">
          <p className="font-medium text-ink-sub">Gmail:</p>
          <p>Google Account, Security, App Passwords, generate one and paste it above.</p>
          <p>Host: <code className="text-ink-mid font-mono">smtp.gmail.com</code> / Port <code className="text-ink-mid font-mono">587</code></p>
        </div>
      </Section>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="btn-primary w-full justify-center py-3"
      >
        {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  )
}
