# Phase 0 Research: .NET Aspire for OpenFlat Foundation

**Date**: 2026-03-09
**Aspire Version Referenced**: **Aspire 13.1.x** (latest stable as of March 2026, package version `13.1.2`)
**Runtime**: .NET 10 (required by Aspire 13.x)
**Source**: Official documentation at [aspire.dev](https://aspire.dev), GitHub releases, what's new pages

> **Version context**: Aspire jumped from 9.5 → 13.0 (November 2025) to align with .NET 10. As of March 2026, the latest stable release is **13.1.2**. The product was rebranded from ".NET Aspire" to simply "Aspire" in 13.0, becoming a polyglot platform (C#, Python, JavaScript). All findings below reference Aspire 13.x unless noted.

---

## 1. AppHost Program.cs — Registering Multiple APIs, PostgreSQL, and React Frontend

### Concrete Pattern for OpenFlat

```csharp
// OpenFlat.AppHost/Program.cs
var builder = DistributedApplication.CreateBuilder(args);

// ── PostgreSQL ──────────────────────────────────────────────
var postgres = builder.AddPostgres("postgres")
    .WithDataVolume()
    .WithLifetime(ContainerLifetime.Persistent);

var db = postgres.AddDatabase("openflat");

// ── Backend APIs ────────────────────────────────────────────
var cleaningApi = builder.AddProject<Projects.OpenFlat_Cleaning_Api>("cleaning-api")
    .WithReference(db)
    .WaitFor(db);

var shoppingApi = builder.AddProject<Projects.OpenFlat_Shopping_Api>("shopping-api")
    .WithReference(db)
    .WaitFor(db);

var financeApi = builder.AddProject<Projects.OpenFlat_Finance_Api>("finance-api")
    .WithReference(db)
    .WaitFor(db);

// ── React Frontend (Vite) ───────────────────────────────────
builder.AddViteApp("frontend", "../frontend")
    .WithHttpEndpoint(env: "PORT")
    .WithReference(cleaningApi)
    .WithReference(shoppingApi)
    .WithReference(financeApi);

builder.Build().Run();
```

### Key Points

- **`AddPostgres("postgres")`** spins up a PostgreSQL container. `.AddDatabase("openflat")` creates one logical database on it. All three APIs reference the same database resource.
- **`.WithDataVolume()`** persists data across container restarts. **`.WithLifetime(ContainerLifetime.Persistent)`** keeps the container running between AppHost restarts (avoids slow startup).
- **`AddProject<T>(name)`** registers each .NET project. The generic parameter comes from project references in the AppHost `.csproj`.
- **`.WithReference(db)`** injects the connection string as `ConnectionStrings__openflat` into each API's configuration.
- **`.WaitFor(db)`** delays API startup until PostgreSQL is healthy.
- **`AddViteApp("frontend", "../frontend")`** is the Aspire 13.x way to register a Vite-based React app (see §5 for full details).

### AppHost Project File (Aspire 13.x format)

```xml
<Project Sdk="Aspire.AppHost.Sdk/13.1.0">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net10.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>

  <ItemGroup>
    <ProjectReference Include="..\backend\OpenFlat.Cleaning.Api\OpenFlat.Cleaning.Api.csproj" />
    <ProjectReference Include="..\backend\OpenFlat.Shopping.Api\OpenFlat.Shopping.Api.csproj" />
    <ProjectReference Include="..\backend\OpenFlat.Finance.Api\OpenFlat.Finance.Api.csproj" />
  </ItemGroup>

  <ItemGroup>
    <PackageReference Include="Aspire.Hosting.PostgreSQL" Version="13.1.0" />
    <PackageReference Include="Aspire.Hosting.JavaScript" Version="13.1.0" />
  </ItemGroup>
</Project>
```

> In Aspire 13.x, the SDK declaration moves into the `<Project Sdk="...">` attribute. The `Aspire.Hosting.AppHost` package is implicitly included by the SDK — no explicit reference needed. The Node.js package was **renamed** from `Aspire.Hosting.NodeJs` to **`Aspire.Hosting.JavaScript`** in 13.0.

---

## 2. Service Discovery — Frontend ↔ Backend APIs

### How It Works

When `WithReference(cleaningApi)` is called on the frontend resource, Aspire injects the API's base URL as an environment variable into the frontend process. For non-.NET apps (like React/Vite), Aspire 13.x uses **simplified service URL environment variables**:

| Environment Variable | Value (example) |
|---|---|
| `services__cleaning-api__https__0` | `https://localhost:7201` |
| `services__cleaning-api__http__0` | `http://localhost:5201` |

For non-.NET apps in Aspire 13.0+, the simpler polyglot format is also injected:

| Environment Variable | Value (example) |
|---|---|
| `CLEANING_API_HTTP` | `http://localhost:5201` |
| `CLEANING_API_HTTPS` | `https://localhost:5201` |

The React app reads these via `import.meta.env` (Vite) or `process.env` and uses them as API base URLs.

### Does the Frontend Need YARP / a Reverse Proxy?

**For development (inner loop): No.** Aspire's proxy layer handles port allocation and forwarding. Each API gets its own endpoint, and the React app calls them directly using the injected URLs. CORS must be configured on each API to allow the frontend origin.

**For production: Recommended but not provided automatically.** Aspire is a dev-time orchestrator — it doesn't generate a production reverse proxy. For production, the recommended patterns are:

1. **Add a YARP-based API Gateway** as a 4th project in the AppHost that aggregates the 3 APIs behind a single origin. This eliminates CORS complexity and gives the frontend a single base URL.

   ```csharp
   var gateway = builder.AddProject<Projects.OpenFlat_Gateway>("gateway")
       .WithReference(cleaningApi)
       .WithReference(shoppingApi)
       .WithReference(financeApi)
       .WithExternalHttpEndpoints();

   builder.AddViteApp("frontend", "../frontend")
       .WithHttpEndpoint(env: "PORT")
       .WithReference(gateway);  // Frontend only talks to gateway
   ```

2. **Direct multi-API calls with CORS** — simpler but requires CORS configuration on all 3 APIs and the frontend must manage 3 base URLs.

### Recommendation for OpenFlat

Given 3 APIs + SignalR hubs, a **YARP gateway is recommended** to:
- Provide a single origin for the frontend (no CORS issues)
- Route `/api/cleaning/*`, `/api/shopping/*`, `/api/finance/*` to respective services
- Proxy SignalR WebSocket connections (`/hubs/cleaning`, `/hubs/shopping`)
- Simplify the React app's API client layer (one base URL)

However, for the initial testing phase (no production deployment), direct multi-API calls are acceptable to reduce complexity.

---

## 3. Sharing a Single PostgreSQL Instance with Schema-Per-API Isolation

### Approach

Aspire's `AddDatabase("openflat")` creates one logical database. Schema isolation is an **application-level concern** handled in EF Core's `DbContext` configuration.

### EF Core Schema Configuration

Each API's `DbContext` uses `HasDefaultSchema` to isolate its tables:

```csharp
// OpenFlat.Cleaning.Api/Data/CleaningDbContext.cs
public class CleaningDbContext(DbContextOptions<CleaningDbContext> options)
    : DbContext(options)
{
    public DbSet<CleaningTask> Tasks => Set<CleaningTask>();
    public DbSet<Comment> Comments => Set<Comment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("cleaning");
        // ... entity configurations
    }
}
```

```csharp
// OpenFlat.Shopping.Api/Data/ShoppingDbContext.cs
public class ShoppingDbContext(DbContextOptions<ShoppingDbContext> options)
    : DbContext(options)
{
    public DbSet<ShoppingItem> Items => Set<ShoppingItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("shopping");
    }
}
```

```csharp
// OpenFlat.Finance.Api/Data/FinanceDbContext.cs
public class FinanceDbContext(DbContextOptions<FinanceDbContext> options)
    : DbContext(options)
{
    public DbSet<Expense> Expenses => Set<Expense>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("finance");
    }
}
```

### Registration in Each API's Program.cs

Each API registers its own `DbContext` using the Aspire PostgreSQL EF Core integration:

```csharp
// Each API's Program.cs
builder.AddNpgsqlDbContext<CleaningDbContext>(connectionName: "openflat");
```

The `connectionName` parameter **must match** the database resource name used in the AppHost (`"openflat"` from `.AddDatabase("openflat")`). Aspire injects the connection string as `ConnectionStrings__openflat`.

### Required Package in Each API

```xml
<PackageReference Include="Aspire.Npgsql.EntityFrameworkCore.PostgreSQL" Version="13.1.0" />
```

This Aspire integration method (`AddNpgsqlDbContext`) automatically enables:
- Connection pooling
- Health checks
- OpenTelemetry tracing
- Connection resiliency (retry logic)

### Best Practices for Schema Isolation

1. **Use `HasDefaultSchema`** — not manual table name prefixing. This ensures all tables, indexes, and sequences are namespaced.
2. **Each schema should be self-contained** — avoid cross-schema foreign keys. If the shared `User` model is needed, place it in the `OpenFlat.Shared` library and each context maps its own copy or uses a read-only view.
3. **Predefined users** (Alex, Jordan, Sam, Taylor, Casey) should be seeded identically in each schema's migration, or stored in a shared `public` schema that all contexts can read.

---

## 4. EF Core Migrations Across Multiple DbContexts on the Same Database

### Recommended Approach: Separate Migration Services

The official Aspire documentation recommends **dedicated migration service projects** — one per database context (or a single service handling multiple contexts).

#### Option A: One Migration Service Per API (Recommended for isolation)

```csharp
// AppHost/Program.cs
var cleaningMigrations = builder
    .AddProject<Projects.OpenFlat_Cleaning_MigrationService>("cleaning-migrations")
    .WithReference(db)
    .WaitFor(db);

var shoppingMigrations = builder
    .AddProject<Projects.OpenFlat_Shopping_MigrationService>("shopping-migrations")
    .WithReference(db)
    .WaitFor(db);

var financeMigrations = builder
    .AddProject<Projects.OpenFlat_Finance_MigrationService>("finance-migrations")
    .WithReference(db)
    .WaitFor(db);

var cleaningApi = builder.AddProject<Projects.OpenFlat_Cleaning_Api>("cleaning-api")
    .WithReference(db)
    .WaitFor(db)
    .WaitForCompletion(cleaningMigrations);

var shoppingApi = builder.AddProject<Projects.OpenFlat_Shopping_Api>("shopping-api")
    .WithReference(db)
    .WaitFor(db)
    .WaitForCompletion(shoppingMigrations);

var financeApi = builder.AddProject<Projects.OpenFlat_Finance_Api>("finance-api")
    .WithReference(db)
    .WaitFor(db)
    .WaitForCompletion(financeMigrations);
```

This is verbose but provides maximum isolation. Each migration service is a `BackgroundService` that runs `dbContext.Database.MigrateAsync()` and then calls `hostApplicationLifetime.StopApplication()`.

#### Option B: Single Migration Service with Multiple Contexts (Simpler)

```csharp
// OpenFlat.MigrationService/Program.cs
var builder = Host.CreateApplicationBuilder(args);

builder.AddServiceDefaults();
builder.Services.AddHostedService<MigrationWorker>();
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing.AddSource(MigrationWorker.ActivitySourceName));

builder.AddNpgsqlDbContext<CleaningDbContext>("openflat");
builder.AddNpgsqlDbContext<ShoppingDbContext>("openflat");
builder.AddNpgsqlDbContext<FinanceDbContext>("openflat");

var host = builder.Build();
host.Run();
```

```csharp
// OpenFlat.MigrationService/MigrationWorker.cs
public class MigrationWorker(
    IServiceProvider serviceProvider,
    IHostApplicationLifetime hostApplicationLifetime) : BackgroundService
{
    public const string ActivitySourceName = "Migrations";
    private static readonly ActivitySource s_activitySource = new(ActivitySourceName);

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        using var activity = s_activitySource.StartActivity(
            "Migrating database", ActivityKind.Client);

        try
        {
            using var scope = serviceProvider.CreateScope();

            // Migrate all three schemas
            var cleaning = scope.ServiceProvider.GetRequiredService<CleaningDbContext>();
            var shopping = scope.ServiceProvider.GetRequiredService<ShoppingDbContext>();
            var finance = scope.ServiceProvider.GetRequiredService<FinanceDbContext>();

            await MigrateAsync(cleaning, ct);
            await MigrateAsync(shopping, ct);
            await MigrateAsync(finance, ct);

            // Seed shared data...
        }
        catch (Exception ex)
        {
            activity?.AddException(ex);
            throw;
        }

        hostApplicationLifetime.StopApplication();
    }

    private static async Task MigrateAsync(DbContext context, CancellationToken ct)
    {
        var strategy = context.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await context.Database.MigrateAsync(ct);
        });
    }
}
```

AppHost wiring:

```csharp
var migrations = builder.AddProject<Projects.OpenFlat_MigrationService>("migrations")
    .WithReference(db)
    .WaitFor(db);

var cleaningApi = builder.AddProject<Projects.OpenFlat_Cleaning_Api>("cleaning-api")
    .WithReference(db)
    .WaitForCompletion(migrations);
// ... same for shopping and finance APIs
```

### Creating Migrations (CLI)

Each context needs its own migration history, specified with `--context`:

```bash
# From the API project directory (where DbContext is used):
dotnet ef migrations add InitialCreate \
    --context CleaningDbContext \
    --project ../OpenFlat.Cleaning.Api/OpenFlat.Cleaning.Api.csproj \
    --output-dir Data/Migrations

dotnet ef migrations add InitialCreate \
    --context ShoppingDbContext \
    --project ../OpenFlat.Shopping.Api/OpenFlat.Shopping.Api.csproj \
    --output-dir Data/Migrations

dotnet ef migrations add InitialCreate \
    --context FinanceDbContext \
    --project ../OpenFlat.Finance.Api/OpenFlat.Finance.Api.csproj \
    --output-dir Data/Migrations
```

### Troubleshooting: "No database provider has been configured"

Since Aspire injects connection strings at runtime, the `dotnet ef` tool can't resolve them at design time. **Solution**: temporarily add a fallback connection string in `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "openflat": "Host=localhost;Port=5432;Database=openflat;Username=postgres;Password=postgres"
  }
}
```

Remove or leave it (Aspire's runtime injection will override it).

### Why Schema-Per-Module Works Well with Migrations

EF Core's `__EFMigrationsHistory` table respects the schema. When each context uses `HasDefaultSchema("cleaning")`, its migration history table is `cleaning.__EFMigrationsHistory`. This means:

- Three independent migration histories in one database
- No conflicts between contexts
- Each service can be migrated independently

---

## 5. React Frontend Support in Aspire 13.x

### Native Support: Yes

Aspire 13.x supports React frontends **natively** through the `Aspire.Hosting.JavaScript` package (renamed from `Aspire.Hosting.NodeJs` in 13.0).

### Available Methods

| Method | Use Case |
|---|---|
| **`AddViteApp(name, path)`** | Vite-based apps (React + Vite) — **recommended for OpenFlat** |
| `AddJavaScriptApp(name, path)` | Generic JavaScript app (npm/yarn/pnpm) |
| `AddNodeApp(name, path, script)` | Node.js server (Express, etc.) |

> **`AddNpmApp` is deprecated** (marked `[Obsolete]` in 13.0, will be removed in next major). Use `AddViteApp` or `AddJavaScriptApp` instead.

### Concrete Pattern for OpenFlat

```csharp
builder.AddViteApp("frontend", "../frontend")
    .WithHttpEndpoint(env: "PORT")
    .WithReference(cleaningApi)
    .WithReference(shoppingApi)
    .WithReference(financeApi);
