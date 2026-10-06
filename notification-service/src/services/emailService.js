const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Create reusable transporter using Mailtrap SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10) || 2525,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Verify SMTP connection on startup
 */
const verifyConnection = async () => {
  try {
    await transporter.verify();
    logger.info('SMTP connection verified ✓');
  } catch (err) {
    logger.warn(`SMTP connection failed (emails will be skipped): ${err.message}`);
  }
};

/**
 * Send an email notification
 * @param {object} options - { subject, html, text }
 */
const sendEmail = async ({ subject, html, text }) => {
  const from = process.env.EMAIL_FROM || 'noreply@meatec-battery.com';
  const to = process.env.NOTIFY_TO || 'admin@meatec-battery.com';

  logger.info(`[Email Dispatch] Preparing to send email → To: ${to} | From: ${from} | Subject: "${subject}"`);

  try {
    const info = await transporter.sendMail({ from, to, subject, html, text });
    logger.info(`[Email Dispatch] Email sent successfully → messageId: ${info.messageId}`);
    return info;
  } catch (err) {
    logger.error(`[Email Dispatch] Email send failed: ${err.message}`);
    throw err;
  }
};

module.exports = { sendEmail, verifyConnection };
