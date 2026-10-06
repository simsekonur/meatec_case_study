# MEAtec Battery Passport Platform — Backend

A microservices-based backend system for managing digital battery passports, built for the EU EV sustainability ecosystem.

---

## Architecture Overview

```
┌──────────────┐   HTTP/JWT    ┌──────────────────┐   HTTP/JWT   ┌──────────────────┐
│    Client    │──────────────►│  Auth Service    │◄────────────│ Passport Service │
│  (Postman /  │               │  :3001           │             │  :3002           │
│   Frontend)  │               └──────────────────┘             └────────┬─────────┘
│              │──────────────────────────────────────────────────────────┘
│              │   HTTP/JWT    ┌──────────────────┐              │ Kafka events
│              │──────────────►│ Document Service │              ▼
│              │               │  :3003           │   ┌──────────────────────┐
└──────────────┘               └──────────────────┘   │ Notification Service │
                                                       │  (Kafka Consumer)    │
                                                       │  → Mailtrap SMTP     │
                                                       └──────────────────────┘
```

### Services

| Service | Port | Description |
|---|---|---|
| `auth-service` | 3001 | User registration, login, JWT issuance, token verification |
| `passport-service` | 3002 | Battery passport CRUD, Kafka event emission |
| `document-service` | 3003 | File upload to S3, metadata management |
| `notification-service` | — | Kafka consumer, sends email notifications via SMTP |

### Communication Patterns

- **Synchronous HTTP**: `passport-service` and `document-service` call `auth-service` to verify JWTs on every protected request
- **Asynchronous Kafka**: `passport-service` emits `passport.created`, `passport.updated`, `passport.deleted` events that `notification-service` consumes

---

## Tech Stack

- **Runtime**: Node.js 20 + Express.js
- **Database**: MongoDB 7 (via Mongoose)
- **Message Broker**: Apache Kafka (via KafkaJS)
- **File Storage**: AWS S3-compatible via LocalStack
- **Authentication**: JWT + bcrypt
- **Email**: Nodemailer + Mailtrap SMTP
- **Docs**: Swagger UI (OpenAPI 3.0)
- **Logging**: Winston
- **Testing**: Jest + Supertest + MongoMemoryServer
- **Infrastructure**: Docker + Docker Compose

---

## Setup & Running

### Prerequisites

- Docker Desktop
- Node.js 20+
- npm

### 1. Clone and configure

```bash
git clone <repo-url>
cd meatec_case_study
```

Create root `.env`:
```bash
cp .env.example .env
# Edit .env and fill in MONGO_ROOT_USER, MONGO_ROOT_PASS
```

Configure each service's `.env`:

```bash
# auth-service/.env
PORT=3001
MONGO_URI=mongodb://<MONGO_ROOT_USER>:<MONGO_ROOT_PASS>@localhost:27018/auth_db?authSource=admin
JWT_SECRET=your_strong_jwt_secret_here
JWT_EXPIRES_IN=1d
BCRYPT_ROUNDS=12

# passport-service/.env
PORT=3002
MONGO_URI=mongodb://<MONGO_ROOT_USER>:<MONGO_ROOT_PASS>@localhost:27018/passport_db?authSource=admin
AUTH_SERVICE_URL=http://localhost:3001
KAFKA_BROKERS=localhost:9092

# document-service/.env
PORT=3003
MONGO_URI=mongodb://<MONGO_ROOT_USER>:<MONGO_ROOT_PASS>@localhost:27018/document_db?authSource=admin
AUTH_SERVICE_URL=http://localhost:3001
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
S3_ENDPOINT=http://localhost:4566
S3_BUCKET=meatec-documents

# notification-service/.env
KAFKA_BROKERS=localhost:9092
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_mailtrap_user
SMTP_PASS=your_mailtrap_password
EMAIL_FROM=noreply@meatec-battery.com
NOTIFY_TO=admin@meatec-battery.com
```

### 2. Start infrastructure

```bash
docker compose up mongo kafka zookeeper localstack -d
```

### 3. Create S3 bucket in LocalStack

```bash
docker exec meatec_localstack awslocal s3 mb s3://meatec-documents --region us-east-1
```

### 4a. Run with Docker (full stack)

```bash
docker compose up --build
```

