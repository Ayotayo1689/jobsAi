const nodemailer = require('nodemailer');
const { getConfig } = require('../config');

async function sendEmail({ to, subject, body, attachments = [] }) {
  const { emailConfig } = getConfig();

  if (!emailConfig.host || !emailConfig.user || !emailConfig.pass) {
    throw new Error(
      'Email not configured. Set SMTP_HOST / SMTP_USER / SMTP_PASS in .env, or fill in the Settings page.'
    );
  }

  const transporter = nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port || 587,
    secure: emailConfig.secure || false,
    auth: { user: emailConfig.user, pass: emailConfig.pass }
  });

  await transporter.verify();

  const info = await transporter.sendMail({
    from: `"${emailConfig.fromName || 'JobsAI'}" <${emailConfig.user}>`,
    to,
    subject,
    text: body,
    attachments: attachments.map(a => {
      // Buffer attachments (e.g. PDF) — no encoding field, set contentType
      if (Buffer.isBuffer(a.content)) {
        return { filename: a.filename, content: a.content, contentType: a.contentType || 'application/octet-stream' };
      }
      return { filename: a.filename, content: a.content, encoding: a.encoding || 'utf8' };
    })
  });

  return { messageId: info.messageId, accepted: info.accepted };
}

module.exports = { sendEmail };
