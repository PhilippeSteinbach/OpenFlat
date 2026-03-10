# OpenFlat Copilot Instructions

OpenFlat is a self-hostable hub for shared living (WGs/flatshares) with gamified cleaning schedules, shared shopping lists, and expense tracking. It's a **modular monorepo** with a .NET 10 backend, React 19 web frontend, and React Native (Expo) mobile app.

For deeper, role-specific guidance see:
- [`backend/.github/expert-dotnet-software-engineer.agent.md`](../backend/.github/expert-dotnet-software-engineer.agent.md)
- [`frontend/.github/expert-react-frontend-engineer.agent.md`](../frontend/.github/expert-react-frontend-engineer.agent.md)

---

## Repository Structure

```
OpenFlat.AppHost/          # .NET Aspire orchestrator (starts everything in dev)
OpenFlat.MigrationService/ # EF Core migration worker (runs on startup, then exits)
OpenFlat.ServiceDefaults/  # Shared OpenTelemetry, health checks, resilience config
backend/
  OpenFlat.Api/            # ASP.NET Core Minimal APIs + SignalR
  OpenFlat.Shared/         # DTOs and PredefinedUsers shared between API and clients
  tests/OpenFlat.Api.Tests/
frontend/                  # React 19 + Vite + TypeScript web app
mobile/                    # React Native + Expo
shared/                    # Design tokens, i18n locale files (EN/DE)
```

---

## Commands

### Backend (.NET)
```bash
# Start everything in dev (Aspire orchestrates PostgreSQL → migrations → API → frontend)
dotnet run --project OpenFlat.AppHost

# Run backend tests
dotnet test backend/tests/OpenFlat.Api.Tests/

# Run a single test
dotnet test backend/tests/OpenFlat.Api.Tests/ --filter "FullyQualifiedName~TestClassName.MethodName"
```

### Frontend (React)
```bash
cd frontend
npm run dev          # Vite dev server at http://localhost:5173
npm run build        # TypeScript compile + Vite bundle
npm run lint         # ESLint
npm run format       # Prettier
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright E2E tests
```

### Mobile (React Native)
```bash
cd mobile
npm start            # Expo dev server
npm test             # Jest
npm run test:watch   # Jest watch mode
```

### Dev Cleanup
```bash
./dev-cleanup.sh              # Kill stale processes
./dev-cleanup.sh --db-reset   # Wipe DB volume and containers
./dev-cleanup.sh --all        # Everything above
./dev-cleanup.sh --dry-run    # Preview without action
```

---

## Architecture

### Backend: Feature-Driven Modules

The API is organized by **vertical feature slices**, not by layer:

```
backend/OpenFlat.Api/Features/
  Cleaning/
    Data/         # EF Core entities, DbContext, Migrations/
    Services/     # Business logic (CleaningTaskService, etc.)
    Endpoints/    # Minimal API route mapping (TaskEndpoints, LeaderboardEndpoints)
    Hubs/         # SignalR hub (server → client only, no client → server calls)
  Shopping/       # Same structure
  Finance/        # Same structure
```

New features follow this same pattern. Each feature owns its slice end-to-end.

### Three Independent DbContexts, One Database

One `openflat` PostgreSQL database, three schemas:
- `CleaningDbContext` → schema `cleaning`
- `ShoppingDbContext` → schema `shopping`
- `FinanceDbContext` → schema `finance`

All three are migrated automatically by `OpenFlat.MigrationService` on startup via `Database.MigrateAsync()`.

### No User Authentication

There is no user table or login flow. Users are hardcoded as **PredefinedUsers** (IDs 1–5) in `OpenFlat.Shared`. User identity is passed via the `X-User-Id` request header. `UserHelper.GetUserId()` extracts and validates it.

### Real-Time Updates (SignalR)

- Hubs at `/hubs/cleaning` and `/hubs/shopping`
- Flow is **server → client only**: when an API endpoint modifies data, the service sends a SignalR event (e.g., `TaskCreated`, `ItemBought`) to all connected clients
- Frontend uses `@microsoft/signalr` to connect and update React Query cache on events

### Frontend Architecture

```
frontend/src/
  app/AppRoutes.tsx          # All route definitions (React Router v7)
  features/                  # One folder per domain (cleaning/, shopping/, finance/)
  shared/
    ui/                      # Radix UI + Tailwind component primitives
    components/              # Compound components (TabLayout, Modal, etc.)
    hooks/                   # Custom hooks (useCurrentUserStore, useTheme, etc.)
    api/                     # Fetch client config + React Query setup
    i18n/                    # i18next configuration
    lib/                     # Utilities (cn() classname helper)
```

State: **Zustand** for global client state (current user), **TanStack React Query** for all server state (caching, mutations, refetching).

---

## Key Conventions

### Backend

- **Entity IDs**: `Guid` (auto-generated, mapped as UUID in PostgreSQL)
- **Money**: Stored as `int` in **cents** (e.g., `AmountCents`) to avoid floating-point issues
- **Timestamps**: `DateTimeOffset` for all `CreatedAt`/`UpdatedAt` fields; `DateOnly` for due dates
- **DTO naming**: `{Action}{Entity}Request` for inputs, `{Entity}Dto` for outputs
- **Exception → HTTP mapping** (handled by unified middleware in `Program.cs`):
  - `ValidationException` → 400
  - `NotFoundException` → 404
  - `ConflictException` → 409
  - `ForbiddenException` → 403
- **Minimal API groups**: Each feature registers its own extension method (e.g., `app.MapTaskEndpoints()`)
- **EF Core migrations**: Live in `Features/{Feature}/Data/Migrations/`; add with `dotnet ef migrations add {Name} --project backend/OpenFlat.Api`

### Frontend

- **Component files**: PascalCase (`CleaningChecklist.tsx`); multi-word kebab-case (`task-dialogs.tsx`)
- **Hooks**: `use*` prefix, colocated with feature or in `shared/hooks/`
- **Styling**: Tailwind CSS utility classes; use `cn()` from `shared/lib/` to merge conditional classes; CVA for component variants
- **UI primitives**: Radix UI (headless, accessible); wrap in `shared/ui/` before use in features
- **i18n**: All user-facing strings use `useTranslation()` from react-i18next; locale files in `shared/locales/` (EN + DE)
- **No `import React`**: New JSX transform is configured; React does not need to be imported

### Aspire AppHost

The `OpenFlat.AppHost` project is the **sole entry point for local development**. It:
1. Spins up a PostgreSQL 17 container (via Podman/Docker)
2. Runs `OpenFlat.MigrationService` (applies all migrations + seeds data)
3. Starts `OpenFlat.Api`
4. Optionally starts the frontend Vite server

Do not run the API or database independently for development.
