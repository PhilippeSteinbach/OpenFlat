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

> **Avatar Strategy**: Avatars are derived at the UI layer from the user's name (initials + deterministic color). No avatar field is stored — each platform renders a consistent avatar component using the user's `Id` as seed.

All `UserId` foreign keys in database tables reference these predefined IDs (1–5). No FK constraint to a users table — validated at the application layer.

---

## Cleaning Schema

### `cleaning.tasks`

> **REDESIGNED v3** (2026-03-09): Recurring tasks with rotation, effort presets, and completer-gets-points.
> Previous versions: v1 (Kanban 4-column) → v2 (simple checklist) → v3 (recurring + rotation).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Task unique identifier |
| `title` | `varchar(200)` | NOT NULL | Task title |
| `effort` | `integer` | NOT NULL, default `1` | Effort enum: 0=None, 1=Normal, 2=Big, 3=Huge, 4=Custom |
| `points` | `integer` | NOT NULL, CHECK >= 0 | Point value (auto-set by effort preset, or manual for Custom) |
| `frequency_value` | `integer` | NOT NULL, CHECK >= 1 | How often the task recurs (number) |
| `frequency_unit` | `varchar(10)` | NOT NULL | Recurrence unit: `'Days'` or `'Weeks'` |
| `due_date` | `date` | NOT NULL | When the current cycle is due |
| `rotation_order` | `integer[]` | NOT NULL, default `'{}'` | Ordered list of user IDs for round-robin |
| `rotation_index` | `integer` | NOT NULL, default `0` | Pointer into `rotation_order` for current assignee |
| `assigned_user_id` | `integer` | NULL | Currently assigned user (derived from rotation) |
| `last_completed_at` | `timestamptz` | NULL | When the task was last completed |
| `last_completed_by_user_id` | `integer` | NULL | Who last completed the task |
| `created_by_user_id` | `integer` | NOT NULL | User who created the task |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | Last modification timestamp |

**Removed columns** (from v2 checklist):
- ~~`is_done`~~ → tasks are never permanently "done"; completing advances to next cycle
- ~~`completed_at`~~ → replaced by `last_completed_at` + `completion_log` table

**New columns** (v3):
- `effort` — effort preset enum
- `frequency_value` + `frequency_unit` — recurrence schedule
- `rotation_order` + `rotation_index` — round-robin user rotation
- `last_completed_at` + `last_completed_by_user_id` — most recent completion

**Indexes**:
- `ix_tasks_due_date` on `(due_date)` — checklist rendering order (overdue → due soon)
- `ix_tasks_assigned_user_id` on `(assigned_user_id)` WHERE `assigned_user_id IS NOT NULL` — per-user views

**EF Core Entity**:

```csharp
public enum CleaningEffort
{
    None = 0,    // 0 points
    Normal = 1,  // 1 point
    Big = 2,     // 2 points
    Huge = 3,    // 4 points
    Custom = 4   // user-defined
}

public enum FrequencyUnit
{
    Days,
    Weeks
}

public class CleaningTask
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public CleaningEffort Effort { get; set; } = CleaningEffort.Normal;
    public int Points { get; set; }
    public int FrequencyValue { get; set; } = 7;
    public FrequencyUnit FrequencyUnit { get; set; } = FrequencyUnit.Days;
    public DateOnly DueDate { get; set; }
    public int[] RotationOrder { get; set; } = [];
    public int RotationIndex { get; set; }
    public int? AssignedUserId { get; set; }
    public DateTimeOffset? LastCompletedAt { get; set; }
    public int? LastCompletedByUserId { get; set; }
    public int CreatedByUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<CleaningComment> Comments { get; set; } = new List<CleaningComment>();
    public ICollection<CleaningCompletionLog> CompletionLogs { get; set; } = new List<CleaningCompletionLog>();
}
```

