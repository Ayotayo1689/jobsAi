const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { sendEmail } = require('../services/emailService');
const { tailorResume } = require('../services/claudeService');
const store = require('../data/store');

const router = express.Router();

router.get('/', (req, res) => {
  const data = store.read();
  res.json({ applications: data.applications || [] });
});

router.post('/', (req, res) => {
  const { job, coverLetter, tailoredResume, status = 'saved' } = req.body;
  if (!job) return res.status(400).json({ error: 'Job data required' });

  const application = {
    id: uuidv4(),
    job,
    coverLetter: coverLetter || '',
    tailoredResume: tailoredResume || '',
    status,
    notes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  store.update(data => {
    if (!data.applications) data.applications = [];
    data.applications.unshift(application);
    return data;
  });

  res.json({ application });
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  let updated = null;

  store.update(data => {
    const idx = data.applications.findIndex(a => a.id === id);
    if (idx !== -1) {
      data.applications[idx] = {
        ...data.applications[idx],
        ...updates,
        id,
        updatedAt: new Date().toISOString()
      };
      updated = data.applications[idx];
    }
    return data;
  });

  if (!updated) return res.status(404).json({ error: 'Application not found' });
  res.json({ application: updated });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  store.update(data => {
    data.applications = data.applications.filter(a => a.id !== id);
    return data;
  });
  res.json({ success: true });
});

router.post('/send-email', async (req, res) => {
  try {
    const { applicationId, to, subject, body } = req.body;
    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'to, subject, and body are required' });
    }

    await sendEmail({ to, subject, body });

    if (applicationId) {
      store.update(d => {
        const app = d.applications.find(a => a.id === applicationId);
        if (app) {
          app.status = 'applied';
          app.appliedAt = new Date().toISOString();
          app.emailSentTo = to;
          app.updatedAt = new Date().toISOString();
        }
        return d;
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/retailor', async (req, res) => {
  try {
    const { id } = req.params;
    const data = store.read();

    const app = (data.applications || []).find(a => a.id === id);
    if (!app) return res.status(404).json({ error: 'Application not found' });
    if (!data.resume) return res.status(400).json({ error: 'Resume not found. Please upload your resume first.' });

    const missingSkills = app.match?.missingSkills || [];
    const newTailoredResume = await tailorResume(data.resume.text, app.job, missingSkills);

    store.update(d => {
      const idx = d.applications.findIndex(a => a.id === id);
      if (idx !== -1) {
        d.applications[idx].tailoredResume = newTailoredResume;
        d.applications[idx].updatedAt = new Date().toISOString();
      }
      return d;
    });

    res.json({ tailoredResume: newTailoredResume });
  } catch (err) {
    console.error('Retailor error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