```

**What `AddViteApp` does automatically:**

1. **Development**: Runs `npm run dev` (the Vite dev server) with HMR support
2. **Port binding**: Aspire allocates a proxy port; the `PORT` env var tells Vite which port to listen on
3. **Package management**: Auto-detects `package.json` and runs `npm install` before starting
4. **Production/Publishing**: Runs `npm run build` and generates a Dockerfile with multi-stage builds
5. **Service references**: Injects API URLs as environment variables (e.g., `CLEANING_API_HTTP`)

### Vite Configuration for Aspire

The Vite dev server needs to listen on the port Aspire assigns:

```typescript
// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.PORT || '5173'),
    strictPort: true,
  },
});
```

### Reading API URLs in React

```typescript
// frontend/src/services/apiConfig.ts
export const API_URLS = {
  cleaning: import.meta.env.VITE_CLEANING_API_HTTP || 'http://localhost:5201',
  shopping: import.meta.env.VITE_SHOPPING_API_HTTP || 'http://localhost:5202',
  finance:  import.meta.env.VITE_FINANCE_API_HTTP  || 'http://localhost:5203',
};
```

> **Note**: Vite only exposes env vars prefixed with `VITE_` to client code. The Aspire-injected variables (e.g., `CLEANING_API_HTTP`) are available to the Vite server process but not to browser code directly. To bridge this, use a Vite plugin or proxy configuration:

```typescript
// frontend/vite.config.ts — proxy approach (recommended for dev)
export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.PORT || '5173'),
    strictPort: true,
    proxy: {
      '/api/cleaning': {
        target: process.env.services__cleaning_api__http__0 || 'http://localhost:5201',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cleaning/, ''),
      },
      '/api/shopping': {
        target: process.env.services__shopping_api__http__0 || 'http://localhost:5202',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/shopping/, ''),
      },
      '/api/finance': {
        target: process.env.services__finance_api__http__0 || 'http://localhost:5203',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/finance/, ''),
      },
      '/hubs': {
        target: process.env.services__cleaning_api__http__0 || 'http://localhost:5201',
        ws: true,
      },
    },
  },
});
```

This gives the React app a single origin during development, with Vite proxying to the correct backend.

### Package Manager Flexibility

```csharp
// npm (default)
builder.AddViteApp("frontend", "../frontend");

