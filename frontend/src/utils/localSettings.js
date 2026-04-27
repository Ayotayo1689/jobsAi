const SETTINGS_KEY = 'jobsai.localSettings'

export const DEFAULT_SETTINGS = {
  claudeApiKey: '',
  rapidApiKey: '',
  emailConfig: {
    host: '',
    port: '587',
    secure: false,
    user: '',
    pass: '',
    fromName: ''
  }
}

export const REQUIRED_FIELDS = [
  { key: 'claudeApiKey', label: 'Claude API key' },
  { key: 'rapidApiKey', label: 'RapidAPI key' },
  { key: 'emailConfig.host', label: 'SMTP host' },
  { key: 'emailConfig.port', label: 'SMTP port' },
  { key: 'emailConfig.user', label: 'Email address' },
  { key: 'emailConfig.pass', label: 'Email app password' }
]

function cleanSettings(settings = {}) {
  return {
    claudeApiKey: settings.claudeApiKey || '',
    rapidApiKey: settings.rapidApiKey || '',
    emailConfig: {
      ...DEFAULT_SETTINGS.emailConfig,
      ...(settings.emailConfig || {}),
      port: String(settings.emailConfig?.port || DEFAULT_SETTINGS.emailConfig.port),
      secure: !!settings.emailConfig?.secure
    }
  }
}

function valueAt(settings, path) {
  return path.split('.').reduce((cur, part) => cur?.[part], settings)
}

export function loadLocalSettings() {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    return cleanSettings(stored ? JSON.parse(stored) : DEFAULT_SETTINGS)
  } catch {
    return cleanSettings(DEFAULT_SETTINGS)
  }
}

export function saveLocalSettings(settings) {
  const cleaned = cleanSettings(settings)
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(cleaned))
  window.dispatchEvent(new Event('jobsai:auth-changed'))
  return cleaned
}

export function clearLocalSettings() {
  localStorage.removeItem(SETTINGS_KEY)
  window.dispatchEvent(new Event('jobsai:auth-changed'))
}

export function missingRequiredSettings(settings = loadLocalSettings()) {
  const cleaned = cleanSettings(settings)
  return REQUIRED_FIELDS.filter(field => !String(valueAt(cleaned, field.key) || '').trim())
}

export function isLoggedIn(settings = loadLocalSettings()) {
  return missingRequiredSettings(settings).length === 0
}

export function encodeSettingsHeader(settings = loadLocalSettings()) {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(cleanSettings(settings)))))
  } catch {
    return ''
  }
}
