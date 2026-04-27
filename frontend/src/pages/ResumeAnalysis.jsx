import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import {
  Upload, FileText, Trash2, CheckCircle2, AlertTriangle,
  User, Briefcase, GraduationCap, Zap, TrendingUp, Target,
  BarChart3, Star, RefreshCw
} from 'lucide-react'
import { resumeAPI } from '../api/client'

function ScoreRing({ value, label, color }) {
  const r = 30
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={r} fill="none" stroke="#E4E7EC" strokeWidth="6" />
          <circle
            cx="36" cy="36" r={r} fill="none"
            stroke={color} strokeWidth="6"
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-ink">{value}</span>
        </div>
      </div>
      <span className="text-xs text-ink-muted">{label}</span>
    </div>
  )
}

export default function ResumeAnalysis() {
  const [resume, setResume] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    resumeAPI.get()
      .then(r => setResume(r.resume))
      .finally(() => setLoading(false))
  }, [])

  const onDrop = useCallback(async (files) => {
    const file = files[0]
    if (!file) return
    setUploading(true)
    const tid = toast.loading(`Parsing & analyzing ${file.name}...`)
    try {
      const result = await resumeAPI.upload(file)
      setResume({ analysis: result.analysis, filename: file.name, uploadedAt: new Date().toISOString() })
      toast.success('Resume analyzed successfully!', { id: tid })
    } catch (err) {
      toast.error(err.message, { id: tid })
    } finally {
      setUploading(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'text/plain': ['.txt'] },
    maxFiles: 1,
    disabled: uploading
  })

  const handleDelete = async () => {
    if (!confirm('Remove your resume?')) return
    try {
      await resumeAPI.delete()
      setResume(null)
      toast.success('Resume removed')
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-edge border-t-brand rounded-full animate-spin" />
      </div>
    )
  }

  const a = resume?.analysis

  return (
    <div className="min-h-full">

      {/* Page header */}
      <div className="px-8 pt-9 border-b border-edge bg-white">
        <div className="flex items-baseline justify-between pb-5">
          <div>
            <h1 className="text-2xl font-bold text-ink leading-none tracking-tight">Resume</h1>
            <p className="text-ink-sub text-sm mt-1.5">Upload your resume for AI-powered analysis</p>
          </div>
          {resume && (
            <button onClick={handleDelete} className="btn-danger text-sm">
              <Trash2 size={14} /> Remove
            </button>
          )}
        </div>
      </div>

      <div className="px-8 pt-8 pb-12 max-w-5xl space-y-6">

        {/* Upload zone */}
        {!resume && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 ${
              isDragActive
                ? 'border-accent bg-brand-light'
                : 'border-edge hover:border-accent-soft bg-gray-50'
            } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3">
              {uploading ? (
                <>
                  <RefreshCw size={40} className="text-brand animate-spin" />
                  <p className="text-ink font-medium">Analyzing your resume with AI...</p>
                  <p className="text-ink-muted text-sm">This may take 15-30 seconds</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-brand-light border border-edge-active flex items-center justify-center">
                    <Upload size={28} className="text-brand" />
                  </div>
                  <div>
                    <p className="text-ink font-semibold text-lg">
                      {isDragActive ? 'Drop your resume here' : 'Drop your resume or click to upload'}
                    </p>
                    <p className="text-ink-muted text-sm mt-1">PDF, DOCX, or TXT · Max 10MB</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-ink-muted">
                    <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-500" /> AI-powered analysis</span>
                    <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-500" /> ATS scoring</span>
                    <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-500" /> Skill extraction</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Analysis results */}
        {resume && a && (
          <div className="space-y-5">
            {/* Profile header */}
            <div className="card p-5">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-brand flex items-center justify-center text-xl font-bold text-white shrink-0">
                  {(a.name || 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-ink">{a.name || 'Your Profile'}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="badge-cyan">{a.primaryRole || 'Professional'}</span>
                    <span className="badge-gray">{a.experienceLevel}</span>
                    {a.yearsOfExperience > 0 && (
                      <span className="badge-gray">{a.yearsOfExperience}y exp</span>
                    )}
                  </div>
                  {a.email && <p className="text-sm text-ink-muted mt-1">{a.email}{a.location ? ` · ${a.location}` : ''}</p>}
                  {a.summary && <p className="text-sm text-ink-sub mt-2 leading-relaxed">{a.summary}</p>}
                </div>
                <div className="flex gap-4 shrink-0">
                  <ScoreRing value={a.atsScore || 0} label="ATS Score" color="#00455D" />
                  <ScoreRing value={a.qualityScore || 0} label="Quality" color="#22c55e" />
                </div>
              </div>
            </div>

            {/* Content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Skills */}
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={16} className="text-brand" />
                  <h3 className="section-title">Technical Skills</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(a.technicalSkills?.length ? a.technicalSkills : a.skills || []).map(skill => (
                    <span key={skill} className="badge-cyan">{skill}</span>
                  ))}
                  {!a.technicalSkills?.length && !a.skills?.length && (
                    <span className="text-ink-muted text-sm">No skills detected</span>
                  )}
                </div>
                {a.softSkills?.length > 0 && (
                  <>
                    <h4 className="text-sm font-medium text-ink-sub mt-4 mb-2">Soft Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {a.softSkills.map(skill => (
                        <span key={skill} className="badge-gray">{skill}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Strengths & Improvements */}
              <div className="card p-5 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Star size={15} className="text-emerald-500" />
                    <h3 className="text-sm font-semibold text-ink">Strengths</h3>
                  </div>
                  <ul className="space-y-1.5">
                    {(a.strengths || []).map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-ink-sub">
                        <CheckCircle2 size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={15} className="text-amber-500" />
                    <h3 className="text-sm font-semibold text-ink">Areas to Improve</h3>
                  </div>
                  <ul className="space-y-1.5">
                    {(a.improvements || []).map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-ink-sub">
                        <AlertTriangle size={13} className="text-amber-500 mt-0.5 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Work Experience */}
              {a.workExperience?.length > 0 && (
                <div className="card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Briefcase size={16} className="text-sky-500" />
                    <h3 className="section-title">Work Experience</h3>
                  </div>
                  <div className="space-y-4">
                    {a.workExperience.map((exp, i) => (
                      <div key={i} className="border-l-2 border-edge pl-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-ink">{exp.title}</p>
                            <p className="text-xs text-ink-muted">{exp.company}</p>
                          </div>
                          <span className="text-xs text-ink-muted shrink-0">{exp.duration}</span>
                        </div>
                        {exp.highlights?.length > 0 && (
                          <ul className="mt-1.5 space-y-0.5">
                            {exp.highlights.slice(0, 2).map((h, j) => (
                              <li key={j} className="text-xs text-ink-muted">• {h}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {a.education?.length > 0 && (
                <div className="card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <GraduationCap size={16} className="text-violet-500" />
                    <h3 className="section-title">Education</h3>
                  </div>
                  <div className="space-y-3">
                    {a.education.map((edu, i) => (
                      <div key={i}>
                        <p className="text-sm font-medium text-ink">{edu.degree}</p>
                        <p className="text-xs text-ink-muted">{edu.institution}{edu.year ? ` · ${edu.year}` : ''}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Re-upload */}
            <div
              {...getRootProps()}
              className="border border-dashed border-edge rounded-xl p-4 text-center cursor-pointer hover:border-accent-soft transition-colors"
            >
              <input {...getInputProps()} />
              <p className="text-sm text-ink-muted">
                <Upload size={13} className="inline mr-1.5" />
                Drop a new resume to replace the current one
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