// yarn
builder.AddViteApp("frontend", "../frontend")
    .WithYarn();

// pnpm
builder.AddViteApp("frontend", "../frontend")
    .WithPnpm();
```

### No Separate Container Config Needed

`AddViteApp` handles everything — no need for a separate Dockerfile or docker-compose entry for the frontend during development. For production publishing, Aspire auto-generates a Dockerfile with multi-stage builds.

---

## 6. SignalR Hubs — Integration Notes

SignalR hubs are part of the ASP.NET Core API projects and don't need separate Aspire resources. They're exposed through the same HTTP endpoints as the REST APIs.

```csharp
// OpenFlat.Cleaning.Api/Program.cs
var builder = WebApplication.CreateBuilder(args);
builder.AddServiceDefaults();
builder.AddNpgsqlDbContext<CleaningDbContext>("openflat");
builder.Services.AddSignalR();

var app = builder.Build();
app.MapDefaultEndpoints();
app.MapHub<CleaningHub>("/hubs/cleaning");
app.MapControllers();
app.Run();
```

The React frontend connects via the SignalR client using the API's base URL:

```typescript
import { HubConnectionBuilder } from '@microsoft/signalr';

const connection = new HubConnectionBuilder()
    .withUrl('/hubs/cleaning')  // proxied through Vite in dev
    .withAutomaticReconnect()
    .build();
```

---

## Summary of Findings

| Question | Finding |
|---|---|
| **AppHost structure** | `AddProject` × 3, `AddPostgres` + `AddDatabase`, `AddViteApp` — fully declarative, code-first |
| **Frontend ↔ APIs routing** | Aspire injects API URLs as env vars. No built-in reverse proxy. Use Vite's dev proxy for development; consider YARP gateway for production |
| **Schema isolation** | `modelBuilder.HasDefaultSchema("cleaning")` per DbContext; application-level concern, single database |
| **EF Core migrations** | Dedicated migration worker service(s) using `MigrateAsync`; independent `__EFMigrationsHistory` per schema; `WaitForCompletion` ensures APIs start after migrations |
| **React frontend support** | **Natively supported** via `AddViteApp` (package: `Aspire.Hosting.JavaScript` v13.x). Auto npm install, HMR, Dockerfile generation. `AddNpmApp` is deprecated |
| **Aspire version** | **13.1.2** (latest stable, March 2026). Requires .NET 10 SDK |

---
---

# Phase 0 Research: Frontend Technologies for OpenFlat Foundation

**Date**: 2026-03-09
**Topics**: Drag-and-Drop Kanban (React, mobile-first) · SignalR Client Integration (React)

---

## 7. Drag-and-Drop Kanban Board in React (Mobile-First)

### Library Comparison

| Criteria | **@dnd-kit (v2, new architecture)** | **react-beautiful-dnd** | **@hello-pangea/dnd** |
|---|---|---|---|
| **Status (March 2026)** | **Actively maintained** — commits within days, 383 releases, 16.7k stars, 52 contributors | **Deprecated** — npm deprecation notice, last publish 4+ years ago, no new features planned | Community fork of react-beautiful-dnd; actively maintained but inherits the same architecture |
| **React 19 compat** | Yes — built for modern React, no legacy APIs | Broken with React 19 strict mode (uses `findDOMNode`, deprecated `defaultProps`) | Patches React 19 issues but still uses legacy patterns |
| **TypeScript** | First-class — written in TypeScript, built-in type declarations | `@types/react-beautiful-dnd` (DefinitelyTyped, community-maintained) | Built-in types (forked from rbd + typed) |
| **Touch / mobile support** | Built-in `PointerSensor` handles mouse + touch + pen natively. No extra config for mobile | Touch sensor exists but has known quirks (long-press delay, scroll interference) | Same touch sensor as rbd |
| **Cross-container drag** | `useSortable` with `group` prop — native multi-list support with optimistic sorting | Supported via multiple `<Droppable>` components | Same as rbd |
| **Bundle size** | ~76 kB unpacked (`@dnd-kit/react`), tree-shakable | ~1.39 MB unpacked | ~1.4 MB unpacked |
| **Architecture** | Framework-agnostic core (`@dnd-kit/abstract`) → DOM layer (`@dnd-kit/dom`) → React adapter (`@dnd-kit/react`). Clean separation | Monolithic React-only library | Monolithic React-only fork |
| **Accessibility** | Keyboard sensor + ARIA attributes built-in, customizable screen reader announcements | Excellent a11y (keyboard + screen reader), one of its strongest features | Same a11y as rbd |
| **Weekly downloads** | `@dnd-kit/react`: ~234k (growing rapidly); legacy `@dnd-kit/core`: ~9.7M | ~2.3M (declining, inertia from existing projects) | ~800k |

### Decision: **@dnd-kit (new architecture — `@dnd-kit/react` v0.3.x)**

**Rationale:**

1. **Only actively maintained option.** `react-beautiful-dnd` is officially deprecated by Atlassian with an npm deprecation notice. `@hello-pangea/dnd` is a community fork that patches compatibility but doesn't advance the architecture.
2. **React 19 compatible.** The new @dnd-kit architecture was rebuilt from scratch — no `findDOMNode`, no legacy lifecycle methods, no `defaultProps`. Clean hooks-based API.
3. **Native mobile/touch support.** The `PointerSensor` unifies mouse, touch, and pen input. No special configuration needed for mobile viewports. Touch gestures (drag, scroll) are handled correctly out of the box.
4. **Multi-container sorting is a first-class feature.** The `group` prop on `useSortable` natively supports dragging items between columns — exactly what a Kanban board needs.
5. **Optimistic sorting.** DOM elements are moved optimistically during drag (without React re-renders on every `dragover`), giving smooth ~60fps performance even on mobile.
6. **The `move()` helper** from `@dnd-kit/helpers` handles all state updates for both single-list and multi-list scenarios in one function call.

> **Note on version:** The new `@dnd-kit/react` (v0.3.x) is the actively developed package with the new architecture. The legacy `@dnd-kit/core` (v6.3.1) is in maintenance mode. The plan.md already references `@dnd-kit` — this research confirms the **new `@dnd-kit/react` package** should be used, not the legacy `@dnd-kit/core`.

### Required Packages

```bash
npm install @dnd-kit/react @dnd-kit/helpers
```

| Package | Version | Purpose |
|---|---|---|
| `@dnd-kit/react` | `0.3.2` | React hooks (`useSortable`, `useDraggable`, `useDroppable`) + `DragDropProvider` |
| `@dnd-kit/helpers` | `0.3.2` | `move()` helper for state updates |

> `@dnd-kit/dom`, `@dnd-kit/abstract`, `@dnd-kit/state`, `@dnd-kit/collision`, `@dnd-kit/geometry` are transitive dependencies — installed automatically.

### Kanban Board Pattern for OpenFlat Cleaning Board

The Cleaning Board has 4 columns: "To Do", "In Progress", "Awaiting Review", "Done". Each column is a **sortable group**. Cards can be dragged within a column (reorder) and between columns (transfer).

#### Data Model (React State)

```typescript
// frontend/src/features/cleaning/types.ts
interface CleaningTask {
  id: string;
  title: string;
  points: number;
  assigneeId: string | null;
}

