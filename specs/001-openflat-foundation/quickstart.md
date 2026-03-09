# Quickstart Guide: OpenFlat Foundation

**Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md)

---

## Prerequisites

| Tool | Minimum Version | Purpose |
|------|----------------|---------|
| [.NET SDK](https://dotnet.microsoft.com/download) | 10.0 | Backend APIs, Aspire AppHost, Migration Service |
| [.NET Aspire workload](https://learn.microsoft.com/dotnet/aspire/) | 13.x | `dotnet workload install aspire` |
| [Node.js](https://nodejs.org/) | 22 LTS | Frontend (Vite), Mobile (Expo) |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Latest | PostgreSQL container (managed by Aspire) |
| [Expo CLI](https://docs.expo.dev/get-started/installation/) | Latest | `npx expo` — mobile development |
| [Expo Go](https://expo.dev/go) (iOS/Android) | SDK 54+ | Testing mobile app on physical devices |

> **Note**: Docker must be running before starting the Aspire AppHost. Aspire automatically provisions a PostgreSQL container.

---

## Getting Started

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd OpenFlat

# Install Aspire workload (if not already installed)
dotnet workload install aspire

# Install frontend dependencies
cd frontend && npm install && cd ..

# Install mobile dependencies
cd mobile && npm install && cd ..
```

### 2. Run the Application

```bash
# Start everything via Aspire AppHost
cd OpenFlat.AppHost
dotnet run
```

This single command orchestrates:
- **PostgreSQL** container (port 5432, managed by Aspire)
- **Migration Service** — runs EF Core migrations for all 3 schemas, seeds data, then stops
- **Cleaning API** — recurring checklist tasks with effort presets, round-robin rotation, and gamification; SignalR hub at `/hubs/cleaning`
- **Shopping API** — with SignalR hub at `/hubs/shopping`
- **Finance API** — REST-only (no hub)
- **React Frontend** — Vite dev server with HMR

### 3. Access the Application

| Resource | URL | Description |
|----------|-----|-------------|
| Aspire Dashboard | `https://localhost:17222` | Health checks, logs, traces for all services |
| Web Frontend | `http://localhost:5173` | React app (user selection → dashboard → modules) |
| Cleaning API | `https://localhost:{port}/api/tasks` | Auto-assigned port (see Aspire dashboard) |
| Shopping API | `https://localhost:{port}/api/items` | Auto-assigned port (see Aspire dashboard) |
| Finance API | `https://localhost:{port}/api/expenses` | Auto-assigned port (see Aspire dashboard) |

> API ports are dynamically assigned by Aspire. Check the Aspire Dashboard for the exact URLs.

### 4. Run Mobile App (Optional)

```bash
cd mobile

# Start Expo dev server
npx expo start

# Options:
# - Press 'i' for iOS Simulator
# - Press 'a' for Android Emulator
# - Scan QR code with Expo Go on physical device
```

> **Important**: The mobile app connects to the backend APIs via your machine's local network IP (not `localhost`). Expo automatically resolves this when running on the same network.

---

## Development Workflow

### Backend Changes

```bash
# APIs hot-reload automatically with dotnet watch (configured in Aspire AppHost)
# To manually restart:
cd OpenFlat.AppHost && dotnet run
```

### Frontend Changes (Web)

```bash
# Vite HMR handles auto-refresh
# To rebuild from scratch:
cd frontend && npm run dev
```

### Database Migrations

```bash
# Add a migration for the Cleaning schema
cd backend/OpenFlat.Cleaning.Api
dotnet ef migrations add <MigrationName> --context CleaningDbContext

# Add a migration for the Shopping schema
cd backend/OpenFlat.Shopping.Api
dotnet ef migrations add <MigrationName> --context ShoppingDbContext

# Add a migration for the Finance schema
cd backend/OpenFlat.Finance.Api
dotnet ef migrations add <MigrationName> --context FinanceDbContext

# Migrations run automatically at startup via the MigrationService
```

### Running Tests

```bash
# Backend unit + integration tests
dotnet test

# Frontend unit tests
cd frontend && npm test

# Frontend E2E tests (requires running app)
cd frontend && npx playwright test

# Mobile tests
cd mobile && npm test
```

---

## Project Structure Overview

```
OpenFlat/
├── OpenFlat.AppHost/           # Aspire orchestrator — start here
├── OpenFlat.ServiceDefaults/   # Shared service configuration
├── OpenFlat.MigrationService/  # DB migrations + seeding
├── backend/
│   ├── OpenFlat.Cleaning.Api/  # Recurring cleaning tasks with rotation
│   ├── OpenFlat.Shopping.Api/  # Shopping List module
│   ├── OpenFlat.Finance.Api/   # Finance Tracker module
│   ├── OpenFlat.Shared/        # Shared constants, DTOs
│   └── tests/                  # Test projects
├── frontend/                   # React web app (Vite)
├── mobile/                     # Expo React Native app
├── shared/                     # Cross-platform resources (locales, types)
└── specs/                      # Feature specifications
```

---

## Predefined Users

The app ships with 5 hardcoded users (no registration/login):

| ID | Name | Role |
|----|------|------|
| 1 | Alex | Coordinator |
| 2 | Jordan | Coordinator |
| 3 | Sam | Resident |
| 4 | Taylor | Resident |
| 5 | Casey | Resident |

Select a user on the first screen to begin using the app.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Docker not running | Start Docker Desktop before `dotnet run` |
| Port conflict on 5432 | Stop any local PostgreSQL or change Aspire config |
| Migration fails | Check PostgreSQL container is healthy in Aspire Dashboard |
| Mobile can't reach API | Ensure phone and dev machine are on the same Wi-Fi network |
| `aspire` workload not found | Run `dotnet workload install aspire` and restart terminal |
| Expo Go version mismatch | Update Expo Go app to match SDK version in `app.json` |
