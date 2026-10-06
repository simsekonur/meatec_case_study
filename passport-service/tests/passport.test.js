const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// ─── Env before any imports ──────────────────────────────────────────────────
process.env.AUTH_SERVICE_URL = 'http://auth-service-mock';
process.env.KAFKA_BROKERS = 'localhost:9092';
process.env.KAFKA_CLIENT_ID = 'passport-test';

// ─── Mock Kafka producer (no real Kafka in tests) ────────────────────────────
jest.mock('../src/kafka/producer', () => ({
  connectProducer: jest.fn().mockResolvedValue(undefined),
  publishEvent: jest.fn().mockResolvedValue(undefined),
  disconnectProducer: jest.fn().mockResolvedValue(undefined),
}));

// ─── Mock Auth middleware (bypass HTTP call to Auth Service) ─────────────────
jest.mock('../src/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    // Inject a mock admin user by default; tests can override req.user
    req.user = req._mockUser || { id: 'user-admin-id', email: 'admin@test.com', role: 'admin' };
    next();
  },
  authorise: (...roles) => (req, res, next) => {
    const user = req.user || { role: 'admin' };
    if (!roles.includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    next();
  },
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
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

const samplePassportBody = {
  data: {
    generalInformation: {
      batteryIdentifier: 'BP-2024-011',
      batteryModel: { id: 'LM3-BAT-2024', modelName: 'GMC WZX1' },
      batteryMass: 450,
      batteryCategory: 'EV',
      batteryStatus: 'Original',
      manufacturingDate: '2024-01-15',
      manufacturingPlace: 'Gigafactory Nevada',
      warrantyPeriod: '8',
      manufacturerInformation: {
        manufacturerName: 'Tesla Inc',
        manufacturerIdentifier: 'TESLA-001',
      },
    },
    materialComposition: {
      batteryChemistry: 'LiFePO4',
      criticalRawMaterials: ['Lithium', 'Iron'],
      hazardousSubstances: [
        {
          substanceName: 'Lithium Hexafluorophosphate',
          chemicalFormula: 'LiPF6',
          casNumber: '21324-40-3',
        },
      ],
    },
    carbonFootprint: {
      totalCarbonFootprint: 850,
      measurementUnit: 'kg CO2e',
      methodology: 'Life Cycle Assessment (LCA)',
    },
  },
};

// ─── POST /api/passports ─────────────────────────────────────────────────────
describe('POST /api/passports', () => {
  it('should create a passport for admin user', async () => {
    const res = await request(app)
      .post('/api/passports')
      .set('Authorization', 'Bearer mock-token')
      .send(samplePassportBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.passport.data.generalInformation.batteryIdentifier).toBe('BP-2024-011');
  });

  it('should return 422 if batteryIdentifier is missing', async () => {
    const res = await request(app)
      .post('/api/passports')
      .set('Authorization', 'Bearer mock-token')
      .send({ data: { generalInformation: {} } });

    expect(res.status).toBe(422);
  });
});

// ─── GET /api/passports/:id ──────────────────────────────────────────────────
describe('GET /api/passports/:id', () => {
  let passportId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/passports')
      .set('Authorization', 'Bearer mock-token')
      .send(samplePassportBody);
    passportId = res.body.passport._id;
  });

  it('should retrieve a passport by ID', async () => {
    const res = await request(app)
      .get(`/api/passports/${passportId}`)
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(200);
    expect(res.body.passport._id).toBe(passportId);
  });

  it('should return 404 for non-existent passport', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/passports/${fakeId}`)
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(404);
  });

  it('should return 400 for invalid ID format', async () => {
    const res = await request(app)
      .get('/api/passports/not-a-valid-id')
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(400);
  });
});

// ─── PUT /api/passports/:id ──────────────────────────────────────────────────
describe('PUT /api/passports/:id', () => {
  let passportId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/passports')
      .set('Authorization', 'Bearer mock-token')
      .send(samplePassportBody);
    passportId = res.body.passport._id;
  });

  it('should update a passport', async () => {
    const updated = JSON.parse(JSON.stringify(samplePassportBody));
    updated.data.generalInformation.batteryIdentifier = 'BP-UPDATED-999';

    const res = await request(app)
      .put(`/api/passports/${passportId}`)
      .set('Authorization', 'Bearer mock-token')
      .send(updated);

    expect(res.status).toBe(200);
    expect(res.body.passport.data.generalInformation.batteryIdentifier).toBe('BP-UPDATED-999');
  });

  it('should return 404 for non-existent passport', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .put(`/api/passports/${fakeId}`)
      .set('Authorization', 'Bearer mock-token')
      .send(samplePassportBody);

    expect(res.status).toBe(404);
  });
});

// ─── DELETE /api/passports/:id ────────────────────────────────────────────────
describe('DELETE /api/passports/:id', () => {
  let passportId;

  beforeEach(async () => {
    const res = await request(app)
      .post('/api/passports')
      .set('Authorization', 'Bearer mock-token')
      .send(samplePassportBody);
    passportId = res.body.passport._id;
  });

  it('should delete a passport', async () => {
    const res = await request(app)
      .delete(`/api/passports/${passportId}`)
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it('should return 404 when deleting non-existent passport', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .delete(`/api/passports/${fakeId}`)
      .set('Authorization', 'Bearer mock-token');

    expect(res.status).toBe(404);
  });
});

// ─── Kafka event publishing ───────────────────────────────────────────────────
describe('Kafka events', () => {
  const { publishEvent } = require('../src/kafka/producer');

  it('should emit passport.created event on create', async () => {
    publishEvent.mockClear();
    await request(app)
      .post('/api/passports')
      .set('Authorization', 'Bearer mock-token')
      .send(samplePassportBody);

    expect(publishEvent).toHaveBeenCalledWith('passport.created', expect.objectContaining({
      batteryIdentifier: 'BP-2024-011',
    }));
  });
});