// Columns as a Record keyed by column ID
type KanbanColumns = Record<string, CleaningTask[]>;

// Initial state shape
const columns: KanbanColumns = {
  todo: [/* tasks */],
  inProgress: [/* tasks */],
  awaitingReview: [/* tasks */],
  done: [/* tasks */],
};
```

#### Kanban Board Component

```tsx
// frontend/src/features/cleaning/CleaningBoard.tsx
import { useState } from 'react';
import { DragDropProvider } from '@dnd-kit/react';
import { move } from '@dnd-kit/helpers';
import { KanbanColumn } from './KanbanColumn';
import type { KanbanColumns } from './types';

const COLUMN_ORDER = ['todo', 'inProgress', 'awaitingReview', 'done'] as const;
const COLUMN_LABELS: Record<string, string> = {
  todo: 'To Do',
  inProgress: 'In Progress',
  awaitingReview: 'Awaiting Review',
  done: 'Done',
};

export function CleaningBoard() {
  const [columns, setColumns] = useState<KanbanColumns>(initialColumns);

  return (
    <DragDropProvider
      onDragEnd={(event) => {
        // move() handles both reorder within a column and cross-column transfer
        setColumns((prev) => move(prev, event));
      }}
    >
      <div className="kanban-board">
        {COLUMN_ORDER.map((columnId) => (
          <KanbanColumn
            key={columnId}
            id={columnId}
            label={COLUMN_LABELS[columnId]}
            tasks={columns[columnId]}
          />
        ))}
      </div>
    </DragDropProvider>
  );
}
```

#### Sortable Column Component

```tsx
// frontend/src/features/cleaning/KanbanColumn.tsx
import { useDroppable } from '@dnd-kit/react';
import { TaskCard } from './TaskCard';
import type { CleaningTask } from './types';

interface KanbanColumnProps {
  id: string;
  label: string;
  tasks: CleaningTask[];
}

export function KanbanColumn({ id, label, tasks }: KanbanColumnProps) {
  const { ref } = useDroppable({ id });

  return (
    <div ref={ref} className="kanban-column">
      <h3 className="kanban-column__header">{label}</h3>
      <div className="kanban-column__cards">
        {tasks.map((task, index) => (
          <TaskCard
            key={task.id}
            task={task}
            index={index}
            group={id}  // ← column ID is the sortable group
          />
        ))}
      </div>
    </div>
  );
}
```

#### Sortable Task Card

```tsx
// frontend/src/features/cleaning/TaskCard.tsx
import { useSortable } from '@dnd-kit/react/sortable';
import type { CleaningTask } from './types';

interface TaskCardProps {
  task: CleaningTask;
  index: number;
  group: string;
}

export function TaskCard({ task, index, group }: TaskCardProps) {
  const { ref, isDragSource } = useSortable({
    id: task.id,
    index,
    group,       // ← enables cross-column dragging
    data: task,  // ← accessible in event handlers
  });

  return (
    <div
      ref={ref}
      className={`task-card ${isDragSource ? 'task-card--dragging' : ''}`}
    >
      <span className="task-card__title">{task.title}</span>
      <span className="task-card__points">{task.points} pts</span>
    </div>
  );
}
```

#### How Cross-Column Drag Works

1. Each `TaskCard` is a `useSortable` with a `group` matching its column ID (`"todo"`, `"inProgress"`, etc.).
2. When a card is dragged over a different column's items, the `OptimisticSortingPlugin` (enabled by default) moves DOM elements in real-time — no React re-renders needed during drag.
3. On `onDragEnd`, `move(columns, event)` reads `source.initialGroup`, `source.group`, `source.initialIndex`, and `source.index` to compute the new column state. It handles both same-column reorder and cross-column transfer.
4. React re-renders once with the final state.

#### Mobile Considerations (≤ 428px viewport)

- **No extra sensor configuration needed.** The default `PointerSensor` handles touch natively.
- **Horizontal scroll for columns**: On mobile, the 4 columns should be in a horizontally scrollable container. The built-in `AutoScroller` plugin handles auto-scrolling during drag.
- **Touch delay**: The default activation constraint prevents accidental drags when scrolling. The `PointerSensor` uses a distance threshold (default: 10px) before activating a drag. This can be customized if needed:

```tsx
import { PointerSensor } from '@dnd-kit/dom';

<DragDropProvider
  sensors={(defaults) =>
    defaults.map((sensor) =>
      sensor === PointerSensor
        ? PointerSensor.configure({
            activationConstraints: { distance: { value: 8 } },
          })
        : sensor
    )
  }
>
```

#### Detecting "Moved to Done" for Point Scoring

When a card is moved to the "Done" column, points should be awarded. This is detected in `onDragEnd`:

```tsx
import { isSortable } from '@dnd-kit/react/sortable';

<DragDropProvider
  onDragEnd={(event) => {
    if (event.canceled) return;

    const { source } = event.operation;

    if (isSortable(source)) {
      const movedToDone = source.group === 'done' && source.initialGroup !== 'done';
      const movedAwayFromDone = source.group !== 'done' && source.initialGroup === 'done';

      if (movedToDone) {
        // Award points via API call
        const task = source.data as CleaningTask;
        if (task.assigneeId) {
          awardPoints(task.assigneeId, task.points);
        }
      }

      if (movedAwayFromDone) {
        // Revoke points if moved back from Done
        const task = source.data as CleaningTask;
        if (task.assigneeId) {
          revokePoints(task.assigneeId, task.points);
        }
      }
    }

    setColumns((prev) => move(prev, event));
  }}
>
```

---

## 8. SignalR Client Integration in React

### Package

```bash
npm install @microsoft/signalr
```

| Package | Version | Notes |
|---|---|---|
| `@microsoft/signalr` | `10.0.0` | Latest stable (published Nov 2025). Ships with built-in TypeScript types. 1.1M weekly downloads. |

> Version 10.0.0 aligns with .NET 10 / ASP.NET Core 10. Fully compatible with the ASP.NET Core SignalR server in OpenFlat's backend APIs.

### Architecture Decision: Multiple Hubs (One Per API)

**Recommendation: One hub per API service** — `CleaningHub` and `ShoppingHub`.

| Approach | Pros | Cons |
|---|---|---|
| **One hub per API** (recommended) | Matches the service boundary architecture; each API owns its hub. Independent deployment. Connection failure in one hub doesn't affect the other. Easier to reason about message contracts. | Two WebSocket connections per client (minimal overhead for 5 users). |
| **Single hub** | One connection. Simpler lifecycle. | Violates service boundary — requires a shared hub project or gateway routing. Couples all real-time features. A single hub crash takes down all real-time features. |

**Rationale for OpenFlat:**
- The plan already defines separate APIs (`cleaning-api`, `shopping-api`) each with their own hub.
- Finance Tracker has no real-time requirements (no SignalR hub needed).
- Two WebSocket connections are negligible for 5 users.
- The Vite dev proxy already routes `/hubs/cleaning` and `/hubs/shopping` to the correct backend.

### Hub Connection Factory

A reusable factory function creates configured `HubConnection` instances:

```typescript
// frontend/src/services/signalr/createHubConnection.ts
import {
  HubConnectionBuilder,
  HubConnection,
  LogLevel,
  HttpTransportType,
} from '@microsoft/signalr';

export function createHubConnection(hubUrl: string): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(hubUrl, {
      // WebSockets preferred; falls back to SSE → Long Polling
      transport: HttpTransportType.WebSockets,
      skipNegotiation: true, // Skip negotiation when using WebSockets only
    })
    .withAutomaticReconnect({
      // Retry with increasing backoff: 0s, 2s, 5s, 10s, 30s, then every 30s
      nextRetryDelayInMilliseconds: (retryContext) => {
        const delays = [0, 2000, 5000, 10000, 30000];
        return delays[retryContext.previousRetryCount] ?? 30000;
      },
    })
    .configureLogging(
      import.meta.env.DEV ? LogLevel.Information : LogLevel.Warning
    )
    .build();
}
```

### Connection Lifecycle Management: Custom Hook

The core pattern is a React hook that manages connection start, stop, and reconnection:

```typescript
// frontend/src/hooks/useSignalRConnection.ts
import { useEffect, useRef, useCallback } from 'react';
import { HubConnection, HubConnectionState } from '@microsoft/signalr';
import { createHubConnection } from '../services/signalr/createHubConnection';

