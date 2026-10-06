// ─── Mock dependencies ─────────────────────────────────────────────────────
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    verify: jest.fn().mockResolvedValue(true),
    sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-message-id-123' }),
  })),
}));

const { sendEmail } = require('../src/services/emailService');
const { handleEvent } = require('../src/services/notificationHandler');

describe('emailService.sendEmail', () => {
  beforeEach(() => {
    process.env.SMTP_HOST = 'sandbox.smtp.mailtrap.io';
    process.env.SMTP_PORT = '2525';
    process.env.SMTP_USER = 'testuser';
    process.env.SMTP_PASS = 'testpass';
    process.env.EMAIL_FROM = 'noreply@test.com';
    process.env.NOTIFY_TO = 'admin@test.com';
  });

  it('should send an email successfully', async () => {
    const result = await sendEmail({
      subject: 'Test Subject',
      html: '<p>Test</p>',
      text: 'Test',
    });
    expect(result.messageId).toBe('mock-message-id-123');
  });
});

describe('notificationHandler.handleEvent', () => {
  const mockPayload = {
    passportId: 'abc123',
    batteryIdentifier: 'BP-2024-011',
    createdBy: 'user-id-456',
    updatedBy: 'user-id-456',
    deletedBy: 'user-id-456',
    timestamp: new Date().toISOString(),
  };

  it('should handle passport.created event', async () => {
    await expect(handleEvent('passport.created', mockPayload)).resolves.not.toThrow();
  });

  it('should handle passport.updated event', async () => {
    await expect(handleEvent('passport.updated', mockPayload)).resolves.not.toThrow();
  });

  it('should handle passport.deleted event', async () => {
    await expect(handleEvent('passport.deleted', mockPayload)).resolves.not.toThrow();
  });

  it('should silently skip unknown topics', async () => {
    await expect(handleEvent('unknown.topic', mockPayload)).resolves.not.toThrow();
  });
});
