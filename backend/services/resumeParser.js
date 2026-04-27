const fs = require('fs');
const path = require('path');

async function parsePDF(filePath) {
  const pdfParse = require('pdf-parse');
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

async function parseDOCX(filePath) {
  const mammoth = require('mammoth');
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

function parseTXT(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

async function parseResume(filePath, mimetype) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf' || (mimetype && mimetype.includes('pdf'))) {
    return await parsePDF(filePath);
  } else if (ext === '.docx' || (mimetype && mimetype.includes('wordprocessingml'))) {
    return await parseDOCX(filePath);
  } else if (ext === '.txt' || (mimetype && mimetype.includes('text/plain'))) {
    return parseTXT(filePath);
  } else {
    throw new Error(`Unsupported file type: ${ext}. Please upload PDF, DOCX, or TXT.`);
  }
}

module.exports = { parseResume };