interface UseSignalRConnectionOptions {
  hubUrl: string;
  onReconnecting?: () => void;
  onReconnected?: () => void;
  onClose?: (error?: Error) => void;
}

export function useSignalRConnection({
  hubUrl,
  onReconnecting,
  onReconnected,
  onClose,
}: UseSignalRConnectionOptions) {
  const connectionRef = useRef<HubConnection | null>(null);

  useEffect(() => {
    const connection = createHubConnection(hubUrl);
    connectionRef.current = connection;

    // Lifecycle event handlers
    connection.onreconnecting((error) => {
      console.warn(`[SignalR] Reconnecting to ${hubUrl}...`, error);
      onReconnecting?.();
    });

    connection.onreconnected((connectionId) => {
      console.info(`[SignalR] Reconnected to ${hubUrl}`, connectionId);
      onReconnected?.();
    });

    connection.onclose((error) => {
      console.warn(`[SignalR] Connection to ${hubUrl} closed`, error);
      onClose?.(error ?? undefined);
    });

    // Start connection
    connection.start().catch((err) => {
      console.error(`[SignalR] Failed to connect to ${hubUrl}`, err);
    });

    // Cleanup: stop connection on unmount
    return () => {
      if (connection.state !== HubConnectionState.Disconnected) {
        connection.stop();
      }
    };
  }, [hubUrl]); // Only reconnect if the URL changes

  return connectionRef;
}
```

### Integration with State Management: Zustand

**Recommendation: Zustand** for SignalR state integration.

**Why Zustand over Context/useReducer:**
- SignalR messages arrive outside React's render cycle. Zustand's `setState` can be called from anywhere (no need to be inside a component tree).
- No provider nesting — stores are consumed directly via hooks.
- Selective subscriptions — components only re-render when the specific slice of state they use changes.
- Works seamlessly with refs — the hub connection can call `useCleaningStore.getState()` from outside React.

#### Cleaning Board Store

```typescript
// frontend/src/features/cleaning/store/cleaningStore.ts
import { create } from 'zustand';
import type { KanbanColumns, CleaningTask } from '../types';

interface CleaningState {
  columns: KanbanColumns;
  isConnected: boolean;

  // Actions
  setColumns: (columns: KanbanColumns) => void;
  moveTask: (taskId: string, fromColumn: string, toColumn: string, newIndex: number) => void;
  addTask: (task: CleaningTask) => void;
  updateTask: (task: CleaningTask) => void;
  deleteTask: (taskId: string) => void;
  setConnected: (connected: boolean) => void;
}

export const useCleaningStore = create<CleaningState>((set) => ({
  columns: { todo: [], inProgress: [], awaitingReview: [], done: [] },
  isConnected: false,

  setColumns: (columns) => set({ columns }),

  moveTask: (taskId, fromColumn, toColumn, newIndex) =>
    set((state) => {
      const newColumns = { ...state.columns };
      const sourceItems = [...newColumns[fromColumn]];
      const taskIndex = sourceItems.findIndex((t) => t.id === taskId);
      if (taskIndex === -1) return state;

      const [task] = sourceItems.splice(taskIndex, 1);
      newColumns[fromColumn] = sourceItems;

      const targetItems = [...newColumns[toColumn]];
      targetItems.splice(newIndex, 0, task);
      newColumns[toColumn] = targetItems;

      return { columns: newColumns };
    }),

  addTask: (task) =>
    set((state) => ({
      columns: {
        ...state.columns,
        todo: [...state.columns.todo, task],
      },
    })),

  updateTask: (updatedTask) =>
    set((state) => {
      const newColumns = { ...state.columns };
      for (const [columnId, tasks] of Object.entries(newColumns)) {
        const index = tasks.findIndex((t) => t.id === updatedTask.id);
        if (index !== -1) {
          const newTasks = [...tasks];
          newTasks[index] = updatedTask;
          newColumns[columnId] = newTasks;
          break;
        }
      }
      return { columns: newColumns };
    }),

  deleteTask: (taskId) =>
    set((state) => {
      const newColumns = { ...state.columns };
      for (const [columnId, tasks] of Object.entries(newColumns)) {
        const index = tasks.findIndex((t) => t.id === taskId);
        if (index !== -1) {
          newColumns[columnId] = tasks.filter((t) => t.id !== taskId);
          break;
        }
      }
      return { columns: newColumns };
    }),

  setConnected: (connected) => set({ isConnected: connected }),
}));
```

#### SignalR ↔ Zustand Bridge Hook

This hook connects the SignalR hub to the Zustand store — incoming messages update the store directly:

```typescript
// frontend/src/features/cleaning/hooks/useCleaningHub.ts
import { useEffect } from 'react';
import { useSignalRConnection } from '../../../hooks/useSignalRConnection';
import { useCleaningStore } from '../store/cleaningStore';
import type { CleaningTask } from '../types';

export function useCleaningHub() {
  const connectionRef = useSignalRConnection({
    hubUrl: '/hubs/cleaning',
    onReconnected: () => {
      useCleaningStore.getState().setConnected(true);
      // Re-fetch full state on reconnect to sync any missed updates
      connectionRef.current?.invoke('GetBoardState');
    },
    onReconnecting: () => {
      useCleaningStore.getState().setConnected(false);
    },
    onClose: () => {
      useCleaningStore.getState().setConnected(false);
    },
  });

  useEffect(() => {
    const connection = connectionRef.current;
    if (!connection) return;

    // Register server → client message handlers
    connection.on('TaskMoved', (taskId: string, fromColumn: string, toColumn: string, newIndex: number) => {
      useCleaningStore.getState().moveTask(taskId, fromColumn, toColumn, newIndex);
    });

    connection.on('TaskCreated', (task: CleaningTask) => {
      useCleaningStore.getState().addTask(task);
    });

    connection.on('TaskUpdated', (task: CleaningTask) => {
      useCleaningStore.getState().updateTask(task);
    });

    connection.on('TaskDeleted', (taskId: string) => {
      useCleaningStore.getState().deleteTask(taskId);
    });

    connection.on('BoardState', (columns: Record<string, CleaningTask[]>) => {
      useCleaningStore.getState().setColumns(columns);
      useCleaningStore.getState().setConnected(true);
    });

    return () => {
      connection.off('TaskMoved');
      connection.off('TaskCreated');
      connection.off('TaskUpdated');
      connection.off('TaskDeleted');
      connection.off('BoardState');
    };
  }, [connectionRef]);

  return connectionRef;
}
```

#### Sending Messages (Client → Server)

```typescript
// frontend/src/features/cleaning/hooks/useCleaningActions.ts
import { useCallback } from 'react';
import { useCleaningHub } from './useCleaningHub';

export function useCleaningActions() {
  const connectionRef = useCleaningHub();

  const moveTask = useCallback(
    (taskId: string, fromColumn: string, toColumn: string, newIndex: number) => {
      connectionRef.current?.invoke('MoveTask', taskId, fromColumn, toColumn, newIndex);
    },
    [connectionRef]
  );

  const createTask = useCallback(
    (title: string, points: number) => {
      connectionRef.current?.invoke('CreateTask', title, points);
    },
    [connectionRef]
  );

  return { moveTask, createTask };
}
```

### Pattern for Multiple Hubs

Each module has its own hub hook following the same pattern. The hooks are independent and only mounted when the user navigates to the corresponding module:

```
frontend/src/
├── hooks/
│   └── useSignalRConnection.ts        # Shared connection lifecycle hook
├── services/
│   └── signalr/
│       └── createHubConnection.ts     # Shared connection factory
├── features/
│   ├── cleaning/
│   │   ├── hooks/
│   │   │   ├── useCleaningHub.ts      # CleaningHub ↔ Zustand bridge
│   │   │   └── useCleaningActions.ts  # Client → server invocations
│   │   └── store/
│   │       └── cleaningStore.ts       # Zustand store
│   └── shopping/
│       ├── hooks/
│       │   ├── useShoppingHub.ts      # ShoppingHub ↔ Zustand bridge
│       │   └── useShoppingActions.ts  # Client → server invocations
│       └── store/
│           └── shoppingStore.ts       # Zustand store
```

**Connection lifecycle:**
- Connections are created when the module component mounts (user navigates to Cleaning Board or Shopping List).
- Connections are stopped when the component unmounts (user navigates away).
- `withAutomaticReconnect()` handles transient disconnections while the module is active.
- On reconnect, the hub bridge re-fetches full state to reconcile any missed updates.

### Reconnection Strategy

```
Disconnect detected
  → withAutomaticReconnect kicks in
  → Retry backoff: 0s → 2s → 5s → 10s → 30s → 30s → ...
  → onreconnecting callback → set isConnected: false → UI shows "Reconnecting..." banner
  → onreconnected callback → invoke GetBoardState → set isConnected: true → UI clears banner
  → If connection permanently lost (onclose) → UI shows "Connection lost" error + manual retry button
