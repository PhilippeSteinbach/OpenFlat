# Data Model: OpenFlat Foundation

**Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md)

---

## Overview

Single PostgreSQL database `openflat` with **three schemas** — one per microservice. Each API project owns its schema via EF Core `HasDefaultSchema`. A **shared `OpenFlat.Shared` library** defines the predefined user constants (no User table in the DB — users are compile-time constants).

### Schemas

| Schema | Owner | Purpose |
|--------|-------|---------|
| `cleaning` | OpenFlat.Cleaning.Api | Tasks, task assignments, points |
| `shopping` | OpenFlat.Shopping.Api | Shopping items |
| `finance` | OpenFlat.Finance.Api | Expenses |

> Comments are **co-located** with the entity they belong to: `cleaning.comments` and `shopping.comments`. This avoids cross-schema joins while keeping the comment model consistent.

---

## Predefined Users (Compile-Time Constants)

Users are **not** stored in the database. They are defined as constants in `OpenFlat.Shared/Users/PredefinedUsers.cs`.

```csharp
public static class PredefinedUsers
{
    public static readonly IReadOnlyList<UserInfo> All = new[]
    {
        new UserInfo(1, "Alex",   "Coordinator"),
        new UserInfo(2, "Jordan", "Coordinator"),
        new UserInfo(3, "Sam",    "Resident"),
        new UserInfo(4, "Taylor", "Resident"),
        new UserInfo(5, "Casey",  "Resident"),
    };
}

public record UserInfo(int Id, string Name, string Role);
```

All `UserId` foreign keys in database tables reference these predefined IDs (1–5). No FK constraint to a users table — validated at the application layer.

---

## Cleaning Schema

### `cleaning.tasks`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Task unique identifier |
| `title` | `varchar(200)` | NOT NULL | Task title (FR-008, FR-014) |
| `points` | `integer` | NOT NULL, CHECK >= 0 | Point value (FR-008, FR-012) |
| `status` | `varchar(20)` | NOT NULL, default `'todo'` | Column: `todo`, `in_progress`, `awaiting_review`, `done` (FR-007) |
| `assigned_user_id` | `integer` | NULL | Predefined user ID (1–5) if assigned (FR-010) |
| `sort_order` | `integer` | NOT NULL, default 0 | Position within column for drag-and-drop ordering (FR-009) |
| `created_by_user_id` | `integer` | NOT NULL | User who created the task |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | Last modification timestamp |

**Indexes**:
- `ix_tasks_status` on `(status)` — filter by column
- `ix_tasks_status_sort` on `(status, sort_order)` — column rendering order
- `ix_tasks_assigned_user_id` on `(assigned_user_id)` WHERE `assigned_user_id IS NOT NULL` — leaderboard queries

**EF Core Entity**:

```csharp
public class CleaningTask
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public int Points { get; set; }
    public TaskStatus Status { get; set; } = TaskStatus.Todo;
    public int? AssignedUserId { get; set; }
    public int SortOrder { get; set; }
    public int CreatedByUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<CleaningComment> Comments { get; set; } = new List<CleaningComment>();
}

public enum TaskStatus
{
    Todo,
    InProgress,
    AwaitingReview,
    Done
}
```

**Business Rules**:
- Moving to `Done` with `AssignedUserId != null` → credit `Points` to that user (FR-012)
- Moving out of `Done` → deduct `Points` from assigned user (FR-013)
- Moving to `Done` with `AssignedUserId == null` → no points, visual warning (FR-015)
- Editing `Points` while in `Done` → recalculate delta for assigned user (FR-014a)
- Deleting a `Done` task → deduct `Points` from assigned user (FR-014b)
- `Status` values map to Kanban columns: `todo` → "To Do", `in_progress` → "In Progress", `awaiting_review` → "Awaiting Review", `done` → "Done"

### `cleaning.comments`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Comment unique identifier |
| `task_id` | `uuid` | NOT NULL, FK → `cleaning.tasks(id)` ON DELETE CASCADE | Parent task |
| `user_id` | `integer` | NOT NULL | Author (predefined user ID 1–5) (FR-026) |
| `text` | `varchar(2000)` | NOT NULL, CHECK `length(text) > 0` | Comment body (FR-032) |
| `is_edited` | `boolean` | NOT NULL, default `false` | Edited indicator (FR-029) |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Timestamp (FR-026) |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | Last edit timestamp |

**Indexes**:
- `ix_cleaning_comments_task_id` on `(task_id)` — load comments for a task
- `ix_cleaning_comments_task_created` on `(task_id, created_at)` — chronological comment thread

**EF Core Entity**:

```csharp
public class CleaningComment
{
    public Guid Id { get; set; }
    public Guid TaskId { get; set; }
    public int UserId { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool IsEdited { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public CleaningTask Task { get; set; } = null!;
}
```

