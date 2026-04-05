# ServifyEU

Europe's home services marketplace — connecting customers with vetted service professionals across UK, Germany, France, Netherlands, and Spain.

## Architecture

```
servify-eu/
├── apps/
│   ├── api/              # Fastify REST API (port 3000)
│   ├── customer-web/     # Next.js 14 customer app (port 3001)
│   ├── provider-web/     # Next.js 14 provider app (port 3002)
│   ├── admin-web/        # React + Vite admin dashboard (port 3003)
│   └── ai-agent/         # AI customer service agent (port 3004)
├── packages/
│   ├── database/         # Prisma schema + migrations
│   ├── shared-types/     # TypeScript types
│   ├── shared-utils/     # Utility functions
│   ├── ui/               # Shared component library
│   └── config/           # Shared tooling configs
└── infrastructure/
    ├── docker/           # Dockerfiles
    ├── k8s/              # Kubernetes manifests
    └── terraform/        # AWS infrastructure
```

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker + Docker Compose
- PostgreSQL 15 (via Docker)
- Redis 7 (via Docker)

## Quick Start

### 1. Clone and install

```bash
git clone <repo>
cd servify-eu
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 3. Start infrastructure

```bash
docker-compose up -d
# Starts: PostgreSQL, Redis, Meilisearch, MinIO, MailHog
```

### 4. Set up database

```bash
cd packages/database
pnpm prisma migrate dev --name init
pnpm db:seed
```

### 5. Start development servers

```bash
# From root — starts all apps
pnpm dev

# Or individually:
pnpm --filter @servify/api dev          # API on :3000
pnpm --filter @servify/customer-web dev  # Customer on :3001
pnpm --filter @servify/ai-agent dev      # AI Agent on :3004
```

### 6. Access services

| Service | URL |
|---|---|
| Customer App | http://localhost:3001/en |
| API | http://localhost:3000 |
| AI Agent | http://localhost:3004 |
| MailHog (email) | http://localhost:8025 |
| MinIO (storage) | http://localhost:9001 |
| Meilisearch | http://localhost:7700 |

### Test credentials (after seed)

| Role | Email | Password |
|---|---|---|
| Customer | customer@servifyeu-test.com | Password123! |
| Admin | admin@servifyeu.com | Password123! |
| Provider | provider1@servifyeu-seed.com | Password123! |

## Running Tests

```bash
# All tests
pnpm test

# API tests only
pnpm --filter @servify/api test

# With coverage
pnpm --filter @servify/api test -- --coverage
```

## Code Quality

```bash
pnpm lint        # ESLint across all packages
pnpm typecheck   # TypeScript across all packages
pnpm build       # Build all packages
```

## Key Features

- **Booking system**: Full lifecycle from search → book → pay → complete → review
- **Multi-language**: English, German, French, Dutch, Spanish
- **Multi-currency**: EUR + GBP
- **AI Customer Service**: Aria AI agent handles chat, email, and voice support
- **GDPR compliance**: Data export, right to erasure, consent management
- **Payments**: Stripe with PSD2/SCA, SEPA, iDEAL, Klarna
- **Provider KYC**: Document upload and admin review workflow

## Tech Stack

- **API**: Fastify + TypeScript + Prisma + PostgreSQL
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **AI Agent**: Anthropic Claude API + Socket.io
- **Queue**: BullMQ + Redis
- **Search**: Meilisearch
- **Payments**: Stripe Connect
- **Infrastructure**: Docker, Kubernetes, AWS eu-west-1

## Environment Variables

See `.env.example` for all required variables.

## Deployment

```bash
# Build Docker images
docker build -f infrastructure/docker/api.Dockerfile -t servify-api .
docker build -f infrastructure/docker/customer-web.Dockerfile -t servify-customer-web .
docker build -f infrastructure/docker/ai-agent.Dockerfile -t servify-ai-agent .
```

CI/CD via GitHub Actions — push to `main` triggers deploy to AWS EKS.

## Compliance

- GDPR / UK GDPR compliant
- EU data residency (AWS eu-west-1)
- PSD2 Strong Customer Authentication
- DSGVO (Germany)
- All customer data encrypted at rest