```

### Why Not React Context for SignalR State?

| Factor | React Context | Zustand |
|---|---|---|
| **Updates from outside React** | Requires refs + forceUpdate hacks | `store.getState().action()` works anywhere |
| **Re-render scope** | All consumers re-render on any change | Selective subscriptions via selectors |
| **Provider nesting** | Needs `<CleaningProvider>` + `<ShoppingProvider>` wrapping | No providers needed |
| **DevTools** | React DevTools only | Zustand DevTools middleware (Redux DevTools compatible) |
| **Testing** | Must wrap components in providers | Can test store logic independently |
| **Bundle size** | 0 (built-in) | ~1.1 kB gzipped (negligible) |

For OpenFlat's use case (SignalR messages arriving outside render cycle, two independent feature stores), Zustand is the better fit.

### Required Package

```bash
npm install zustand
```

| Package | Version | Notes |
|---|---|---|
| `zustand` | `5.x` | Latest stable. ~45M weekly downloads. MIT license. 50k+ GitHub stars. |

---

## 9. Data Fetching Strategy for Multiple REST APIs

### Library Comparison

| Criteria | **TanStack Query (React Query) v5** | **SWR v2** | **Custom hooks (useEffect + fetch)** |
|---|---|---|---|
| **Weekly downloads** | ~8.5M | ~4.2M | N/A |
| **Bundle size (gzipped)** | ~13 kB | ~4.2 kB | 0 |
| **Automatic caching** | Yes — configurable `staleTime`, `gcTime` | Yes — `dedupingInterval`, `refreshInterval` | Manual implementation required |
| **Automatic refetching** | On mount, on focus, on reconnect, on interval (all configurable) | On focus, on reconnect, on interval | Manual implementation required |
| **Mutation support** | First-class `useMutation` with `onMutate` (optimistic), `onSuccess`, `onError`, `onSettled` | No built-in mutations; `useSWRMutation` is a separate package | Manual |
| **Optimistic updates** | Built-in pattern via `onMutate` + `queryClient.setQueryData` + rollback on error | Manual with `mutate(data, false)` | Manual |
| **Query invalidation** | `queryClient.invalidateQueries({ queryKey })` — targeted, pattern-based | `mutate(key)` — key-based revalidation | Manual |
| **Devtools** | Dedicated React Query DevTools (visual query inspector) | SWR DevTools (community, less mature) | None |
| **Multiple API base URLs** | Easy — just use different fetch functions per query, or configure per-query `queryFn` | Same | Same |
| **TypeScript** | Excellent — generic inference from `queryFn` return type | Good — generic type parameters | Manual typing |
| **Dependent queries** | `enabled` option — clean pattern for sequential fetches | Conditional key (return `null` to skip) | Manual chaining |
| **Infinite queries / pagination** | `useInfiniteQuery` built-in | `useSWRInfinite` built-in | Manual |
| **Offline support** | `networkMode: 'offlineFirst'` + persistence plugins | Limited — `isOnline` flag but no built-in persistence | Manual |
| **Integration with Zustand** | Complimentary — TanStack Query for server state, Zustand for client state | Same | Same |

### Decision: **TanStack Query (React Query) v5**

**Rationale:**

1. **First-class mutation support.** OpenFlat has significant write operations (create/edit/delete tasks, log expenses, add shopping items, add comments). TanStack Query's `useMutation` with `onMutate` for optimistic updates and automatic rollback on error is far more robust than SWR's mutation story.

2. **Targeted query invalidation.** After a mutation (e.g., logging an expense), `queryClient.invalidateQueries({ queryKey: ['expenses'] })` surgically refetches only affected data. This is critical when 3 separate APIs serve different data — invalidation must be precise.

3. **`enabled` option for dependent queries.** The Finance Tracker's Settlement View depends on the expenses list. TanStack Query's `enabled: !!expenses` pattern cleanly handles this. SWR requires returning `null` as the key, which is less ergonomic.

4. **Complements Zustand perfectly.** TanStack Query manages **server state** (data from APIs — expenses, shopping items, initial board state). Zustand manages **client state** (current user session, points, SignalR connection status, real-time board updates). This separation is a well-established pattern — each tool handles what it's best at. No overlap or conflict.

5. **Devtools for debugging.** React Query DevTools shows all cached queries, their status, and stale/fresh state in a visual panel. Invaluable during development when debugging 3 separate API integrations.

6. **Industry standard for React data fetching.** TanStack Query v5 is the dominant choice for React apps with REST APIs. Extensive documentation, community, and ecosystem support.

### Why NOT SWR?

- SWR's mutation story (`useSWRMutation`) is a separate package with a less integrated API. No built-in optimistic update pattern with automatic rollback.
- No visual DevTools comparable to React Query DevTools.
- Good for read-heavy apps. OpenFlat is read+write equally.

### Why NOT custom hooks?

- Implementing caching, deduplication, refetch-on-focus, optimistic updates, and error retry manually is several hundred lines of code that TanStack Query provides out of the box.
- Error-prone. Easy to introduce stale data bugs, race conditions, or missing cache invalidations.

### Multi-API Configuration Pattern

Each API gets its own query key prefix and fetch function:

```typescript
// Query key factories per API
const cleaningKeys = {
  all: ['cleaning'] as const,
  board: () => [...cleaningKeys.all, 'board'] as const,
  task: (id: string) => [...cleaningKeys.all, 'task', id] as const,
  comments: (taskId: string) => [...cleaningKeys.all, 'comments', taskId] as const,
};

const shoppingKeys = {
  all: ['shopping'] as const,
  items: () => [...shoppingKeys.all, 'items'] as const,
  comments: (itemId: string) => [...shoppingKeys.all, 'comments', itemId] as const,
};

