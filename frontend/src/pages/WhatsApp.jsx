import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import {
  MessageSquare, Wifi, WifiOff, QrCode, Play, Square,
  Trash2, RefreshCw, CheckCircle2, AlertCircle, Info,
  Briefcase, SkipForward, Zap, Settings2, ChevronDown
} from 'lucide-react'
import { whatsappAPI } from '../api/client'

const STATUS_CONFIG = {
  disconnected: { label: 'Disconnected', color: 'text-ink-muted', dot: 'bg-gray-300', icon: WifiOff },
  connecting:   { label: 'Starting…',    color: 'text-amber-600', dot: 'bg-amber-400', icon: RefreshCw },
  qr:           { label: 'Scan QR Code', color: 'text-brand',     dot: 'bg-accent',    icon: QrCode },
  ready:        { label: 'Connected',    color: 'text-emerald-600',dot: 'bg-emerald-400',icon: Wifi },
}

const LOG_CONFIG = {
  info:         { icon: Info,          cls: 'text-ink-sub',     bg: '' },
  job_detected: { icon: Briefcase,     cls: 'text-brand',       bg: 'bg-brand-faint' },
  job_applied:  { icon: CheckCircle2,  cls: 'text-emerald-600', bg: 'bg-emerald-50' },
  job_skipped:  { icon: SkipForward,   cls: 'text-amber-600',   bg: 'bg-amber-50' },
  error:        { icon: AlertCircle,   cls: 'text-red-600',     bg: 'bg-red-50' },
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function WhatsApp() {
  const [status, setStatus] = useState('disconnected')
  const [qr, setQR] = useState(null)
  const [logs, setLogs] = useState([])
  const [groups, setGroups] = useState([])
  const [monitoredGroups, setMonitoredGroups] = useState([])
  const [threshold, setThreshold] = useState(65)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [starting, setStarting] = useState(false)
  const [stopping, setStopping] = useState(false)
  const logsRef = useRef(null)
  const esRef = useRef(null)

  // Load initial state + subscribe to SSE
  useEffect(() => {
    whatsappAPI.logs().then(r => setLogs(r.logs || [])).catch(() => {})
    whatsappAPI.status().then(r => {
      setStatus(r.status)
      if (r.qr) setQR(r.qr)
      setMonitoredGroups(r.monitoredGroups || [])
      setThreshold(r.threshold ?? 65)
    }).catch(() => {})

    const es = new EventSource('/api/whatsapp/events')
    esRef.current = es

    es.addEventListener('status', e => {
      const d = JSON.parse(e.data)
      setStatus(d.status)
      setQR(d.qr || null)
    })
    es.addEventListener('log', e => {
      const entry = JSON.parse(e.data)
      setLogs(prev => [entry, ...prev].slice(0, 500))
    })
    es.addEventListener('groups', e => {
      setGroups(JSON.parse(e.data))
    })

    return () => es.close()
  }, [])

  const handleStart = async () => {
    setStarting(true)
    try {
      await whatsappAPI.start()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setStarting(false)
    }
  }

  const handleStop = async () => {
    setStopping(true)
    try {
      await whatsappAPI.stop()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setStopping(false)
    }
  }

  const handleClearLogs = async () => {
    await whatsappAPI.clearLogs()
    setLogs([])
    toast.success('Logs cleared')
  }

  const handleSaveSettings = async () => {
    try {
      await whatsappAPI.saveSettings({ monitoredGroups, threshold })
      toast.success('Settings saved')
      setSettingsOpen(false)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const toggleGroup = (id) => {
    setMonitoredGroups(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    )
  }

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.disconnected
  const StatusIcon = cfg.icon

  const logStats = {
    applied:  logs.filter(l => l.type === 'job_applied').length,
    detected: logs.filter(l => l.type === 'job_detected').length,
    skipped:  logs.filter(l => l.type === 'job_skipped').length,
  }

  return (
    <div className="min-h-full">

      {/* Page header */}
      <div className="px-8 pt-9 border-b border-edge bg-white">
        <div className="flex items-start justify-between pb-5">
          <div>
            <h1 className="text-2xl font-bold text-ink leading-none tracking-tight">WhatsApp Bot</h1>
            <p className="text-ink-sub text-sm mt-1.5">Monitor group chats and auto-apply to job postings</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSettingsOpen(!settingsOpen)} className="btn-secondary text-sm">
              <Settings2 size={14} /> Settings
            </button>
            {status === 'disconnected' ? (
              <button onClick={handleStart} disabled={starting} className="btn-primary text-sm">
                {starting ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                {starting ? 'Starting…' : 'Start Bot'}
              </button>
            ) : (
              <button onClick={handleStop} disabled={stopping} className="btn-danger text-sm">
                {stopping ? <RefreshCw size={14} className="animate-spin" /> : <Square size={14} />}
                {stopping ? 'Stopping…' : 'Stop Bot'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-8 pt-6 pb-12 grid grid-cols-1 lg:grid-cols-5 gap-6 items-start max-w-6xl">

        {/* Left panel — status + QR */}
        <div className="lg:col-span-2 space-y-4">

          {/* Status card */}
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot} ${status === 'connecting' ? 'animate-pulse' : ''}`} />
              <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
              {status === 'ready' && (
                <span className="ml-auto text-xs text-ink-muted">Monitoring {monitoredGroups.length === 0 ? 'all groups' : `${monitoredGroups.length} group${monitoredGroups.length !== 1 ? 's' : ''}`}</span>
              )}
            </div>

            {/* QR Code */}
            {status === 'qr' && qr && (
              <div className="space-y-3">
                <div className="bg-white border border-edge rounded-xl p-3 flex items-center justify-center">
                  <img src={qr} alt="WhatsApp QR Code" className="w-48 h-48" />
                </div>
                <div className="bg-brand-light border border-edge-active rounded-lg p-3 text-xs text-brand space-y-1">
                  <p className="font-semibold">Scan this QR code:</p>
                  <p>1. Open WhatsApp on your phone</p>
                  <p>2. Go to Settings → Linked Devices → Link a Device</p>
                  <p>3. Point your camera at the code above</p>
                </div>
              </div>
            )}

            {/* Idle state */}
            {status === 'disconnected' && (
              <div className="text-center py-6">
                <MessageSquare size={36} className="text-ink-faint mx-auto mb-3" />
                <p className="text-sm text-ink-sub">Bot is not running</p>
                <p className="text-xs text-ink-muted mt-1">Click Start Bot to connect your WhatsApp</p>
              </div>
            )}

            {/* Connected state */}
            {status === 'ready' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-brand-light rounded-lg p-2">
                    <div className="text-lg font-bold text-brand">{logStats.detected}</div>
                    <div className="text-[10px] text-ink-muted">Detected</div>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-2">
                    <div className="text-lg font-bold text-emerald-600">{logStats.applied}</div>
                    <div className="text-[10px] text-ink-muted">Applied</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-2">
                    <div className="text-lg font-bold text-amber-600">{logStats.skipped}</div>
                    <div className="text-[10px] text-ink-muted">Skipped</div>
                  </div>
                </div>
                <div className="text-xs text-ink-muted bg-gray-50 rounded-lg p-3">
                  <p>Match threshold: <span className="font-semibold text-ink">{threshold}%</span></p>
                  <p className="mt-0.5">Jobs scoring below this are skipped automatically.</p>
                </div>
              </div>
            )}

            {status === 'connecting' && (
              <div className="text-center py-6">
                <RefreshCw size={28} className="text-brand animate-spin mx-auto mb-3" />
                <p className="text-sm text-ink-sub">Starting WhatsApp…</p>
                <p className="text-xs text-ink-muted mt-1">This may take 30–60 seconds</p>
              </div>
            )}
          </div>

          {/* Settings panel */}
          {settingsOpen && (
            <div className="card p-5 space-y-4">
              <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                <Settings2 size={14} className="text-brand" /> Bot Settings
              </h3>

              <div>
                <label className="text-xs text-ink-sub mb-1.5 block">
                  Auto-apply threshold: <span className="font-semibold text-ink">{threshold}%</span>
                </label>
                <input
                  type="range" min={30} max={90} step={5}
                  value={threshold}
                  onChange={e => setThreshold(Number(e.target.value))}
                  className="w-full accent-brand"
                />
                <div className="flex justify-between text-[10px] text-ink-muted mt-0.5">
                  <span>30% (more jobs)</span><span>90% (fewer jobs)</span>
                </div>
              </div>

              {groups.length > 0 && (
                <div>
                  <label className="text-xs text-ink-sub mb-1.5 block">
                    Monitor groups <span className="text-ink-muted">(empty = all groups)</span>
                  </label>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {groups.map(g => (
                      <label key={g.id} className="flex items-center gap-2 text-sm cursor-pointer hover:text-ink">
                        <input
                          type="checkbox"
                          checked={monitoredGroups.includes(g.id)}
                          onChange={() => toggleGroup(g.id)}
                          className="rounded border-edge"
                        />
                        <span className="text-ink-sub truncate">{g.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {groups.length === 0 && status === 'ready' && (
                <p className="text-xs text-ink-muted">No groups found. Make sure you are in at least one WhatsApp group.</p>
              )}

              <button onClick={handleSaveSettings} className="btn-primary w-full justify-center text-sm">
                Save Settings
              </button>
            </div>
          )}
        </div>

        {/* Right panel — activity log */}
        <div className="lg:col-span-3 card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-edge">
            <span className="section-title">Activity Log</span>
            {logs.length > 0 && (
              <button onClick={handleClearLogs} className="btn-ghost text-xs text-red-500 hover:text-red-600 hover:bg-red-50">
                <Trash2 size={12} /> Clear
              </button>
            )}
          </div>

          <div ref={logsRef} className="divide-y divide-edge-soft max-h-[600px] overflow-y-auto">
            {logs.length === 0 ? (
              <div className="py-16 text-center">
                <MessageSquare size={28} className="text-ink-faint mx-auto mb-3" />
                <p className="text-sm text-ink-sub">No activity yet</p>
                <p className="text-xs text-ink-muted mt-1">Start the bot and activity will appear here in real time</p>
              </div>
            ) : (
              logs.map(entry => {
                const cfg = LOG_CONFIG[entry.type] || LOG_CONFIG.info
                const Icon = cfg.icon
                return (
                  <div key={entry.id} className={`flex items-start gap-3 px-5 py-3 ${cfg.bg}`}>
                    <Icon size={14} className={`${cfg.cls} mt-0.5 shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${cfg.cls} leading-snug`}>{entry.message}</p>
                      {entry.data?.score != null && (
                        <p className="text-xs text-ink-muted mt-0.5">Match: {entry.data.score}%</p>
                      )}
                      {entry.data?.groupName && entry.type === 'job_detected' && (
                        <p className="text-xs text-ink-muted mt-0.5">Group: {entry.data.groupName}</p>
                      )}
                    </div>
                    <span className="text-[11px] text-ink-muted shrink-0 tabular-nums">{timeAgo(entry.timestamp)}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
