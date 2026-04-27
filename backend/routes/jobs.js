const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { searchJobs } = require('../services/jobSearchService');
const { matchJob, tailorResume, generateCoverLetter, generateEmail, structureResumeForPDF, parseJobFromText } = require('../services/claudeService');
const { generateResumePDF } = require('../services/pdfService');
const { sendEmail } = require('../services/emailService');
const { getConfig } = require('../config');
const store = require('../data/store');

const router = express.Router();

// Build PDF buffer from tailored resume text
async function buildResumePDF(tailoredResume, candidateName) {
  const structured = await structureResumeForPDF(tailoredResume);
  if (candidateName && !structured.name) structured.name = candidateName;
  return { buffer: await generateResumePDF(structured), name: structured.name || candidateName || 'Applicant' };
}

// Match two job objects by URL (preferred) or title+company (fallback)
function isSameJob(a, b) {
  if (a.url && b.url) return a.url.trim() === b.url.trim();
  return (
    (a.title  || '').toLowerCase().trim() === (b.title  || '').toLowerCase().trim() &&
    (a.company|| '').toLowerCase().trim() === (b.company|| '').toLowerCase().trim()
  );
}

router.post('/search', async (req, res) => {
  try {
    const { preferences = {} } = req.body;
    const data = store.read();

    // Resume is optional when the user typed explicit keywords
    if (!data.resume && !preferences.keywords?.trim()) {
      return res.status(400).json({ error: 'Please upload your resume first, or enter keywords to search.' });
    }

    const resumeData = {
      role: data.resume?.analysis?.primaryRole || '',
      skills: data.resume?.analysis?.skills || []
    };

    const jobs = await searchJobs(resumeData, preferences);
    res.json({ jobs, total: jobs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/match', async (req, res) => {
  try {
    const { job } = req.body;
    if (!job) return res.status(400).json({ error: 'Job data required' });

    const data = store.read();
    if (!data.resume) return res.status(400).json({ error: 'Resume not found' });

    const match = await matchJob(data.resume.text, job);
    res.json(match);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/tailor', async (req, res) => {
  try {
    const { job, missingSkills } = req.body;
    const data = store.read();
    if (!data.resume) return res.status(400).json({ error: 'Resume not found' });

    const tailored = await tailorResume(data.resume.text, job, missingSkills || []);
    res.json({ tailoredResume: tailored });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/cover-letter', async (req, res) => {
  try {
    const { job } = req.body;
    const data = store.read();
    if (!data.resume) return res.status(400).json({ error: 'Resume not found' });

    const coverLetter = await generateCoverLetter(data.resume.text, job);
    res.json({ coverLetter });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate-email', async (req, res) => {
  try {
    const { job, coverLetter } = req.body;
    const data = store.read();
    if (!data.resume) return res.status(400).json({ error: 'Resume not found' });

    const email = await generateEmail(data.resume.analysis, job, coverLetter);
    res.json(email);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── One-click apply: runs all steps, attempts to send, returns full result ───
router.post('/apply', async (req, res) => {
  // Use SSE so the frontend gets live step updates
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const push = (event, payload) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
  };

  const { job, recruiterEmail } = req.body;

  try {
    const data = store.read();
    if (!data.resume) {
      push('error', { message: 'Please upload your resume first.' });
      return res.end();
    }

    // ── Step 1: Match ───────────────────────────────────────────────────────
    push('step', { key: 'match', status: 'loading' });
    const match = await matchJob(data.resume.text, job);
    push('step', { key: 'match', status: 'done', data: { score: match.score, missingSkills: match.missingSkills } });

    // ── Step 2: Tailor resume (addressing missing skills) ───────────────────
    push('step', { key: 'tailor', status: 'loading' });
    const tailoredResume = await tailorResume(data.resume.text, job, match.missingSkills || []);
    push('step', { key: 'tailor', status: 'done' });

    // ── Step 3: Cover letter ────────────────────────────────────────────────
    push('step', { key: 'cover', status: 'loading' });
    const coverLetter = await generateCoverLetter(data.resume.text, job);
    push('step', { key: 'cover', status: 'done' });

    // ── Step 4: Generate email body ─────────────────────────────────────────
    push('step', { key: 'email_gen', status: 'loading' });
    const emailContent = await generateEmail(data.resume.analysis, job, coverLetter);
    push('step', { key: 'email_gen', status: 'done' });

    // ── Save application to store (deduplicating by job) ───────────────────
    const currentData = store.read();
    const existingApp = (currentData.applications || []).find(a => isSameJob(a.job || {}, job));
    const appId = existingApp ? existingApp.id : uuidv4();

    store.update(d => {
      if (!d.applications) d.applications = [];
      if (existingApp) {
        const idx = d.applications.findIndex(a => a.id === appId);
        if (idx !== -1) {
          d.applications[idx] = {
            ...d.applications[idx],
            match,
            coverLetter,
            tailoredResume,
            updatedAt: new Date().toISOString()
          };
        }
      } else {
        d.applications.unshift({
          id: appId,
          job,
          match,
          coverLetter,
          tailoredResume,
          status: 'saved',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      return d;
    });

    // ── Step 5: Send email (attempt) ────────────────────────────────────────
    push('step', { key: 'send', status: 'loading' });

    let emailSent = false;
    let emailError = null;
    const cfg = getConfig();
    const canEmail = cfg.emailConfig.host && cfg.emailConfig.user && cfg.emailConfig.pass;

    if (!canEmail) {
      emailError = 'Email not configured. Download the documents below to apply manually.';
      push('step', { key: 'send', status: 'skipped', message: emailError });
    } else if (!recruiterEmail) {
      emailError = 'No recruiter email provided. Download the documents below to apply manually.';
      push('step', { key: 'send', status: 'skipped', message: emailError });
    } else {
      try {
        const { buffer: pdfBuffer, name: candidateName } = await buildResumePDF(tailoredResume, data.resume.analysis?.name);
        const safeName = candidateName.replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, '_');
        await sendEmail({
          to: recruiterEmail,
          subject: emailContent.subject,
          body: emailContent.body,
          attachments: [
            { filename: `${safeName}_Resume.pdf`, content: pdfBuffer, contentType: 'application/pdf' },
            { filename: `CoverLetter_${(job.company || 'Company').replace(/\s+/g, '_')}.txt`, content: coverLetter }
          ]
        });
        emailSent = true;
        store.update(d => {
          const app = d.applications.find(a => a.id === appId);
          if (app) {
            app.status = 'applied';
            app.appliedAt = new Date().toISOString();
            app.emailSentTo = recruiterEmail;
            app.updatedAt = new Date().toISOString();
          }
          return d;
        });
        push('step', { key: 'send', status: 'done' });
      } catch (err) {
        emailError = err.message;
        push('step', { key: 'send', status: 'error', message: err.message });
      }
    }

    // ── Done — send full payload ────────────────────────────────────────────
    push('done', {
      applicationId: appId,
      match,
      tailoredResume,
      coverLetter,
      email: emailContent,
      emailSent,
      emailError,
      jobUrl: job.url
    });

  } catch (err) {
    push('error', { message: err.message });
  }

  res.end();
});

// ─── Paste-to-apply: user pastes raw job text, AI processes + applies ────────
router.post('/paste-apply', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const push = (event, payload) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
  };

  const { jobText, recruiterEmail } = req.body;

  try {
    const data = store.read();
    if (!data.resume) {
      push('error', { message: 'Please upload your resume first.' });
      return res.end();
    }
    if (!jobText?.trim()) {
      push('error', { message: 'Please paste the job description.' });
      return res.end();
    }

    // ── Step 0: Parse job text ──────────────────────────────────────────────
    push('step', { key: 'parse', status: 'loading' });
    const job = await parseJobFromText(jobText);
    job.id = job.id || uuidv4();
    job.source = 'Manual';
    push('step', { key: 'parse', status: 'done', data: { title: job.title, company: job.company } });

    // Use email from parsed text if no override was provided
    const emailTo = recruiterEmail?.trim() || job.email || null;

    // ── Step 1: Match ───────────────────────────────────────────────────────
    push('step', { key: 'match', status: 'loading' });
    const match = await matchJob(data.resume.text, job);
    push('step', { key: 'match', status: 'done', data: { score: match.score } });

    // ── Step 2: Tailor resume ───────────────────────────────────────────────
    push('step', { key: 'tailor', status: 'loading' });
    const tailoredResume = await tailorResume(data.resume.text, job, match.missingSkills || []);
    push('step', { key: 'tailor', status: 'done' });

    // ── Step 3: Cover letter ────────────────────────────────────────────────
    push('step', { key: 'cover', status: 'loading' });
    const coverLetter = await generateCoverLetter(data.resume.text, job);
    push('step', { key: 'cover', status: 'done' });

    // ── Step 4: Email body ──────────────────────────────────────────────────
    push('step', { key: 'email_gen', status: 'loading' });
    const emailContent = await generateEmail(data.resume.analysis, job, coverLetter);
    push('step', { key: 'email_gen', status: 'done' });

    // ── Save application ────────────────────────────────────────────────────
    const appId = uuidv4();
    store.update(d => {
      if (!d.applications) d.applications = [];
      d.applications.unshift({
        id: appId,
        job,
        match,
        coverLetter,
        tailoredResume,
        status: 'saved',
        applicationMethod: 'pasted',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return d;
    });

    // ── Step 5: Send email ──────────────────────────────────────────────────
    push('step', { key: 'send', status: 'loading' });
    let emailSent = false;
    let emailError = null;
    const cfg = getConfig();
    const canEmail = cfg.emailConfig.host && cfg.emailConfig.user && cfg.emailConfig.pass;

    if (!canEmail) {
      emailError = 'Email not configured. Download documents below to apply manually.';
      push('step', { key: 'send', status: 'skipped', message: emailError });
    } else if (!emailTo) {
      emailError = 'No email address found in the job posting.';
      push('step', { key: 'send', status: 'skipped', message: emailError });
    } else {
      try {
        const { buffer: pdfBuffer, name: candidateName } = await buildResumePDF(tailoredResume, data.resume.analysis?.name);
        const safeName = candidateName.replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, '_');
        await sendEmail({
          to: emailTo,
          subject: emailContent.subject,
          body: emailContent.body,
          attachments: [
            { filename: `${safeName}_Resume.pdf`, content: pdfBuffer, contentType: 'application/pdf' },
            { filename: `CoverLetter_${(job.company || 'Company').replace(/\s+/g, '_')}.txt`, content: coverLetter }
          ]
        });
        emailSent = true;
        store.update(d => {
          const app = d.applications.find(a => a.id === appId);
          if (app) { app.status = 'applied'; app.emailSentTo = emailTo; app.updatedAt = new Date().toISOString(); }
          return d;
        });
        push('step', { key: 'send', status: 'done' });
      } catch (err) {
        emailError = err.message;
        push('step', { key: 'send', status: 'error', message: err.message });
      }
    }

    push('done', { applicationId: appId, job, match, tailoredResume, coverLetter, email: emailContent, emailSent, emailError, jobUrl: job.url });

  } catch (err) {
    push('error', { message: err.message });
  }

  res.end();
});

// ─── Generate + download tailored resume as formatted PDF ─────────────────────
router.post('/resume-pdf', async (req, res) => {
  try {
    const { tailoredResume, candidateName } = req.body;
    if (!tailoredResume) return res.status(400).json({ error: 'tailoredResume text is required' });

    // Use Claude to parse the plain text into clean sections
    const structured = await structureResumeForPDF(tailoredResume);

    // Override name if the caller provided one (e.g. from resume analysis)
    if (candidateName && !structured.name) structured.name = candidateName;

    const pdfBuffer = await generateResumePDF(structured);

    const safeName = (structured.name || candidateName || 'Resume').replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}_Tailored_Resume.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
