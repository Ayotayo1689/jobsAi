const express = require('express');
const whatsapp = require('../services/whatsappService');
const store = require('../data/store');

const router = express.Router();

// SSE — streams status, QR, and log events to the frontend
router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send current state immediately so the page loads with correct data
  const status = whatsapp.getStatus();
  const qr = whatsapp.getCurrentQR();
  res.write(`event: status\ndata: ${JSON.stringify({ status, qr })}\n\n`);

  whatsapp.sseClients.add(res);
  req.on('close', () => whatsapp.sseClients.delete(res));
});

router.post('/start', async (req, res) => {
  try {
    await whatsapp.start();
  } catch (err) {
    // Non-fatal — initialization errors stream via SSE
  }
  res.json({ status: whatsapp.getStatus() });
});

router.post('/stop', async (req, res) => {
  try {
    await whatsapp.stop();
    res.json({ status: 'disconnected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/status', (req, res) => {
  res.json({
    status: whatsapp.getStatus(),
    qr: whatsapp.getCurrentQR(),
    monitoredGroups: whatsapp.getMonitoredGroups(),
    threshold: whatsapp.getThreshold()
  });
});

router.get('/groups', async (req, res) => {
  try {
    const groups = await whatsapp.getGroups();
    res.json({ groups });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/logs', (req, res) => {
  const data = store.read();
  res.json({ logs: data.whatsappLogs || [] });
});

router.delete('/logs', (req, res) => {
  store.update(d => { d.whatsappLogs = []; return d; });
  res.json({ ok: true });
});

router.post('/settings', (req, res) => {
  const { monitoredGroups, threshold } = req.body;
  if (Array.isArray(monitoredGroups)) whatsapp.setMonitoredGroups(monitoredGroups);
  if (threshold != null) whatsapp.setThreshold(threshold);
  res.json({ monitoredGroups: whatsapp.getMonitoredGroups(), threshold: whatsapp.getThreshold() });
});

module.exports = router;
