import { Link } from 'react-router-dom'
import { useState } from 'react'
import {
  ArrowRight, CheckCircle2, ClipboardList, FileText, KeyRound,
  Lock, Mail, MessageSquare, Search, Settings, Sparkles, Zap
} from 'lucide-react'
import { missingRequiredSettings } from '../utils/localSettings'

const docs = [
  {
    icon: Settings,
    title: '1. Open Settings',
    text: 'Use the Settings page as your login screen. The app checks required credentials there.'
  },
  {
    icon: KeyRound,
    title: '2. Add AI and search keys',
    text: 'Paste your Claude API key and RapidAPI JSearch key so analysis, matching, and job discovery can run.'
  },
  {
    icon: Mail,
    title: '3. Add SMTP details',
    text: 'Add host, port, email address, and app password for sending application emails.'
  },
  {
    icon: Lock,
    title: '4. Save to log in',
    text: 'Once every required field is filled and saved, the dashboard unlocks. Logout clears the saved values.'
  }
]

const features = [
  { icon: FileText, label: 'Resume analysis' },
  { icon: Search, label: 'Job discovery' },
  { icon: ClipboardList, label: 'Application tracker' },
  { icon: Mail, label: 'Email generation' }
]

const featureDocs = [
  {
    icon: FileText,
    title: 'Resume Analysis',
    text: 'Upload a PDF, DOCX, or TXT resume and JobsAI extracts your profile, technical skills, soft skills, strengths, improvement areas, experience level, ATS score, and resume quality score. The analysis becomes the base context for matching jobs and tailoring documents.'
  },
  {
    icon: Search,
    title: 'Job Discovery',
    text: 'Search across multiple job sources, filter by location type, inspect job details, save roles, and score jobs against your resume. With a RapidAPI JSearch key, the app can include richer LinkedIn, Indeed, and Glassdoor-style results.'
  },
  {
    icon: Zap,
    title: 'AI Apply Flow',
    text: 'For a selected job, JobsAI can analyze your match, identify missing skills, tailor your resume, write a cover letter, generate an application email, and send it through your configured SMTP account. If no recruiter email is available, it prepares downloadable documents for manual application.'
  },
  {
    icon: ClipboardList,
    title: 'Application Tracker',
    text: 'Track every saved or submitted role with statuses for saved, applied, interview, offer, and rejected. Applications are grouped by source, including job board, pasted/manual jobs, and WhatsApp bot entries.'
  },
  {
    icon: ClipboardList,
    title: 'Paste And Apply',
    text: 'Paste any job description into the Applications area. JobsAI reads the posting, extracts the company and role details, scores the match, creates tailored documents, and optionally sends the application email.'
  },
  {
    icon: Mail,
    title: 'Email And Documents',
    text: 'Generate application emails, cover letters, and tailored resumes. You can copy content, download text files, or generate a PDF resume for use outside the app.'
  },
  {
    icon: Settings,
    title: 'Settings And Local Login',
    text: 'Settings is where login happens. Claude, RapidAPI, and SMTP values are saved only in this browser localStorage. The app treats you as logged in only when all required values are present, and logout clears them.'
  },
  {
    icon: Lock,
    title: 'Protected Workspace',
    text: 'The Dashboard, Resume, Discover, Applications, and WhatsApp Bot sections stay locked until login is complete. Trying to open a protected area while logged out shows the login steps modal.'
  },
  {
    icon: MessageSquare,
    title: 'WhatsApp Bot',
    text: 'Connect WhatsApp by QR code, choose monitored groups, set a match threshold, and let the bot watch group messages for job posts. It can detect jobs, skip weak matches, apply to strong matches, and keep logs of detected, applied, skipped, and error events.'
  },
  {
    icon: CheckCircle2,
    title: 'Dashboard',
    text: 'The dashboard summarizes your resume readiness, tracked applications, recent activity, and quick links into the main workflows so you can move through the job search without digging through menus.'
  }
]

