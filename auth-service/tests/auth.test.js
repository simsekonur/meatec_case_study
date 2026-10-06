const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Set env vars before loading app
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.BCRYPT_ROUNDS = '1'; // fast for tests

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

describe('POST /api/auth/register', () => {
  it('should register a new user and return a JWT', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      password: 'password123',
      role: 'user',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.user.role).toBe('user');
    expect(res.body.user.password).toBeUndefined(); // password never returned
  });

  it('should register an admin user', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('admin');
  });

  it('should return 409 if email is already registered', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'dup@example.com',
      password: 'password123',
    });

    const res = await request(app).post('/api/auth/register').send({
      email: 'dup@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already registered/i);
  });

  it('should return 422 for invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'not-an-email',
      password: 'password123',
    });
    expect(res.status).toBe(422);
  });

  it('should return 422 for short password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'valid@example.com',
      password: '123',
    });
    expect(res.status).toBe(422);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      email: 'login@example.com',
      password: 'password123',
      role: 'user',
    });
  });

  it('should log in and return a JWT', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@example.com',
      password: 'password123',
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('should return 401 for wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@example.com',
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
  });

  it('should return 401 for non-existent user', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'ghost@example.com',
      password: 'password123',
    });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/verify', () => {
  let token;

  beforeEach(async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'verify@example.com',
      password: 'password123',
      role: 'admin',
    });
    token = res.body.token;
  });

  it('should return decoded user for valid token', async () => {
    const res = await request(app)
      .post('/api/auth/verify')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('verify@example.com');
    expect(res.body.user.role).toBe('admin');
  });

  it('should return 401 for invalid token', async () => {
    const res = await request(app)
      .post('/api/auth/verify')
      .set('Authorization', 'Bearer invalidtoken');
    expect(res.status).toBe(401);
  });

  it('should return 401 if no token provided', async () => {
    const res = await request(app).post('/api/auth/verify');
    expect(res.status).toBe(401);
  });
});
