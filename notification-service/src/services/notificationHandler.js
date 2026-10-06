const { sendEmail } = require('../services/emailService');

/**
 * Build and send an email for a given Kafka event topic + payload.
 * All logic for subject/body is centralised here.
 */
const handleEvent = async (topic, payload) => {
  const { passportId, batteryIdentifier, createdBy, updatedBy, deletedBy, timestamp } = payload;

  const templates = {
    'passport.created': {
      subject: '🔋 Battery Passport Created',
      html: `
        <h2>New Battery Passport Created</h2>
        <table style="border-collapse:collapse">
          <tr><td><strong>Passport ID:</strong></td><td>${passportId}</td></tr>
          <tr><td><strong>Battery Identifier:</strong></td><td>${batteryIdentifier || 'N/A'}</td></tr>
          <tr><td><strong>Created By (User ID):</strong></td><td>${createdBy}</td></tr>
          <tr><td><strong>Timestamp:</strong></td><td>${timestamp}</td></tr>
        </table>
      `,
      text: `Battery Passport Created\nID: ${passportId}\nBattery: ${batteryIdentifier}\nBy: ${createdBy}\nAt: ${timestamp}`,
    },
    'passport.updated': {
      subject: '✏️ Battery Passport Updated',
      html: `
        <h2>Battery Passport Updated</h2>
        <table style="border-collapse:collapse">
          <tr><td><strong>Passport ID:</strong></td><td>${passportId}</td></tr>
          <tr><td><strong>Battery Identifier:</strong></td><td>${batteryIdentifier || 'N/A'}</td></tr>
          <tr><td><strong>Updated By (User ID):</strong></td><td>${updatedBy}</td></tr>
          <tr><td><strong>Timestamp:</strong></td><td>${timestamp}</td></tr>
        </table>
      `,
      text: `Battery Passport Updated\nID: ${passportId}\nBattery: ${batteryIdentifier}\nBy: ${updatedBy}\nAt: ${timestamp}`,
    },
    'passport.deleted': {
      subject: '🗑️ Battery Passport Deleted',
      html: `
        <h2>Battery Passport Deleted</h2>
        <table style="border-collapse:collapse">
          <tr><td><strong>Passport ID:</strong></td><td>${passportId}</td></tr>
          <tr><td><strong>Battery Identifier:</strong></td><td>${batteryIdentifier || 'N/A'}</td></tr>
          <tr><td><strong>Deleted By (User ID):</strong></td><td>${deletedBy}</td></tr>
          <tr><td><strong>Timestamp:</strong></td><td>${timestamp}</td></tr>
        </table>
      `,
      text: `Battery Passport Deleted\nID: ${passportId}\nBattery: ${batteryIdentifier}\nBy: ${deletedBy}\nAt: ${timestamp}`,
    },
  };

  const template = templates[topic];
  if (!template) return; // unknown topic, skip

  await sendEmail(template);
};

module.exports = { handleEvent };
