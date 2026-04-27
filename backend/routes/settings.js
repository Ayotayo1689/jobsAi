const express = require('express');
const store = require('../data/store');
const { getConfig, getEnvSources } = require('../config');

const router = express.Router();

router.get('/', (req, res) => {
  const config = getConfig();
  const envSources = getEnvSources();

  // Mask secrets before sending to frontend
  const mask = (val) => val ? val.substring(0, 4) + '••••••••' : '';

  res.json({
    settings: {
      claudeApiKey: config.claudeApiKey ? mask(config.claudeApiKey) : '',
      rapidApiKey:  config.rapidApiKey  ? mask(config.rapidApiKey)  : '',
      emailConfig: {
        host:     config.emailConfig.host,
        port:     config.emailConfig.port,
        secure:   config.emailConfig.secure,
        user:     config.emailConfig.user,
        pass:     config.emailConfig.pass ? '••••••••' : '',
        fromName: config.emailConfig.fromName
      }
    },
    // Tells the frontend which fields are locked because they come from .env
    envSources
  });
});

router.put('/', (req, res) => {
  const { claudeApiKey, rapidApiKey, emailConfig } = req.body;
  const envSources = getEnvSources();

  store.update(data => {
    if (!data.settings) data.settings = {};

    // Only update a field if it is NOT locked by .env
    if (claudeApiKey !== undefined && !envSources.claudeApiKey && !claudeApiKey.includes('••••')) {
      data.settings.claudeApiKey = claudeApiKey;
    }

    if (rapidApiKey !== undefined && !envSources.rapidApiKey) {
      data.settings.rapidApiKey = rapidApiKey;
    }

    if (emailConfig !== undefined) {
      if (!data.settings.emailConfig) data.settings.emailConfig = {};
      const cur = data.settings.emailConfig;

      if (!envSources.emailHost     && emailConfig.host     !== undefined) cur.host     = emailConfig.host;
      if (!envSources.emailPort     && emailConfig.port     !== undefined) cur.port     = emailConfig.port;
      if (!envSources.emailSecure   && emailConfig.secure   !== undefined) cur.secure   = emailConfig.secure;
      if (!envSources.emailUser     && emailConfig.user     !== undefined) cur.user     = emailConfig.user;
      if (!envSources.emailFromName && emailConfig.fromName !== undefined) cur.fromName = emailConfig.fromName;
      // Only update password if not locked AND not the placeholder mask
      if (!envSources.emailPass && emailConfig.pass && !emailConfig.pass.includes('••••')) {
        cur.pass = emailConfig.pass;
      }
    }

    return data;
  });

  res.json({ success: true });
});

module.exports = router;
