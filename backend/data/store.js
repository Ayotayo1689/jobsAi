const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

const defaultData = {
  resume: null,
  applications: [],
  whatsappLogs: [],
  settings: {
    claudeApiKey: '',
    emailConfig: {
      host: '',
      port: 587,
      secure: false,
      user: '',
      pass: ''
    }
  }
};

function read() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      write(defaultData);
      return JSON.parse(JSON.stringify(defaultData));
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return JSON.parse(JSON.stringify(defaultData));
  }
}

function write(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function update(updater) {
  const data = read();
  const updated = updater(data);
  write(updated);
  return updated;
}

module.exports = { read, write, update };
