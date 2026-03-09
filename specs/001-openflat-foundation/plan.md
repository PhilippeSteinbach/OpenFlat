# Implementation Plan: OpenFlat Foundation

**Branch**: `001-openflat-foundation` | **Date**: 2026-03-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-openflat-foundation/spec.md`

## Summary

Build the OpenFlat Foundation — a household management platform with user selection (5 predefined users), a Main Dashboard (with points leaderboard), and three core modules: Cleaning Board (gamified Kanban with drag-and-drop), Shopping List (add/check-off/undo with 7-day auto-clear), and Finance Tracker (expense logging with debt-minimizing settlement). Cross-module commenting with own-only edit/delete. Architecture uses .NET Aspire to orchestrate three microservice APIs (Cleaning, Shopping, Finance) backed by PostgreSQL, a React web frontend with SignalR real-time updates, and an Expo-based React Native mobile app.

## Technical Context

**Language/Version**: C# / .NET 10 (backend APIs), TypeScript (frontend + mobile)
**Orchestration**: .NET Aspire 13.x (AppHost for local dev, service discovery, health checks, dashboard)
**Primary Dependencies**:
- Backend: ASP.NET Core Minimal APIs, Entity Framework Core 10 (Npgsql provider), ASP.NET Core SignalR, Aspire ServiceDefaults, Aspire.Npgsql.EntityFrameworkCore.PostgreSQL
- Frontend (Web): React 19, React Router, @dnd-kit/react v0.3.x (drag-and-drop), @microsoft/signalr v10, TanStack Query v5 (data fetching/caching), Zustand v5 (client state)
- Frontend (Mobile): Expo SDK 52+, React Native, Expo Router v4, react-native-reanimated v3 + react-native-gesture-handler v2 (drag-and-drop), @microsoft/signalr v10
- Shared: i18next + react-i18next (i18n), Tailwind CSS v3.4 / NativeWind v4 (styling), shared locales directory
**Storage**: PostgreSQL 16+ (single database, schema-per-service: `cleaning`, `shopping`, `finance`)
**Testing**:
- Backend: xUnit, FluentAssertions, Testcontainers (PostgreSQL), WebApplicationFactory (integration)
- Frontend (Web): Vitest, React Testing Library, Playwright (E2E)
- Mobile: Jest, React Native Testing Library
**Target Platform**: Web (all modern browsers), iOS 16+, Android 13+ (via Expo)
**Project Type**: Full-stack web + mobile application (microservices backend)
**Performance Goals**: <200ms p95 API response, <500ms SignalR propagation, <3s web TTI, <2s mobile cold start
**Constraints**: Mobile-first UI (≤428px primary), 5 predefined users (no auth), EUR currency only, single-session usage
**Scale/Scope**: 5 users per household, 3 modules, ~10 screens (web + mobile), testing/prototype phase

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality & Consistency | ✅ PASS | ESLint + Prettier for TS/JS, Roslyn analyzers for C#, OpenAPI specs for all 3 APIs |
| II. Test-Driven Quality Assurance | ✅ PASS | xUnit + Testcontainers (backend), Vitest + RTL (web), Jest + RNTL (mobile), Playwright (E2E). Contract tests for each API. |
| III. User Experience Consistency | ✅ PASS | Shared design system via Tailwind/NativeWind tokens. i18next for i18n (EN + DE). ARIA labels + accessibility traits. Empty/error/loading states required per spec. |
| IV. Performance & Responsiveness | ✅ PASS | Performance budgets in spec (SC-001–SC-009). Aspire health checks. DB indexes required. Bundle size monitoring. |
| V. Modular & Extensible Architecture | ✅ PASS | 3 separate API services behind Aspire orchestration. Feature-module frontend organization. Schema-per-service in PostgreSQL. |
| Technology Standards | ✅ PASS | Constitution amended (v1.0.1) to "React Native (Expo)". .NET 10 ≥ .NET 8+ requirement. Node 22 ≥ 20+ requirement. All standards met. |

**GATE RESULT**: PASS

### Post-Design Re-evaluation

*After Phase 1 design (data model, API contracts, quickstart).*

| Principle | Status | Post-Design Notes |
|-----------|--------|-------------------|
| I. Code Quality & Consistency | ✅ PASS | OpenAPI contracts defined for all 3 APIs (cleaning-api.yaml, shopping-api.yaml, finance-api.yaml). All public entities have documented fields. Named constants for user IDs (PredefinedUsers). Enum for TaskStatus. No magic numbers. |
| II. Test-Driven Quality Assurance | ✅ PASS | Test project structure defined (unit + integration per API, E2E with Playwright). Contract tests verifiable against OpenAPI specs. Testcontainers for PostgreSQL integration tests. Test commands documented in quickstart.md. |
| III. User Experience Consistency | ✅ PASS | Shared locales (en.json, de.json) in shared/locales/. NativeWind + Tailwind for consistent design tokens. Comment DTOs identical across Cleaning and Shopping APIs. User names resolved in DTOs (not raw IDs). Empty/error states specified in spec. |
| IV. Performance & Responsiveness | ✅ PASS | DB indexes defined for all query patterns (status filtering, chronological ordering, leaderboard). Integer cents for financial amounts (no float precision issues). Settlement algorithm is O(N log N) with N=5. Minimal joins needed. |
| V. Modular & Extensible Architecture | ✅ PASS | 3 independent schemas with independent migration histories. Each API is self-contained with Endpoints → Services → Data layering. Shared library contains only constants/DTOs. MigrationService is separate from API projects. |
| Technology Standards | ✅ PASS | .NET 10 ≥ constitution's ".NET 8+". React Native (Expo) matches constitution v1.0.2. Docker / .NET Aspire matches constitution v1.0.2. Node 22 ≥ 20+. All standards met. |

**POST-DESIGN GATE RESULT**: PASS — All principles satisfied. Design artifacts are constitution-compliant.

## Project Structure

### Documentation (this feature)

```text
specs/001-openflat-foundation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (OpenAPI specs)
│   ├── cleaning-api.yaml
│   ├── shopping-api.yaml
│   └── finance-api.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
OpenFlat.AppHost/                    # .NET Aspire 13.x orchestration project
├── Program.cs                       # Service registration, PostgreSQL, frontend
├── appsettings.json
└── OpenFlat.AppHost.csproj           # Sdk="Aspire.AppHost.Sdk/13.1.0"

