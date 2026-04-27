import axios from 'axios'
import { encodeSettingsHeader } from '../utils/localSettings'

const api = axios.create({
  baseURL: '/api',
  timeout: 90000
})

api.interceptors.request.use(config => {
  const settings = encodeSettingsHeader()
  if (settings) config.headers['x-jobsai-settings'] = settings
  return config
})

api.interceptors.response.use(
  res => res.data,
  err => {
    const msg = err.response?.data?.error || err.message || 'Something went wrong'
    return Promise.reject(new Error(msg))
  }
)

export const resumeAPI = {
  upload: (file) => {
    const form = new FormData()
    form.append('resume', file)
    return api.post('/resume/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000
    })
  },
  get: () => api.get('/resume'),
  delete: () => api.delete('/resume')
}

export const jobsAPI = {
  search: (preferences) => api.post('/jobs/search', { preferences }),
  match: (job) => api.post('/jobs/match', { job }),
  tailor: (job, missingSkills) => api.post('/jobs/tailor', { job, missingSkills }),
  coverLetter: (job) => api.post('/jobs/cover-letter', { job }),
  generateEmail: (job, coverLetter) => api.post('/jobs/generate-email', { job, coverLetter }),

  downloadResumePDF: async (tailoredResume, candidateName) => {
    const res = await fetch('/api/jobs/resume-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-jobsai-settings': encodeSettingsHeader()
      },
      body: JSON.stringify({ tailoredResume, candidateName })
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'PDF generation failed')
    }
    const blob = await res.blob()
    const disposition = res.headers.get('Content-Disposition') || ''
    const match = disposition.match(/filename="?([^"]+)"?/)
    const filename = match ? match[1] : 'Tailored_Resume.pdf'
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  },

  // Streaming apply — calls onStep({key, status, data?, message?}) for each event
  apply: (job, recruiterEmail, onStep) => streamSSE('/api/jobs/apply', { job, recruiterEmail }, onStep),
  pasteApply: (jobText, recruiterEmail, onStep) => streamSSE('/api/jobs/paste-apply', { jobText, recruiterEmail }, onStep),
}

function streamSSE(url, body, onStep) {
  return new Promise((resolve, reject) => {
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-jobsai-settings': encodeSettingsHeader()
      },
      body: JSON.stringify(body)
    }).then(res => {
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      const parse = (chunk) => {
        buffer += chunk
        const blocks = buffer.split('\n\n')
        buffer = blocks.pop()
        for (const block of blocks) {
          const lines = block.trim().split('\n')
          let event = 'message', dataStr = ''
          for (const line of lines) {
            if (line.startsWith('event: ')) event = line.slice(7)
            if (line.startsWith('data: '))  dataStr = line.slice(6)
          }
          if (!dataStr) continue
          try {
            const payload = JSON.parse(dataStr)
            if (event === 'step')  onStep(payload)
            if (event === 'done')  resolve(payload)
            if (event === 'error') reject(new Error(payload.message))
          } catch {}
        }
      }

      const pump = () => reader.read().then(({ done, value }) => {
        if (done) return
        parse(decoder.decode(value, { stream: true }))
        pump()
      }).catch(reject)

      pump()
    }).catch(reject)
  })
}

export const applicationsAPI = {
  list: () => api.get('/applications'),
  create: (data) => api.post('/applications', data),
  update: (id, data) => api.put(`/applications/${id}`, data),
  delete: (id) => api.delete(`/applications/${id}`),
  sendEmail: (data) => api.post('/applications/send-email', data),
  retailor: (id) => api.post(`/applications/${id}/retailor`)
}

export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data)
}

export const whatsappAPI = {
  start: () => api.post('/whatsapp/start'),
  stop: () => api.post('/whatsapp/stop'),
  status: () => api.get('/whatsapp/status'),
  groups: () => api.get('/whatsapp/groups'),
  logs: () => api.get('/whatsapp/logs'),
  clearLogs: () => api.delete('/whatsapp/logs'),
  saveSettings: (data) => api.post('/whatsapp/settings', data),
}