const financeKeys = {
  all: ['finance'] as const,
  expenses: () => [...financeKeys.all, 'expenses'] as const,
  settlement: () => [...financeKeys.all, 'settlement'] as const,
};
```

Each API has its own base URL (from Aspire service discovery) and its own fetch wrapper. TanStack Query doesn't care where the data comes from — each `queryFn` can call a different API.

### Interaction with SignalR

For the Cleaning Board and Shopping List, initial data is fetched via REST (TanStack Query), then real-time updates flow via SignalR into Zustand. Two patterns:

1. **SignalR-primary (Cleaning Board):** Initial board state fetched via SignalR `GetBoardState` (not REST). All subsequent updates via SignalR. Zustand is the source of truth. TanStack Query is NOT used for board data.

2. **REST-primary with SignalR push (Shopping List):** Initial data fetched via REST (TanStack Query). SignalR pushes change notifications, which trigger `queryClient.invalidateQueries()` to refetch from REST. TanStack Query is the source of truth.

3. **REST-only (Finance Tracker):** All data via REST. No SignalR. TanStack Query is the source of truth.

### Required Package

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

| Package | Version | Notes |
|---|---|---|
| `@tanstack/react-query` | `5.x` | Core library. ~8.5M weekly downloads. MIT license. |
| `@tanstack/react-query-devtools` | `5.x` | Dev-only visual query inspector. Tree-shaken out in production builds. |

---

## 10. Debt Simplification Algorithm for Finance Tracker Settlement

### Problem Statement

Given $N$ users (5 in OpenFlat) and a list of expenses, calculate the minimum number of transactions to settle all debts. Each expense is split evenly among all 5 users. The Settlement View must show "who owes whom how much" with the fewest possible transfers.

### Algorithm Comparison

| Algorithm | Description | Optimality | Complexity | Implementation |
|---|---|---|---|---|
| **Net balance + greedy matching** | Compute each user's net balance (paid − fair share). Pair the largest debtor with the largest creditor, settle the minimum of the two, repeat. | Near-optimal. Produces at most $N-1$ transactions. Not always mathematically minimum but close. | $O(N \log N)$ (sort + iterate) | Simple — 20–30 lines |
| **Net balance + graph reduction (min-cash-flow)** | Same net balances, but use a priority queue (max-heap for creditors, min-heap for debtors) to always match extremes. | Optimal when no subset sums to zero. Produces at most $N-1$ transactions. | $O(N \log N)$ | Moderate — 30–40 lines |
| **Subset-sum partitioning (NP-hard optimal)** | Find subsets of balances that sum to zero, settle each subset independently. Provably minimum number of transactions. | Truly optimal (can beat $N-1$ when subsets cancel). | $O(2^N)$ — exponential | Complex. Only feasible for small $N$. |

### Decision: **Net balance + greedy matching (max-debtor ↔ max-creditor)**

**Rationale:**

1. **Sufficient for 5 users.** With $N = 5$, all three algorithms would produce the same result in most practical cases. The greedy approach produces at most 4 transactions (N−1), which is already minimal for most real-world expense patterns among 5 people.

2. **Simple to implement and understand.** The algorithm is ~20 lines of code. Easy to test, debug, and verify against manual calculations (per SC-008 success criteria).

3. **Deterministic and explainable.** The result can be displayed as "Sam owes Alex €15.00" — users can understand the logic. No opaque graph optimization.

4. **$O(N \log N)$ for $N = 5$ is instant.** Performance is irrelevant at this scale, but the algorithm is still efficient.

5. **The subset-sum approach is overkill.** It produces truly minimum transactions only when subsets of balances happen to sum to zero (e.g., A owes €10, B owes €10, C is owed €10, D is owed €10 → 2 transactions instead of 3). With 5 users, the practical difference is at most 1 fewer transaction in rare edge cases. Not worth the complexity.

### Algorithm Steps

1. **Compute net balance per user:**
   $$\text{balance}_i = \text{total\_paid}_i - \frac{\sum_{j} \text{total\_paid}_j}{N}$$
   - Positive balance → creditor (is owed money)
   - Negative balance → debtor (owes money)
   - Zero balance → settled

2. **Separate into creditors (positive) and debtors (negative).** Sort creditors descending, debtors ascending (by absolute value descending).

3. **Greedy pairing loop:**
   - Take the largest creditor and the largest debtor.
   - The transfer amount is $\min(|\text{creditor}|, |\text{debtor}|)$.
   - Record: "Debtor pays Creditor €amount".
   - Reduce both balances. Remove anyone who reaches zero.
   - Repeat until all balances are zero.

4. **Result:** A list of settlement transactions, guaranteed to have at most $N - 1 = 4$ entries.

### Example

Users: Alex, Jordan, Sam, Taylor, Casey. Total expenses: €250.

| User | Paid | Fair share (€250 ÷ 5) | Net balance |
|---|---|---|---|
| Alex | €100 | €50 | +€50 (creditor) |
| Jordan | €80 | €50 | +€30 (creditor) |
| Sam | €40 | €50 | −€10 (debtor) |
| Taylor | €20 | €50 | −€30 (debtor) |
| Casey | €10 | €50 | −€40 (debtor) |

**Greedy matching:**

1. Largest creditor: Alex (+€50). Largest debtor: Casey (−€40). Transfer: €40. → "Casey pays Alex €40.00". Alex: +€10, Casey: 0 (done).
2. Largest creditor: Jordan (+€30). Largest debtor: Taylor (−€30). Transfer: €30. → "Taylor pays Jordan €30.00". Both at 0 (done).
3. Largest creditor: Alex (+€10). Largest debtor: Sam (−€10). Transfer: €10. → "Sam pays Alex €10.00". Both at 0 (done).

**Result: 3 transactions** (optimal for this case).

### Edge Cases

- **All equal:** Every balance is 0 → empty list → "All settled — no payments needed" (FR-024).
- **One payer:** One user paid everything → 4 transactions, each other user pays their fair share.
- **Rounding:** Use integer cents (multiply by 100) for all calculations to avoid floating-point errors. Display as €XX.XX. Any remainder cents from uneven division are absorbed by the last transaction or distributed round-robin.

### Alternatives Considered

- **Subset-sum partitioning:** Truly optimal but exponential complexity ($O(2^5) = 32$ — feasible for 5 users, but adds implementation complexity with no practical benefit for this scale). Would only save at most 1 transaction in rare edge cases.
- **Simple pairwise netting (no minimization):** Just net each pair (A↔B, A↔C, ...). Produces up to $\binom{5}{2} = 10$ transactions. Fails FR-023's requirement to minimize transactions.
- **Linear programming / min-cost flow:** Academic approach. Vastly overkill for 5 users. Complex to implement correctly.

---

## Summary of Frontend Research Findings

| Question | Finding |
|---|---|
| **Drag-and-drop library** | **`@dnd-kit/react` v0.3.x** (new architecture). `react-beautiful-dnd` is deprecated. `@hello-pangea/dnd` is a fork but uses legacy patterns incompatible with React 19 strict mode. |
| **Kanban board pattern** | `DragDropProvider` + `useSortable` with `group` per column + `move()` from `@dnd-kit/helpers`. 4 columns, cards flow between groups. |
| **Mobile touch support** | Built-in `PointerSensor` — no extra config. Distance threshold prevents accidental drags during scroll. |
| **Point scoring on drag** | Detect `source.group === 'done' && source.initialGroup !== 'done'` in `onDragEnd` handler. |
| **SignalR client** | `@microsoft/signalr` v10.0.0 with `HubConnectionBuilder`, `withAutomaticReconnect()`, `withUrl()`. |
| **Hub architecture** | One hub per API (`CleaningHub`, `ShoppingHub`). Matches service boundaries. Finance has no hub. |
| **Connection lifecycle** | Connect on module mount, disconnect on unmount. `withAutomaticReconnect` with custom backoff. Re-fetch full state on reconnect. |
| **State management** | **Zustand** for client state (current user, points, SignalR real-time data). **TanStack Query** for server state (REST API data fetching, caching, mutations). |
| **Data fetching** | **TanStack Query v5** — caching, mutations with optimistic updates, targeted invalidation across 3 APIs. Complements Zustand (server state vs client state). |
| **Debt simplification** | **Greedy net-balance matching** — compute per-user net balance, pair largest debtor with largest creditor, repeat. At most $N-1$ transactions. Simple, deterministic, sufficient for 5 users. |
| **Frontend packages** | `@dnd-kit/react` ^0.3.2, `@dnd-kit/helpers` ^0.3.2, `@microsoft/signalr` ^10.0.0, `zustand` ^5.0.0, `@tanstack/react-query` ^5.0.0, `@tanstack/react-query-devtools` ^5.0.0 |

---
---

# Phase 0 Research: Expo React Native Mobile App

**Date**: 2026-03-09
**Topics**: SignalR in Expo, Drag-and-drop for Kanban (mobile), Expo Router, Shared i18n, NativeWind

---

## 11. @microsoft/signalr Client in Expo React Native

- **Decision**: Use `@microsoft/signalr` (same npm package as web, v10.0.0) with **WebSocket-only transport** and `skipNegotiation: true`. Absolute URLs are required (no relative paths).
- **Rationale**: The `@microsoft/signalr` JS client runs in React Native / Expo because RN provides global `WebSocket` and `XMLHttpRequest` implementations. However, two constraints apply: (1) React Native lacks `EventSource`, so the Server-Sent Events fallback transport will fail — force `HttpTransportType.WebSockets` to avoid it; (2) React Native has no `window.location`, so relative hub URLs like `/hubs/cleaning` won't resolve — full absolute URLs (e.g., `https://api.example.com/hubs/cleaning`) are required. The existing `createHubConnection` factory from the web app already uses `skipNegotiation: true` and `HttpTransportType.WebSockets`, which is the exact configuration needed for React Native. The same `withAutomaticReconnect()` and Zustand bridge pattern from the web app can be reused in the mobile app with no architectural changes — only the hub URL construction differs (absolute instead of relative). No polyfills are needed for Expo SDK 52+ (the Hermes engine provides sufficient Web API compatibility).
- **Alternatives considered**:
  - **Socket.IO**: Would require replacing ASP.NET Core SignalR on the backend with a different WebSocket server. Rejected — locks out the .NET ecosystem.
  - **Raw WebSocket (no library)**: Loses SignalR's automatic reconnection, hub method invocation protocol, and group management. Rejected.
  - **`react-native-signalr` (community wrapper)**: Unmaintained, last updated 2020. Rejected — the official package works directly.

