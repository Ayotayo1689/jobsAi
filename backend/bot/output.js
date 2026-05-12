const fs = require('fs');
const path = require('path');

function save(results) {
  const dir = path.join(__dirname, '../results');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
  const filePath = path.join(dir, `results_${stamp}.json`);

  fs.writeFileSync(filePath, JSON.stringify(results, null, 2), 'utf8');
  return filePath;
}

module.exports = { save };
