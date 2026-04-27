const store = require('./data/store');
const { AsyncLocalStorage } = require('async_hooks');

const requestSettings = new AsyncLocalStorage();

function getRequestSettings() {
  return requestSettings.getStore() || {};
}

function withRequestSettings(req, res, next) {
  const header = req.get('x-jobsai-settings');
  let settings = {};

  if (header) {
    try {
      settings = JSON.parse(Buffer.from(header, 'base64').toString('utf8'));
    } catch {
      settings = {};
    }
  }

  requestSettings.run(settings, next);
}

/**
 * Returns merged config: .env values take priority over settings page values.
 * If a .env value is set it cannot be overridden from the UI.
 */
function getConfig() {
  const data = store.read();
  const s = data.settings || {};
  const local = getRequestSettings();
  const ls = local || {};
  const ec = s.emailConfig || {};
  const lec = ls.emailConfig || {};

  return {
    claudeApiKey: process.env.CLAUDE_API_KEY || ls.claudeApiKey || s.claudeApiKey || '',
    rapidApiKey:  process.env.RAPID_API_KEY  || ls.rapidApiKey  || s.rapidApiKey  || '',
    emailConfig: {
      host:     process.env.SMTP_HOST     || lec.host     || ec.host     || '',
      port:     parseInt(process.env.SMTP_PORT) || parseInt(lec.port) || ec.port || 587,
      secure:   process.env.SMTP_SECURE === 'true' || lec.secure || ec.secure || false,
      user:     process.env.SMTP_USER     || lec.user     || ec.user     || '',
      pass:     process.env.SMTP_PASS     || lec.pass     || ec.pass     || '',
      fromName: process.env.SMTP_FROM_NAME || lec.fromName || ec.fromName || ''
    }
  };
}

/**
 * Tells the frontend which fields are locked (set via .env).
 * Locked fields are shown as read-only in the Settings page.
 */
function getEnvSources() {
  return {
    claudeApiKey:   !!process.env.CLAUDE_API_KEY,
    rapidApiKey:    !!process.env.RAPID_API_KEY,
    emailHost:      !!process.env.SMTP_HOST,
    emailPort:      !!process.env.SMTP_PORT,
    emailSecure:    !!process.env.SMTP_SECURE,
    emailUser:      !!process.env.SMTP_USER,
    emailPass:      !!process.env.SMTP_PASS,
    emailFromName:  !!process.env.SMTP_FROM_NAME
  };
}

module.exports = { getConfig, getEnvSources, withRequestSettings };