**Business Rules**:
- Only the author (`UserId == currentUserId`) can edit or delete (FR-027, FR-028)
- Editing sets `IsEdited = true` and updates `UpdatedAt` (FR-029)
- Deleting a comment is a hard delete (FR-027)
- Cascade delete when parent task is deleted (FR-014b)

---

## Shopping Schema

### `shopping.items`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Item unique identifier |
| `name` | `varchar(200)` | NOT NULL, CHECK `length(name) > 0` | Item name (FR-016, FR-031) |
| `quantity` | `integer` | NOT NULL, CHECK > 0 | Quantity needed (FR-017) |
| `added_by_user_id` | `integer` | NOT NULL | User who added the item (FR-016) |
| `is_bought` | `boolean` | NOT NULL, default `false` | Active (`false`) vs Recently Bought (`true`) (FR-018) |
| `bought_at` | `timestamptz` | NULL | When checked off — used for 7-day auto-clear (FR-019b) |
| `bought_by_user_id` | `integer` | NULL | User who checked it off |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | Last modification timestamp |

**Indexes**:
- `ix_items_is_bought` on `(is_bought)` — separate active vs recently bought queries
- `ix_items_bought_at` on `(bought_at)` WHERE `is_bought = true` — auto-clear query (find items older than 7 days)

**EF Core Entity**:

```csharp
public class ShoppingItem
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public int AddedByUserId { get; set; }
    public bool IsBought { get; set; }
    public DateTimeOffset? BoughtAt { get; set; }
    public int? BoughtByUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<ShoppingComment> Comments { get; set; } = new List<ShoppingComment>();
}
```

**Business Rules**:
- Check off → set `IsBought = true`, `BoughtAt = now()`, `BoughtByUserId = currentUserId` (FR-018)
- Undo (tap recently bought) → set `IsBought = false`, `BoughtAt = null`, `BoughtByUserId = null` (FR-019a)
- Auto-clear: items with `IsBought = true` AND `BoughtAt < now() - 7 days` are hard-deleted (FR-019b)
  - Implemented via a periodic background check (e.g., on each Shopping API request or a timed hosted service)
- Items cannot be manually deleted — lifecycle is: add → buy → auto-clear (Clarification session)
- Editing allowed on active items only (`IsBought = false`): name and quantity (FR-017a)

### `shopping.comments`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Comment unique identifier |
| `item_id` | `uuid` | NOT NULL, FK → `shopping.items(id)` ON DELETE CASCADE | Parent shopping item |
| `user_id` | `integer` | NOT NULL | Author (predefined user ID 1–5) |
| `text` | `varchar(2000)` | NOT NULL, CHECK `length(text) > 0` | Comment body |
| `is_edited` | `boolean` | NOT NULL, default `false` | Edited indicator |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Timestamp |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | Last edit timestamp |

**Indexes**:
- `ix_shopping_comments_item_id` on `(item_id)` — load comments for an item
- `ix_shopping_comments_item_created` on `(item_id, created_at)` — chronological thread

**EF Core Entity**:

```csharp
public class ShoppingComment
{
    public Guid Id { get; set; }
    public Guid ItemId { get; set; }
    public int UserId { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool IsEdited { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ShoppingItem Item { get; set; } = null!;
}
```

**Business Rules**: Same as `cleaning.comments` — own-only edit/delete, edited indicator, cascade on parent delete.

---

## Finance Schema

### `finance.expenses`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Expense unique identifier |
| `amount_cents` | `integer` | NOT NULL, CHECK > 0 | Amount in EUR cents (e.g., 5000 = €50.00) (FR-020, FR-030) |
| `description` | `varchar(500)` | NOT NULL | Expense description (FR-020) |
| `logged_by_user_id` | `integer` | NOT NULL | User who logged expense (FR-021) |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Date of expense (FR-021) |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | Last modification timestamp |

**Indexes**:
- `ix_expenses_created_at` on `(created_at DESC)` — chronological listing (FR-021)
- `ix_expenses_logged_by` on `(logged_by_user_id)` — per-user expense queries

**EF Core Entity**:

```csharp
public class Expense
{
    public Guid Id { get; set; }
    public int AmountCents { get; set; }
    public string Description { get; set; } = string.Empty;
    public int LoggedByUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
```

**Business Rules**:
- Amount stored as **integer cents** to avoid floating-point precision issues (research.md §10)
- Only the logging user can edit/delete their own expense (FR-020a, FR-020b, FR-020c)
- Settlement recalculates immediately after any CRUD operation (FR-020a, FR-020b)
- Settlement algorithm: greedy net-balance matching (research.md §10)
  1. Compute each user's net balance = total_paid − (grand_total / 5)
  2. Sort into debtors (negative balance) and creditors (positive balance)
  3. Repeatedly match max-debtor with max-creditor, transfer `min(|debt|, credit)`
  4. Produces at most N-1 = 4 transactions
  5. All amounts in integer cents; validate sum of debts == sum of credits

