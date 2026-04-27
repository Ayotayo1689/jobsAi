const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { classifyJobDescription, matchJob, tailorResume, generateCoverLetter, generateEmail, structureResumeForPDF } = require('./claudeService');
const { generateResumePDF } = require('./pdfService');
const { sendEmail } = require('./emailService');
const { getConfig } = require('../config');
const store = require('../data/store');

let client = null;
let status = 'disconnected'; // disconnected | qr | connecting | ready
let currentQR = null;
let groups = []; // [{id, name}] when connected
let monitoredGroups = new Set(); // group IDs to watch (empty = all groups)
let autoApplyThreshold = 65;
const sseClients = new Set();

function push(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try { res.write(msg); } catch {}
  }
}

function addLog(type, message, data = {}) {
  const entry = { id: uuidv4(), type, message, data, timestamp: new Date().toISOString() };
  store.update(d => {
    if (!d.whatsappLogs) d.whatsappLogs = [];
    d.whatsappLogs.unshift(entry);
    if (d.whatsappLogs.length > 500) d.whatsappLogs = d.whatsappLogs.slice(0, 500);
    return d;
  });
  push('log', entry);
  return entry;
}

async function handleMessage(msg) {
  const text = msg.body || '';
  if (text.length < 80) return; // too short to be a job post

  const groupId = msg.from;
  if (monitoredGroups.size > 0 && !monitoredGroups.has(groupId)) return;

  // Find group name for logging
  const groupName = groups.find(g => g.id === groupId)?.name || groupId;

  let classification;
  try {
    classification = await classifyJobDescription(text);
  } catch (err) {
    addLog('error', `Classification failed: ${err.message}`);
    return;
  }

  if (!classification.isJob) return;

  const job = { ...classification.job, id: uuidv4(), source: 'WhatsApp' };
  addLog('job_detected', `Job spotted in "${groupName}": ${job.title || 'Unknown'} at ${job.company || 'Unknown'}`, { job, groupName });

  const data = store.read();
  if (!data.resume) {
    addLog('info', 'No resume on file — skipping auto-apply');
    return;
  }

  let match;
  try {
    match = await matchJob(data.resume.text, job);
  } catch (err) {
    addLog('error', `Match scoring failed: ${err.message}`);
    return;
  }

  if (match.score < autoApplyThreshold) {
    addLog('job_skipped', `Skipped "${job.title}" — ${match.score}% match (threshold ${autoApplyThreshold}%)`, { score: match.score });
    return;
  }

  addLog('info', `Good match (${match.score}%) — applying to "${job.title}"…`);

  try {
    const [tailoredResume, coverLetter] = await Promise.all([
      tailorResume(data.resume.text, job, match.missingSkills || []),
      generateCoverLetter(data.resume.text, job)
    ]);
    const emailContent = await generateEmail(data.resume.analysis, job, coverLetter);

    const appId = uuidv4();
    store.update(d => {
      if (!d.applications) d.applications = [];
      d.applications.unshift({
        id: appId, job, match, coverLetter, tailoredResume,
        status: 'saved',
        applicationMethod: 'whatsapp',
        whatsappGroup: groupName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return d;
    });

    // Attempt email if contact found
    const emailTo = job.email || null;
    const cfg = getConfig();
    const canEmail = cfg.emailConfig.host && cfg.emailConfig.user && cfg.emailConfig.pass;

    if (canEmail && emailTo) {
      try {
        const structured = await structureResumeForPDF(tailoredResume);
        if (data.resume.analysis?.name && !structured.name) structured.name = data.resume.analysis.name;
        const pdfBuffer = await generateResumePDF(structured);
        const safeName = (structured.name || 'Applicant').replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, '_');
        await sendEmail({
          to: emailTo,
          subject: emailContent.subject,
          body: emailContent.body,
          attachments: [
            { filename: `${safeName}_Resume.pdf`, content: pdfBuffer, contentType: 'application/pdf' },
            { filename: `CoverLetter_${(job.company || 'Company').replace(/\s+/g, '_')}.txt`, content: coverLetter }
          ]
        });
        store.update(d => {
          const app = d.applications.find(a => a.id === appId);
          if (app) { app.status = 'applied'; app.emailSentTo = emailTo; app.updatedAt = new Date().toISOString(); }
          return d;
        });
        addLog('job_applied', `Applied to "${job.title}" at "${job.company}" — email sent to ${emailTo}`, { job, score: match.score });
      } catch (err) {
        addLog('job_applied', `Applied to "${job.title}" — saved (email failed: ${err.message})`, { job, score: match.score });
      }
    } else {
      addLog('job_applied', `Applied to "${job.title}" at "${job.company}" — documents ready${!emailTo ? ' (no email in posting)' : ''}`, { job, score: match.score });
    }
  } catch (err) {
    addLog('error', `Apply failed for "${job.title}": ${err.message}`);
  }
}

async function start() {
  if (client) return;

  let Client, LocalAuth, QR;
  try {
    ({ Client, LocalAuth } = require('whatsapp-web.js'));
    QR = require('qrcode');
  } catch {
    throw new Error('whatsapp-web.js not installed. Run: npm install whatsapp-web.js qrcode');
  }

  status = 'connecting';
  push('status', { status });
  addLog('info', 'Starting WhatsApp client…');

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '../../.wwebjs_auth') }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
  });

  client.on('qr', async (qr) => {
    try {
      currentQR = await QR.toDataURL(qr);
      status = 'qr';
      push('status', { status, qr: currentQR });
      addLog('info', 'QR code ready — scan with WhatsApp on your phone');
    } catch (err) {
      addLog('error', 'Failed to generate QR: ' + err.message);
    }
  });

  client.on('ready', async () => {
    status = 'ready';
    currentQR = null;
    push('status', { status });
    addLog('info', 'WhatsApp connected and monitoring');
    try {
      const chats = await client.getChats();
      groups = chats
        .filter(c => c.isGroup)
        .map(c => ({ id: c.id._serialized, name: c.name }));
      push('groups', groups);
    } catch {}
  });

  client.on('message', async (msg) => {
    if (!msg.from.endsWith('@g.us')) return; // only group messages
    try { await handleMessage(msg); } catch (err) { addLog('error', err.message); }
  });

  client.on('auth_failure', () => {
    addLog('error', 'WhatsApp authentication failed');
    status = 'disconnected';
    client = null;
    push('status', { status });
  });

  client.on('disconnected', (reason) => {
    addLog('info', `WhatsApp disconnected: ${reason}`);
    status = 'disconnected';
    client = null;
    currentQR = null;
    push('status', { status });
  });

  // Fire-and-forget — initialization is async (QR → scan → ready).
  // Status updates reach the frontend via SSE, not this HTTP response.
  client.initialize().catch(err => {
    addLog('error', 'Failed to start: ' + err.message);
    status = 'disconnected';
    client = null;
    push('status', { status });
  });
}

async function stop() {
  if (!client) return;
  try { await client.destroy(); } catch {}
  client = null;
  status = 'disconnected';
  currentQR = null;
  push('status', { status });
  addLog('info', 'WhatsApp bot stopped');
}

async function getGroups() {
  if (status !== 'ready' || !client) return [];
  try {
    const chats = await client.getChats();
    groups = chats.filter(c => c.isGroup).map(c => ({ id: c.id._serialized, name: c.name }));
  } catch {}
  return groups;
}

module.exports = {
  start,
  stop,
  getGroups,
  sseClients,
  getStatus: () => status,
  getCurrentQR: () => currentQR,
  setMonitoredGroups: (ids) => { monitoredGroups = new Set(ids); },
  getMonitoredGroups: () => [...monitoredGroups],
  setThreshold: (t) => { autoApplyThreshold = Math.max(0, Math.min(100, Number(t))); },
  getThreshold: () => autoApplyThreshold,
};