### 4b. Run locally (development)

```bash
# Terminal 1
cd auth-service && npm run dev

# Terminal 2
cd passport-service && npm run dev

# Terminal 3
cd document-service && npm run dev

# Terminal 4
cd notification-service && npm run dev
```

### 5. Run tests

```bash
cd auth-service && npm test
cd passport-service && npm test
cd document-service && npm test
cd notification-service && npm test
```

---

## API Reference

### Auth Service — `http://localhost:3001`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register user |
| POST | `/api/auth/login` | Public | Login, returns JWT |
| POST | `/api/auth/verify` | Internal | Verify JWT (used by other services) |

**Register body:**
```json
{
  "email": "admin@example.com",
  "password": "password123",
  "role": "admin"
}
```

**Login body:**
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

---

### Passport Service — `http://localhost:3002`

All endpoints require `Authorization: Bearer <token>` header.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/passports` | admin | Create passport |
| GET | `/api/passports/:id` | admin, user | Get passport |
| PUT | `/api/passports/:id` | admin | Update passport |
| DELETE | `/api/passports/:id` | admin | Delete passport |

**Sample passport body:**
```json
{
  "data": {
    "generalInformation": {
      "batteryIdentifier": "BP-2024-011",
      "batteryModel": { "id": "LM3-BAT-2024", "modelName": "GMC WZX1" },
      "batteryMass": 450,
      "batteryCategory": "EV",
      "batteryStatus": "Original",
      "manufacturingDate": "2024-01-15",
      "manufacturingPlace": "Gigafactory Nevada",
      "warrantyPeriod": "8",
      "manufacturerInformation": {
        "manufacturerName": "Tesla Inc",
        "manufacturerIdentifier": "TESLA-001"
      }
    },
    "materialComposition": {
      "batteryChemistry": "LiFePO4",
      "criticalRawMaterials": ["Lithium", "Iron"],
      "hazardousSubstances": [{
        "substanceName": "Lithium Hexafluorophosphate",
        "chemicalFormula": "LiPF6",
        "casNumber": "21324-40-3"
      }]
    },
    "carbonFootprint": {
      "totalCarbonFootprint": 850,
      "measurementUnit": "kg CO2e",
      "methodology": "Life Cycle Assessment (LCA)"
    }
  }
}
```

---

### Document Service — `http://localhost:3003`

All endpoints require `Authorization: Bearer <token>` header.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/documents/upload` | any auth | Upload file (multipart/form-data) |
| GET | `/api/documents/:docId` | any auth | Get pre-signed download URL (15 min) |
| PUT | `/api/documents/:docId` | any auth | Update document description |
| DELETE | `/api/documents/:docId` | admin | Delete file + metadata |

**Upload (multipart/form-data):**
```
field: file  → the file binary
field: description  → optional string
```

**Response:**
```json
{
  "docId": "6ac50faf...",
  "fileName": "report.pdf",
  "createdAt": "2026-10-06T14:00:00.000Z"
}
```

---

## Kafka Topics & Payload Structure

| Topic | Emitted By | Consumed By | Description |
|---|---|---|---|
| `passport.created` | passport-service | notification-service | New passport created |
| `passport.updated` | passport-service | notification-service | Passport data changed |
| `passport.deleted` | passport-service | notification-service | Passport removed |

**Payload structure (all topics):**
```json
{
  "passportId": "6ac505a7...",
  "batteryIdentifier": "BP-2024-011",
  "createdBy": "6ac504103...",
  "timestamp": "2026-10-06T14:28:55.316Z"
}
```
> `updatedBy` and `deletedBy` replace `createdBy` in their respective events.

---

## Swagger Docs

| Service | URL |
|---|---|
| Auth Service | http://localhost:3001/api-docs |
| Passport Service | http://localhost:3002/api-docs |
| Document Service | http://localhost:3003/api-docs |

---

## MongoDB Connection Strings

For MongoDB Compass or similar tools (replace with your configured credentials):
```
mongodb://<MONGO_ROOT_USER>:<MONGO_ROOT_PASS>@localhost:27018
```

| Database | Collection | Contents |
|---|---|---|
| `auth_db` | `users` | Registered users |
| `passport_db` | `batterypassports` | Battery passports |
| `document_db` | `documents` | File metadata |