> **No comments table in the finance schema** — the spec defines comments only for Cleaning Tasks and Shopping Items (FR-025).

---

## EF Core DbContext Configuration

### CleaningDbContext

```csharp
public class CleaningDbContext : DbContext
{
    public DbSet<CleaningTask> Tasks => Set<CleaningTask>();
    public DbSet<CleaningComment> Comments => Set<CleaningComment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("cleaning");

        modelBuilder.Entity<CleaningTask>(e =>
        {
            e.ToTable("tasks");
            e.HasKey(t => t.Id);
            e.Property(t => t.Title).HasMaxLength(200).IsRequired();
            e.Property(t => t.Points).IsRequired();
            e.Property(t => t.Status)
                .HasConversion<string>()
                .HasMaxLength(20)
                .HasDefaultValue(TaskStatus.Todo);
            e.Property(t => t.SortOrder).HasDefaultValue(0);
            e.Property(t => t.CreatedAt).HasDefaultValueSql("now()");
            e.Property(t => t.UpdatedAt).HasDefaultValueSql("now()");

            e.HasIndex(t => t.Status).HasDatabaseName("ix_tasks_status");
            e.HasIndex(t => new { t.Status, t.SortOrder }).HasDatabaseName("ix_tasks_status_sort");
            e.HasIndex(t => t.AssignedUserId)
                .HasDatabaseName("ix_tasks_assigned_user_id")
                .HasFilter("assigned_user_id IS NOT NULL");
        });

        modelBuilder.Entity<CleaningComment>(e =>
        {
            e.ToTable("comments");
            e.HasKey(c => c.Id);
            e.Property(c => c.Text).HasMaxLength(2000).IsRequired();
            e.Property(c => c.IsEdited).HasDefaultValue(false);
            e.Property(c => c.CreatedAt).HasDefaultValueSql("now()");
            e.Property(c => c.UpdatedAt).HasDefaultValueSql("now()");

            e.HasOne(c => c.Task)
                .WithMany(t => t.Comments)
                .HasForeignKey(c => c.TaskId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasIndex(c => c.TaskId).HasDatabaseName("ix_cleaning_comments_task_id");
            e.HasIndex(c => new { c.TaskId, c.CreatedAt }).HasDatabaseName("ix_cleaning_comments_task_created");
        });
    }
}
```

### ShoppingDbContext

```csharp
public class ShoppingDbContext : DbContext
{
    public DbSet<ShoppingItem> Items => Set<ShoppingItem>();
    public DbSet<ShoppingComment> Comments => Set<ShoppingComment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("shopping");

        modelBuilder.Entity<ShoppingItem>(e =>
        {
            e.ToTable("items");
            e.HasKey(i => i.Id);
            e.Property(i => i.Name).HasMaxLength(200).IsRequired();
            e.Property(i => i.Quantity).IsRequired();
            e.Property(i => i.IsBought).HasDefaultValue(false);
            e.Property(i => i.CreatedAt).HasDefaultValueSql("now()");
            e.Property(i => i.UpdatedAt).HasDefaultValueSql("now()");

            e.HasIndex(i => i.IsBought).HasDatabaseName("ix_items_is_bought");
            e.HasIndex(i => i.BoughtAt)
                .HasDatabaseName("ix_items_bought_at")
                .HasFilter("is_bought = true");
        });

        modelBuilder.Entity<ShoppingComment>(e =>
        {
            e.ToTable("comments");
            e.HasKey(c => c.Id);
            e.Property(c => c.Text).HasMaxLength(2000).IsRequired();
            e.Property(c => c.IsEdited).HasDefaultValue(false);
            e.Property(c => c.CreatedAt).HasDefaultValueSql("now()");
            e.Property(c => c.UpdatedAt).HasDefaultValueSql("now()");

            e.HasOne(c => c.Item)
                .WithMany(i => i.Comments)
                .HasForeignKey(c => c.ItemId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasIndex(c => c.ItemId).HasDatabaseName("ix_shopping_comments_item_id");
            e.HasIndex(c => new { c.ItemId, c.CreatedAt }).HasDatabaseName("ix_shopping_comments_item_created");
        });
    }
}
```

### FinanceDbContext