OpenFlat.ServiceDefaults/            # Shared Aspire service defaults
├── Extensions.cs
└── OpenFlat.ServiceDefaults.csproj

OpenFlat.MigrationService/           # EF Core migration worker (all 3 DbContexts)
├── Program.cs
├── MigrationWorker.cs               # Runs MigrateAsync sequentially, then stops
└── OpenFlat.MigrationService.csproj

backend/
├── OpenFlat.Cleaning.Api/           # Cleaning/Tasks REST API
│   ├── Program.cs
│   ├── Endpoints/                   # Minimal API endpoint definitions
│   ├── Services/                    # Business logic layer
│   ├── Data/                        # EF Core DbContext, entities, migrations
│   ├── Hubs/                        # SignalR hub(s) for real-time
│   └── OpenFlat.Cleaning.Api.csproj
│
├── OpenFlat.Shopping.Api/           # Shopping List REST API
│   ├── Program.cs
│   ├── Endpoints/
│   ├── Services/
│   ├── Data/
│   ├── Hubs/
│   └── OpenFlat.Shopping.Api.csproj
│
├── OpenFlat.Finance.Api/            # Finance Tracker REST API
│   ├── Program.cs
│   ├── Endpoints/
│   ├── Services/
│   ├── Data/
│   └── OpenFlat.Finance.Api.csproj
│
├── OpenFlat.Shared/                 # Shared DTOs, constants, user definitions
│   ├── Users/                       # Predefined user constants
│   ├── Models/                      # Shared DTOs (Comment, User)
│   └── OpenFlat.Shared.csproj
│
└── tests/
    ├── OpenFlat.Cleaning.Tests/     # Unit + integration tests
    ├── OpenFlat.Shopping.Tests/
    ├── OpenFlat.Finance.Tests/
    └── OpenFlat.Integration.Tests/  # Cross-service integration tests

