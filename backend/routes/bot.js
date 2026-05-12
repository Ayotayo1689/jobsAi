const express = require('express');
const { getConfig } = require('../config');
const { fetchCards, getJobDetail } = require('../bot/scraper');
const { findEmail, resetFlags } = require('../bot/enricher');
const { save } = require('../bot/output');

const router = express.Router();

let isRunning   = false;
let shouldStop  = false;

router.get('/status', (_req, res) => {
  res.json({ running: isRunning });
});

router.post('/stop', (_req, res) => {
  if (isRunning) {
    shouldStop = true;
    res.json({ ok: true, message: 'Stop signal sent — finishing current job then stopping.' });
  } else {
    res.json({ ok: true, message: 'Bot is not running.' });
  }
});

router.post('/run', async (req, res) => {
  if (isRunning) {
    return res.status(409).json({ error: 'Bot is already running. Wait for it to finish or stop it.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setMaxListeners(50);
  res.flushHeaders();

  const push = (event, payload) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
  };

  const { jobTitle, location, linkedinCookie: cookieFromBody } = req.body;
  const cfg = getConfig();
  const linkedinCookie = cookieFromBody || cfg.linkedinCookie || '';
  const maxResults = parseInt(process.env.MAX_RESULTS) || 20;

  if (!jobTitle?.trim()) {
    push('error', { message: 'Job title is required to run the bot.' });
    return res.end();
  }

  isRunning  = true;
  shouldStop = false;
  resetFlags();

  try {
    // ── 1. Get job card list ────────────────────────────────────────────────
    push('progress', { message: `Searching LinkedIn for "${jobTitle}"${location ? ` in ${location}` : ' (all locations)'}…` });

    const cards = await fetchCards(jobTitle.trim(), location?.trim() || '', maxResults);

    if (!cards.length) {
      push('done', { results: [], total: 0, emailsFound: 0, filePath: null });
      return res.end();
    }

    push('progress', { message: `Found ${cards.length} listings — processing one by one…` });

    // ── 2. For each job: detail → enrich → emit ─────────────────────────────
    const results = [];

    for (let i = 0; i < cards.length; i++) {
      // Check stop signal before each job
      if (shouldStop) {
        push('progress', { message: `Stopped by user after ${i} job${i !== 1 ? 's' : ''}.` });
        break;
      }

      const card = cards[i];
      const num  = `[${i + 1}/${cards.length}]`;

      push('progress', { message: `${num} Fetching details — ${card.title} @ ${card.company}…` });
      const job = await getJobDetail(card, linkedinCookie);

      push('progress', { message: `${num} Looking up recruiter email — ${card.company}…` });
      let recruiterEmail = null;
      try {
        recruiterEmail = await findEmail({
          apolloKey:     cfg.apolloApiKey,
          hunterKey:     cfg.hunterApiKey,
          recruiterName: job.recruiterName,
          company:       job.company,
          companyDomain: job.companyDomain,
        });
      } catch (err) {
        console.warn(`Email lookup failed for ${job.company}:`, err.message);
      }

      const result = {
        jobTitle:       job.title,
        company:        job.company,
        jobDescription: job.description,
        jobUrl:         job.jobUrl,
        recruiterName:  job.recruiterName  || null,
        recruiterEmail: recruiterEmail     || null,
      };

      results.push(result);
      push('job', result);
      push('progress', {
        message: `${num} Done — ${job.title} @ ${job.company}${recruiterEmail ? ` ✓ ${recruiterEmail}` : ' (no email)'}`,
      });
    }

    // ── 3. Save & finish ────────────────────────────────────────────────────
    let filePath = null;
    try { filePath = save(results); } catch (err) {
      console.warn('Could not save results file:', err.message);
    }

    const emailsFound = results.filter(r => r.recruiterEmail).length;
    push('done', { results, total: results.length, emailsFound, filePath });

  } catch (err) {
    push('error', { message: err.message });
  } finally {
    isRunning  = false;
    shouldStop = false;
    res.end();
  }
});

module.exports = router;
