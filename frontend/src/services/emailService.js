const nodemailer = require('nodemailer');

function isEmailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.EMAIL_FROM
  );
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendEmail({ to, subject, html, text }) {
  if (!to) {
    return { skipped: true, reason: 'Missing recipient email' };
  }

  if (!isEmailConfigured()) {
    return { skipped: true, reason: 'Email service not configured' };
  }

  const transporter = createTransporter();

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text: text || '',
    html: html || '',
  });

  return {
    skipped: false,
    messageId: info.messageId,
  };
}

async function sendWelcomeEmail(user) {
  if (!user?.email) {
    return { skipped: true, reason: 'User email missing' };
  }

  const appName = process.env.APP_NAME || 'VideoGad';
  const fullName = user.full_name || user.username || 'User';

  return sendEmail({
    to: user.email,
    subject: `Welcome to ${appName}`,
    text: `Hello ${fullName}, welcome to ${appName}. Your account has been created successfully.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
        <h2>Welcome to ${appName}</h2>
        <p>Hello ${fullName},</p>
        <p>Your account has been created successfully.</p>
        <p>We're glad to have you on ${appName}.</p>
      </div>
    `,
  });
}

async function sendLoginAlertEmail(user) {
  if (!user?.email) {
    return { skipped: true, reason: 'User email missing' };
  }

  const appName = process.env.APP_NAME || 'VideoGad';
  const fullName = user.full_name || user.username || 'User';

  return sendEmail({
    to: user.email,
    subject: `${appName} login alert`,
    text: `Hello ${fullName}, a login to your ${appName} account was just detected.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111;">
        <h2>${appName} Login Alert</h2>
        <p>Hello ${fullName},</p>
        <p>A login to your account was just detected.</p>
        <p>If this was you, no action is needed.</p>
      </div>
    `,
  });
}

module.exports = {
  isEmailConfigured,
  sendEmail,
  sendWelcomeEmail,
  sendLoginAlertEmail,
};