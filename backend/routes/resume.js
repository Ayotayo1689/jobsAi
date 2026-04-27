const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { parseResume } = require('../services/resumeParser');
const { analyzeResume } = require('../services/claudeService');
const store = require('../data/store');

const router = express.Router();

const upload = multer({
  dest: path.join(__dirname, '../uploads/'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, and TXT files are allowed'));
    }
  }
});

router.post('/upload', upload.single('resume'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const filePath = req.file.path;

  try {
    const resumeText = await parseResume(filePath, req.file.mimetype);

    if (!resumeText || resumeText.trim().length < 50) {
      throw new Error('Could not extract text from resume. Please ensure the file is not scanned/image-based.');
    }

    const analysis = await analyzeResume(resumeText);

    store.update(data => {
      data.resume = {
        text: resumeText,
        analysis,
        filename: req.file.originalname,
        uploadedAt: new Date().toISOString()
      };
      return data;
    });

    fs.unlinkSync(filePath);

    res.json({ success: true, analysis });
  } catch (err) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: err.message });
  }
});

router.get('/', (req, res) => {
  const data = store.read();
  res.json({ resume: data.resume || null });
});

router.delete('/', (req, res) => {
  store.update(data => {
    data.resume = null;
    return data;
  });
  res.json({ success: true });
});

module.exports = router;