```csharp
public class FinanceDbContext : DbContext
{
    public DbSet<Expense> Expenses => Set<Expense>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("finance");

        modelBuilder.Entity<Expense>(e =>
        {
            e.ToTable("expenses");
            e.HasKey(x => x.Id);
            e.Property(x => x.AmountCents).IsRequired();
            e.Property(x => x.Description).HasMaxLength(500).IsRequired();
            e.Property(x => x.CreatedAt).HasDefaultValueSql("now()");
            e.Property(x => x.UpdatedAt).HasDefaultValueSql("now()");

            e.HasIndex(x => x.CreatedAt)
                .HasDatabaseName("ix_expenses_created_at")
                .IsDescending();
            e.HasIndex(x => x.LoggedByUserId).HasDatabaseName("ix_expenses_logged_by");
        });
    }
}
```

---

## Seed Data

Seeded by the `OpenFlat.MigrationService` after running all migrations.

### Cleaning Tasks (sample)

| Title | Points | Status | Assigned To |
|-------|--------|--------|-------------|
| Vacuum living room | 30 | `todo` | — |
| Clean kitchen counters | 20 | `todo` | — |
| Take out trash | 10 | `in_progress` | Sam |
| Mop bathroom floor | 25 | `awaiting_review` | Alex |
| Wash dishes | 15 | `done` | Jordan |

### Shopping Items (sample)

| Name | Quantity | Added By | Status |
|------|----------|----------|--------|
| Milk | 2 | Alex | active |
| Bread | 1 | Sam | active |
| Dish soap | 1 | Taylor | active |
| Eggs | 12 | Casey | recently bought |

### Expenses (sample)

| Amount | Description | Logged By |
|--------|-------------|-----------|
| €45.50 | Weekly groceries | Alex |
| €12.00 | Cleaning supplies | Sam |
| €8.50 | Toilet paper | Taylor |

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ CLEANING SCHEMA                                                 │
│                                                                 │
│  ┌──────────────┐       1:N       ┌──────────────────┐         │
│  │ cleaning.    │────────────────▶│ cleaning.        │         │
│  │ tasks        │                 │ comments         │         │
│  │──────────────│                 │──────────────────│         │
│  │ id (PK)      │                 │ id (PK)          │         │
│  │ title        │                 │ task_id (FK)     │         │
│  │ points       │                 │ user_id          │         │
│  │ status       │                 │ text             │         │
│  │ assigned_    │                 │ is_edited        │         │
│  │   user_id    │                 │ created_at       │         │
│  │ sort_order   │                 │ updated_at       │         │
│  │ created_by_  │                 └──────────────────┘         │
│  │   user_id    │                                               │
│  │ created_at   │                                               │
│  │ updated_at   │                                               │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ SHOPPING SCHEMA                                                 │
│                                                                 │
│  ┌──────────────┐       1:N       ┌──────────────────┐         │
│  │ shopping.    │────────────────▶│ shopping.        │         │
│  │ items        │                 │ comments         │         │
│  │──────────────│                 │──────────────────│         │
│  │ id (PK)      │                 │ id (PK)          │         │
│  │ name         │                 │ item_id (FK)     │         │
│  │ quantity     │                 │ user_id          │         │
│  │ added_by_    │                 │ text             │         │
│  │   user_id    │                 │ is_edited        │         │
│  │ is_bought    │                 │ created_at       │         │
│  │ bought_at    │                 │ updated_at       │         │
│  │ bought_by_   │                 └──────────────────┘         │
│  │   user_id    │                                               │
│  │ created_at   │                                               │
│  │ updated_at   │                                               │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ FINANCE SCHEMA                                                  │
│                                                                 │
│  ┌──────────────┐                                               │
│  │ finance.     │  (no comments — per spec FR-025)              │
│  │ expenses     │                                               │
│  │──────────────│                                               │
│  │ id (PK)      │                                               │
│  │ amount_cents │                                               │
│  │ description  │                                               │
│  │ logged_by_   │                                               │
│  │   user_id    │                                               │
│  │ created_at   │                                               │
│  │ updated_at   │                                               │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘

All user_id columns reference PredefinedUsers.All (1–5)
— validated at application layer, not via DB foreign key.
```

---

## Migration Strategy

1. **Single `OpenFlat.MigrationService`** project (a `BackgroundService`) runs all three DbContext migrations sequentially at startup:
   - `CleaningDbContext.Database.MigrateAsync()`
   - `ShoppingDbContext.Database.MigrateAsync()`
   - `FinanceDbContext.Database.MigrateAsync()`
2. Each DbContext has independent `__EFMigrationsHistory` table within its own schema.
3. API projects wait for migration service completion via `.WaitForCompletion(migrations)` in the Aspire AppHost.
4. Seed data is inserted after migrations complete (idempotent — checks if data exists first).
5. Migration service stops itself after seeding (`IHostApplicationLifetime.StopApplication()`).