function LoginModal({ onClose }) {
  const missing = missingRequiredSettings()

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/55 px-4">
      <div className="w-full max-w-lg rounded-lg bg-white border border-edge shadow-xl">
        <div className="px-6 py-5 border-b border-edge">
          <div className="w-10 h-10 rounded-md bg-brand-light text-brand flex items-center justify-center mb-4">
            <Lock size={18} />
          </div>
          <h2 className="text-xl font-bold text-ink tracking-tight">Login required</h2>
          <p className="text-sm text-ink-sub mt-2">
            JobsAI logs you in when all required environment values are saved in localStorage from Settings.
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="space-y-2">
            {docs.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-3">
                <div className="w-7 h-7 rounded-md bg-gray-100 text-ink-sub flex items-center justify-center shrink-0">
                  <Icon size={14} />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">{title}</p>
                  <p className="text-xs text-ink-muted leading-5">{text}</p>
                </div>
              </div>
            ))}
          </div>

          {missing.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-xs font-medium text-amber-800">Missing:</p>
              <p className="text-xs text-amber-700 mt-1">
                {missing.map(item => item.label).join(', ')}
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-edge bg-gray-50 flex items-center justify-between gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">
            Not now
          </button>
          <Link to="/settings" className="btn-primary">
            Open Settings <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function Landing({ showLoginModal = false }) {
  const [modalOpen, setModalOpen] = useState(showLoginModal)

  return (
    <div className="min-h-screen bg-white text-ink">
      {modalOpen && <LoginModal onClose={() => setModalOpen(false)} />}

      <header className="border-b border-edge">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-brand text-white flex items-center justify-center">
              <Zap size={15} fill="currentColor" />
            </div>
            <span className="font-semibold tracking-tight">JobsAI</span>
          </div>
          <Link to="/settings" className="btn-secondary">
            <Settings size={15} /> Settings
          </Link>
        </div>
      </header>

      <main>
        <section className="max-w-6xl mx-auto px-6 py-16 lg:py-20 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-medium text-brand bg-brand-faint border border-edge-active rounded-md px-2.5 py-1 mb-5">
              <Sparkles size={13} /> Local credentials, full workflow
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
              Run your job search from resume to outreach.
            </h1>
            <p className="text-lg text-ink-sub mt-5 leading-8">
              JobsAI analyzes your resume, finds better-fit roles, creates tailored documents, and keeps your applications organized.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button type="button" onClick={() => setModalOpen(true)} className="btn-primary py-3">
                Start login <ArrowRight size={16} />
              </button>
              <a href="#documentation" className="btn-secondary py-3">
                Read docs
              </a>
            </div>
          </div>

          <div className="border border-edge rounded-lg overflow-hidden bg-gray-50">
            <div className="px-5 py-4 border-b border-edge bg-white">
              <p className="section-title">Workflow</p>
            </div>
            <div className="p-5 grid sm:grid-cols-2 gap-3">
              {features.map(({ icon: Icon, label }) => (
                <div key={label} className="bg-white border border-edge rounded-md p-4">
                  <Icon size={18} className="text-brand mb-4" />
                  <p className="font-medium text-sm text-ink">{label}</p>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700">
                    <CheckCircle2 size={13} /> Ready after login
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="documentation" className="border-t border-edge bg-gray-50">
          <div className="max-w-6xl mx-auto px-6 py-14">
            <div className="max-w-2xl mb-8">
              <p className="section-title">Documentation</p>
              <h2 className="text-2xl font-bold text-ink mt-2">How login works</h2>
              <p className="text-sm text-ink-sub mt-3 leading-6">
                The app does not use a password account. Your required environment values are the login state for this browser.
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              {docs.map(({ icon: Icon, title, text }) => (
                <div key={title} className="bg-white border border-edge rounded-lg p-5">
                  <Icon size={18} className="text-brand mb-4" />
                  <h3 className="text-sm font-semibold text-ink">{title}</h3>
                  <p className="text-xs text-ink-muted leading-5 mt-2">{text}</p>
                </div>
              ))}
            </div>

            <div className="mt-12 border-t border-edge pt-10">
              <div className="max-w-2xl mb-8">
                <p className="section-title">Feature Guide</p>
                <h2 className="text-2xl font-bold text-ink mt-2">Everything JobsAI can do</h2>
                <p className="text-sm text-ink-sub mt-3 leading-6">
                  A complete overview of the workspace after you finish setup.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {featureDocs.map(({ icon: Icon, title, text }) => (
                  <div key={title} className="bg-white border border-edge rounded-lg p-5">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-md bg-brand-light text-brand flex items-center justify-center shrink-0">
                        <Icon size={17} />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-ink">{title}</h3>
                        <p className="text-sm text-ink-sub leading-6 mt-2">{text}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