---

## 12. Drag-and-Drop for Kanban Board in React Native / Expo

- **Decision**: Build on **`react-native-gesture-handler`** (v2.x) + **`react-native-reanimated`** (v3.x) directly, using `PanGesture` for drag tracking and shared values for 60fps animations. Both are Expo SDK 52+ built-in compatible (included in the Expo managed workflow).
- **Rationale**: The web app uses `@dnd-kit/react`, but that library is DOM-based and does not work in React Native. For a 4-column Kanban board requiring cross-column drag-and-drop on mobile, no single RN library provides a production-quality, well-maintained, cross-list draggable solution comparable to `@dnd-kit`. The two foundational libraries (`gesture-handler` + `reanimated`) are the standard building blocks recommended by the React Native community and Expo documentation for custom gesture-driven interactions. Key technical points: (1) `PanGesture` from gesture-handler provides reliable touch tracking with configurable activation distance; (2) Reanimated's `useSharedValue` + `useAnimatedStyle` keeps drag animations on the UI thread at 60fps; (3) `runOnJS` bridges from the UI thread back to JS for state updates on drop; (4) Both libraries ship as part of Expo SDK 52+ — no native module installation needed. The Kanban implementation requires: a horizontally scrollable column container, draggable card components with `PanGesture`, hit-testing against column boundaries, and animated placeholder insertion.
- **Alternatives considered**:
  - **`react-native-draggable-flatlist`** (Shopify): Excellent for single-list reordering but does **not** support cross-list drag (essential for Kanban columns). Rejected.
  - **`react-native-dnd-board`**: Kanban-specific but poorly maintained (~50 stars, known Reanimated v3 bugs). Rejected.
  - **`@mgcrea/react-native-dnd`**: dnd-kit-inspired but low adoption (<200 stars), no stable v1.0. Rejected.
  - **`react-native-drax`**: Cross-container support but Reanimated v3 / Expo SDK 50+ compatibility issues. Rejected.

---

## 13. Expo Router File-Based Routing

- **Decision**: Use **Expo Router v4** (ships with Expo SDK 52+) with **group-based route nesting**: a root `_layout.tsx` (Stack), a `(tabs)/_layout.tsx` (Tab navigator), and per-module stack screens nested under group folders.
- **Rationale**: Expo Router v4 is the default and only supported routing solution for Expo SDK 52+. It provides file-based routing with native navigation primitives (React Navigation under the hood). The recommended pattern:
  ```
  app/
  ├── _layout.tsx              → Root Stack navigator
  ├── user-selection.tsx       → Initial screen (outside tabs)
  ├── (tabs)/
  │   ├── _layout.tsx          → Tab navigator
  │   ├── index.tsx            → Dashboard tab
  │   ├── cleaning/
  │   │   ├── _layout.tsx      → Stack within Cleaning tab
  │   │   ├── index.tsx        → Kanban board
  │   │   └── [taskId].tsx     → Task detail/edit modal
  │   ├── shopping/
  │   │   ├── _layout.tsx
  │   │   └── index.tsx
  │   └── finance/
  │       ├── _layout.tsx
  │       └── index.tsx
  ```
  Group folders `(parentheses)` create layout wrappers without adding URL segments. Each tab has its own nested Stack for detail screens. `user-selection.tsx` sits outside `(tabs)` so it renders without the tab bar.
- **Alternatives considered**:
  - **React Navigation (manual)**: Still the underlying engine, but Expo Router wraps it with file-based conventions and auto-generated deep linking. Rejected — Expo Router is the recommended path.
  - **Solito (cross-platform routing)**: Not applicable since web uses React Router (not Next.js). Rejected.

---

## 14. Sharing i18n Resources Between Web and Mobile

- **Decision**: Use **`i18next`** + **`react-i18next`** in both web and mobile (same packages). Share translation JSON files via a **workspace-level `shared/locales/` directory** referenced by both `frontend/` and `mobile/`.
- **Rationale**: `react-i18next` works identically in React DOM and React Native. Translation JSON files are pure data with no platform-specific content. Sharing approach:
  1. Place translation files in `shared/locales/en.json`, `shared/locales/de.json`.
  2. Web app imports via a Vite alias or relative path; uses `i18next-http-backend` for lazy loading.
  3. Mobile app imports via Metro's `extraNodeModules`; bundles resources at build time (preferred for mobile to avoid network fetch at startup).
  4. Both apps initialize i18next with the same resources but platform-specific language detectors: `i18next-browser-languagedetector` (web) vs. `expo-localization` (mobile).
- **Alternatives considered**:
  - **Duplicate translation files**: Simpler setup but creates drift risk. Rejected.
  - **npm workspace package (`@openflat/i18n`)**: Viable but adds boilerplate for what are static JSON files. Deferred, not rejected.
  - **Lingui / FormatJS**: Capable alternatives but would require switching from i18next across the stack. Rejected.

---

## 15. NativeWind (Tailwind for React Native) + Expo SDK 52+

- **Decision**: **Compatible.** Use **NativeWind v4** (stable, `nativewind@^4.1`) with Expo SDK 52+. Requires `tailwindcss` v3.4.x (NativeWind v4 does not yet support Tailwind CSS v4).
- **Rationale**: NativeWind v4 was rebuilt for the New Architecture (Fabric) and works with Expo SDK 52+ in the managed workflow. It uses a **Metro CSS transformer** to compile Tailwind classes at build time into React Native `StyleSheet` objects — no runtime CSS parsing. Key points:
  1. Requires `nativewind/metro` in Metro config and `nativewind/babel` in Babel config.
  2. A `global.css` file with `@tailwind` directives is imported in root layout.
  3. `tailwind.config.ts` is shared between mobile and web (with platform-specific content paths). Design tokens defined once apply to both.
  4. `className` prop works on all RN core components without wrapper components.
  5. Responsive variants (`sm:`, `md:`, `lg:`) work based on `useWindowDimensions`.
  6. **Limitation**: Some web-only utilities (`grid`, `backdrop-blur`, pseudo-elements) have no RN equivalent and are silently ignored.
- **Alternatives considered**:
  - **Tamagui**: Full cross-platform UI kit but opinionated, conflicts with Tailwind on web. Rejected.
  - **Unistyles v2**: Fast StyleSheet replacement but lacks Tailwind syntax. Rejected.
  - **StyleSheet.create (manual)**: No dependencies but loses Tailwind utility-class workflow. Rejected.
  - **Restyle (Shopify)**: Theme-first but doesn't share syntax with Tailwind. Rejected.

---

## Summary of Mobile Research Findings

| Question | Finding |
|---|---|
| **SignalR client** | Same `@microsoft/signalr` v10.0.0 package. Force WebSocket-only + `skipNegotiation`. Use absolute URLs. |
| **Drag-and-drop (Kanban)** | `react-native-gesture-handler` + `react-native-reanimated` (PanGesture). Custom Kanban implementation. No off-the-shelf cross-list DnD library is production-ready for RN. |
| **Routing** | Expo Router v4 with group-based nesting: root Stack → `(tabs)` Tab nav → per-module Stack. `user-selection` outside tabs. |
| **i18n sharing** | Shared `shared/locales/` directory. Both platforms use `i18next` + `react-i18next`. Platform-specific: language detector, loading strategy. |
| **Styling** | NativeWind v4 (`nativewind@^4.1`) + `tailwindcss` v3.4.x. Shared `tailwind.config.ts`. Metro CSS transformer. |
| **Mobile packages** | `expo-router`, `react-native-gesture-handler`, `react-native-reanimated`, `nativewind` ^4.1, `@microsoft/signalr` ^10.0.0, `expo-localization`, `i18next`, `react-i18next` |