frontend/                            # React web application
├── src/
│   ├── app/                         # React Router layout, routes
│   ├── features/
│   │   ├── user-selection/          # P1: User picker screen
│   │   ├── dashboard/               # P1: Main dashboard + leaderboard
│   │   ├── cleaning/                # P2: Kanban board, drag-and-drop
│   │   ├── shopping/                # P3: Shopping list, recently bought
│   │   ├── finance/                 # P4: Expense list, settlement view
│   │   └── comments/                # P5: Comment threads (shared)
│   ├── shared/
│   │   ├── components/              # Design system (buttons, cards, inputs)
│   │   ├── hooks/                   # useCurrentUser, useSignalR, etc.
│   │   ├── i18n/                    # i18next config, en.json, de.json
│   │   └── api/                     # API client (fetch wrappers per service)
│   ├── main.tsx
│   └── index.html
├── tests/
│   ├── unit/                        # Vitest + RTL component tests
│   └── e2e/                         # Playwright E2E tests
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json

shared/                              # Cross-platform shared resources
├── locales/
│   ├── en.json                      # English translations
│   └── de.json                      # German translations
└── types/                           # Shared TypeScript types (optional)

mobile/                              # Expo React Native app
├── app/                             # expo-router v4 file-based routing
│   ├── _layout.tsx                  # Root Stack navigator
│   ├── user-selection.tsx           # Outside tabs (no tab bar)
│   ├── (tabs)/                      # Tab navigator (dashboard, modules)
│   │   ├── _layout.tsx              # Tab navigator config
│   │   ├── index.tsx                # Dashboard tab
│   │   ├── cleaning/
│   │   │   ├── _layout.tsx          # Stack within Cleaning tab
│   │   │   ├── index.tsx            # Kanban board
│   │   │   └── [taskId].tsx         # Task detail modal
│   │   ├── shopping/
│   │   │   ├── _layout.tsx
│   │   │   └── index.tsx
│   │   └── finance/
│   │       ├── _layout.tsx
│   │       └── index.tsx
├── components/                      # Mobile-specific components
├── features/                        # Feature logic (mirrors web)
│   ├── cleaning/
│   ├── shopping/
│   ├── finance/
│   └── comments/
├── shared/
│   ├── hooks/
│   ├── i18n/
│   └── api/
├── app.json
├── package.json
├── babel.config.js
├── metro.config.js
└── tsconfig.json
```

**Structure Decision**: .NET Aspire AppHost + ServiceDefaults pattern with three independent backend API projects sharing a common library. Frontend and mobile are separate projects with mirrored feature structures. This matches the Aspire multi-project orchestration model and the constitution's modular architecture principle.

## Complexity Tracking

| Deviation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Expo instead of bare React Native | Expo provides zero-config iOS/Android builds, OTA updates, and `expo go` for rapid testing on physical devices — critical for a testing/prototype phase focused on mobile-first UX validation | Bare React Native requires Xcode/Android Studio setup, native build toolchains, and significantly slower iteration. Expo is a superset of React Native, not a replacement. |
| 3 separate API projects (vs 1 monolith) | Maps 1:1 to spec modules (Cleaning, Shopping, Finance), enables independent deployment, and satisfies Constitution Principle V (modular architecture) | A single API would be simpler initially but violates the modularity principle and makes future extraction harder. Aspire orchestration makes local multi-service dev trivial. |
