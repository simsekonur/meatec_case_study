const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.AUTH_SERVICE_URL = 'http://auth-mock';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCESS_KEY_ID = 'test';
process.env.AWS_SECRET_ACCESS_KEY = 'test';
process.env.S3_ENDPOINT = 'http://localhost:4566';
process.env.S3_BUCKET = 'meatec-documents';

// ─── Mock Auth middleware ─────────────────────────────────────────────────────
jest.mock('../src/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { id: 'user-id-123', email: 'admin@test.com', role: 'admin' };
    next();
  },
  authorise: (...roles) => (req, res, next) => {
    const user = req.user || { role: 'admin' };
    if (!roles.includes(user.role)) return res.status(403).json({ success: false });
    next();
  },
}));

// ─── Mock S3 client ──────────────────────────────────────────────────────────
jest.mock('../src/config/s3', () => ({
  s3Client: { send: jest.fn().mockResolvedValue({}) },
  BUCKET: 'meatec-documents',
}));

// ─── Mock presigned URL ──────────────────────────────────────────────────────
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://mock-s3-url.com/file.pdf'),
}));

const app = require('../src/app');
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongoServer.getUri();
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) await collections[key].deleteMany({});
});

describe('POST /api/documents/upload', () => {
  it('should upload a file and return docId', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', 'Bearer mock-token')
      .attach('file', Buffer.from('hello world'), {
        filename: 'test.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.docId).toBeDefined();
    expect(res.body.fileName).toBe('test.pdf');
  });

  it('should return 400 if no file is attached', async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(400);
  });
});

describe('GET /api/documents/:docId', () => {
  let docId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', 'Bearer mock-token')
      .attach('file', Buffer.from('data'), { filename: 'doc.pdf', contentType: 'application/pdf' });
    docId = res.body.docId;
  });

  it('should return document with a download URL', async () => {
    const res = await request(app)
      .get(`/api/documents/${docId}`)
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(200);
    expect(res.body.downloadUrl).toBe('https://mock-s3-url.com/file.pdf');
  });

  it('should return 404 for non-existent document', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/documents/${fakeId}`)
      .set('Authorization', 'Bearer mock-token');
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/documents/:docId', () => {
  let docId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', 'Bearer mock-token')
      .attach('file', Buffer.from('data'), { filename: 'doc.pdf', contentType: 'application/pdf' });
    docId = res.body.docId;
  });

  it('should update document description', async () => {
    const res = await request(app)
      .put(`/api/documents/${docId}`)
      .set('Authorization', 'Bearer mock-token')
      .send({ description: 'Updated description' });

    expect(res.status).toBe(200);
    expect(res.body.doc.description).toBe('Updated description');
  });
});

describe('DELETE /api/documents/:docId', () => {
  let docId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', 'Bearer mock-token')
      .attach('file', Buffer.from('data'), { filename: 'doc.pdf', contentType: 'application/pdf' });
    docId = res.body.docId;
  });

  it('should delete the document', async () => {
    const res = await request(app)
      .delete(`/api/documents/${docId}`)
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(200);

    const check = await request(app)
      .get(`/api/documents/${docId}`)
      .set('Authorization', 'Bearer mock-token');
    expect(check.status).toBe(404);
  });
});