**Business Rules**:
- **Completion** (one-way, no undo): logs to `completion_log`, credits points to the *completer* (not assigned user), advances `rotation_index`, resets `due_date` to next cycle
- **Rotation advance**: `rotation_index = (rotation_index + 1) % rotation_order.length`, then `assigned_user_id = rotation_order[rotation_index]`
- **Complete for someone else**: completer earns points; picks who is next in rotation (sets `rotation_index` to that user's position)
- **Effort validation**: when `effort != Custom`, `points` must equal the preset value
- **Frequency**: next `due_date = old_due_date + (frequency_value × unit)`; advances from the due date, not from "today"
- **Empty rotation**: if `rotation_order` is empty, no auto-assignment; `assigned_user_id` stays null
- Display: days remaining = `DueDate - today` (green >3, yellow 1–3, orange 0, red <0)

### `cleaning.completion_log`

> **NEW** (2026-03-09): Tracks historical completions for leaderboard accuracy across rotations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Log entry identifier |
| `task_id` | `uuid` | FK → `cleaning.tasks(id)`, ON DELETE CASCADE | Which task was completed |
| `completed_by_user_id` | `integer` | NOT NULL | User who performed the completion |
| `assigned_user_id` | `integer` | NULL | User who was assigned at the time |
| `points_earned` | `integer` | NOT NULL | Points credited at time of completion |
| `completed_at` | `timestamptz` | NOT NULL, default `now()` | Completion timestamp |

**Indexes**:
- `ix_completion_log_completed_by` on `(completed_by_user_id)` — leaderboard aggregation
- `ix_completion_log_task_id` on `(task_id)` — task history lookups

**EF Core Entity**:

```csharp
public class CleaningCompletionLog
{
    public Guid Id { get; set; }
    public Guid TaskId { get; set; }
    public int CompletedByUserId { get; set; }
    public int? AssignedUserId { get; set; }
    public int PointsEarned { get; set; }
    public DateTimeOffset CompletedAt { get; set; }

    public CleaningTask Task { get; set; } = null!;
}
```

**Business Rules**:
- One entry per completion event (immutable — entries are never edited or deleted)
- Leaderboard query: `SELECT completed_by_user_id, SUM(points_earned) FROM completion_log GROUP BY completed_by_user_id`

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
    public DbSet<CleaningCompletionLog> CompletionLogs => Set<CleaningCompletionLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("cleaning");

        modelBuilder.Entity<CleaningTask>(e =>
        {
            e.ToTable("tasks");
            e.HasKey(t => t.Id);
            e.Property(t => t.Title).HasMaxLength(200).IsRequired();
            e.Property(t => t.Effort).HasDefaultValue(CleaningEffort.Normal);
            e.Property(t => t.Points).IsRequired();
            e.Property(t => t.FrequencyValue).IsRequired();
            e.Property(t => t.FrequencyUnit).HasConversion<string>().HasMaxLength(10).IsRequired();
            e.Property(t => t.DueDate).IsRequired();
            e.Property(t => t.RotationOrder).HasDefaultValueSql("'{}'");
            e.Property(t => t.RotationIndex).HasDefaultValue(0);
            e.Property(t => t.CreatedAt).HasDefaultValueSql("now()");
            e.Property(t => t.UpdatedAt).HasDefaultValueSql("now()");

            e.HasIndex(t => t.DueDate).HasDatabaseName("ix_tasks_due_date");
            e.HasIndex(t => t.AssignedUserId)
                .HasDatabaseName("ix_tasks_assigned_user_id")
                .HasFilter("assigned_user_id IS NOT NULL");
        });

        modelBuilder.Entity<CleaningCompletionLog>(e =>
        {
            e.ToTable("completion_log");
            e.HasKey(cl => cl.Id);
            e.Property(cl => cl.PointsEarned).IsRequired();
            e.Property(cl => cl.CompletedAt).HasDefaultValueSql("now()");

            e.HasOne(cl => cl.Task)
                .WithMany(t => t.CompletionLogs)
                .HasForeignKey(cl => cl.TaskId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasIndex(cl => cl.CompletedByUserId).HasDatabaseName("ix_completion_log_completed_by");
            e.HasIndex(cl => cl.TaskId).HasDatabaseName("ix_completion_log_task_id");
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

| Title | Effort | Pts | Freq | Due Date | Rotation | Assigned |
|-------|--------|-----|------|----------|----------|----------|
| Vacuum living room | Big | 2 | 7d | `2026-03-07` (overdue) | Alex→Sam→Jordan→Taylor→Casey | Alex |
| Clean kitchen counters | Normal | 1 | 3d | `2026-03-11` (2d left) | Sam→Taylor→Casey | Sam |
| Take out trash | None | 0 | 1d | `2026-03-10` (1d left) | Alex→Jordan→Sam→Taylor→Casey | Alex |
| Mop bathroom floor | Huge | 4 | 14d | `2026-03-15` (6d left) | Jordan→Alex | Jordan |
| Wash dishes | Normal | 1 | 1d | `2026-03-09` (today) | — (no rotation) | — |

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
│  │ effort       │                 │ user_id          │         │
│  │ points       │                 │ text             │         │
│  │ frequency_   │                 │ is_edited        │         │
│  │   value      │                 │ created_at       │         │
│  │ frequency_   │                 │ updated_at       │         │
│  │   unit       │                 └──────────────────┘         │
│  │ due_date     │                                               │
│  │ rotation_    │       1:N       ┌──────────────────┐         │
│  │   order[]    │────────────────▶│ cleaning.        │         │
│  │ rotation_    │                 │ completion_log   │         │
│  │   index      │                 │──────────────────│         │
│  │ assigned_    │                 │ id (PK)          │         │
│  │   user_id    │                 │ task_id (FK)     │         │
│  │ last_compl._ │                 │ completed_by_    │         │
│  │   at         │                 │   user_id        │         │
│  │ last_compl._ │                 │ assigned_user_id │         │
│  │   by_user_id │                 │ points_earned    │         │
│  │ created_by_  │                 │ completed_at     │         │
│  │   user_id    │                 └──────────────────┘         │
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
