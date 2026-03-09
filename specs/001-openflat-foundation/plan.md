# Implementation Plan: Recurring Cleaning Tasks with Rotation

**Branch**: `001-openflat-foundation` | **Date**: 2026-03-09 | **Spec**: [spec.md](spec.md)
**Input**: User request to evolve the Cleaning Checklist into a recurring-task system with user rotation, effort presets, and "complete for someone else" mechanics.

## Summary

Transform the current one-shot cleaning checklist into a **recurring household chore system**. Tasks have a **frequency** (every X days/weeks) and auto-generate new deadlines after completion. Users rotate through tasks in round-robin order. An **effort preset** (None 0, Normal 1, Big 2, Huge 4, Custom) replaces the free-form points input. Users can **complete tasks assigned to others** (earning the points themselves) and **choose who is next** in the rotation.

### Key Changes from Current State

| Aspect | Current (v2 Checklist) | New (v3 Recurring + Rotation) |
|--------|----------------------|-------------------------------|
| Deadlines | Manual `dueDate` per task, one-shot | Auto-calculated from `frequency` + `firstDueDate` |
| Points input | Free-form integer | Effort preset: None(0)/Normal(1)/Big(2)/Huge(4)/Custom |
| Assignment | Manual assign/unassign | Auto-rotate round-robin; manual override possible |
| Completion | Toggle done/undone, points → assigned user | Complete = advance rotation, points → completer |
| Task lifecycle | Create → mark done → stays done | Create → mark done → auto-reset with next deadline + next assignee |
| "Complete for someone else" | Not supported | Complete another user's task → choose next-in-rotation |

### Spec–Plan Gap Status

> **30 gaps identified** in [checklists/spec-plan-gap.md](checklists/spec-plan-gap.md), including **6 direct conflicts** between spec.md (v2 semantics) and this plan (v3 decisions). The spec must be updated before implementation. Key conflicts: toggle semantics (FR-009), point crediting to assigned user (FR-012), undo behavior (FR-013), optional due date (FR-014), and no-assignee warning (FR-015).

## Technical Context

**Language/Version**: .NET 10.0 (C#), React 19, TypeScript 5.x
**Primary Dependencies**: Aspire 13.1, EF Core 10, TanStack Query v5, SignalR, i18next, Tailwind CSS
**Storage**: PostgreSQL 17.6 (Podman, via Aspire AppHost)
**Testing**: xUnit v3 + FluentAssertions (backend), Vitest (frontend), Playwright (E2E)
**Target Platform**: Web (mobile-first), React Native (Expo) mobile
**Project Type**: Web service + SPA + mobile app
**Performance Goals**: API p95 < 200ms, SignalR propagation < 500ms
**Constraints**: 5 predefined users, EUR only, no auth
**Scale/Scope**: Household of 5, ~20-50 recurring tasks

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | ✅ PASS | No new dependencies; existing stack. Effort/FrequencyUnit enums replace magic numbers. |
| II. Test-Driven QA | ✅ PASS | Unit tests for rotation + completion logic; integration tests for new endpoints; contract tests for v3 DTOs; E2E for recurring flow |
| III. UX Consistency | ✅ PASS | i18n (en+de) for all new strings (effort labels, frequency labels, rotation UI). Mobile-first effort picker. |
| IV. Performance | ✅ PASS | Single index-backed queries; completion_log indexed by completed_by_user_id. No full table scans. |
| V. Modular Architecture | ✅ PASS | All changes scoped to cleaning module. New completion_log table within cleaning schema. |
| Technology Standards | ✅ PASS | No new dependencies added. PostgreSQL integer[] supported natively by Npgsql. |

### Post-Design Re-check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | ✅ PASS | CleaningEffort + FrequencyUnit enums eliminate magic numbers. OpenAPI v3.0.0 contract updated. |
| II. Test-Driven QA | ✅ PASS | Rotation advance logic, completion-log writes, and effort-to-points mapping are all unit-testable. |
| III. UX Consistency | ✅ PASS | Effort preset labels in en+de. Rotation badges consistent with existing deadline badges. |
| IV. Performance | ✅ PASS | Leaderboard query: `SUM(points_earned) GROUP BY completed_by_user_id` on indexed column. |
| V. Modular Architecture | ✅ PASS | No cross-module changes. CompletionLog is a new entity within cleaning schema. |
| Technology Standards | ✅ PASS | PostgreSQL `integer[]` for rotation_order — native Npgsql support, no extra package. |

## Project Structure

### Documentation (this feature)

```text
specs/001-openflat-foundation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (updated for v3)
├── quickstart.md        # Phase 1 output (updated for v3)
├── contracts/           # Phase 1 output (updated for v3)
│   └── cleaning-api.yaml
├── checklists/
│   ├── requirements.md  # Original v2 spec quality checklist
│   └── spec-plan-gap.md # v2→v3 gap analysis (30 items, 6 conflicts)
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (affected files)

```text
backend/OpenFlat.Cleaning.Api/
├── Data/
│   ├── CleaningTask.cs              # MODIFY: add Effort, FrequencyValue, FrequencyUnit, RotationOrder, RotationIndex, LastCompletedAt, LastCompletedByUserId; remove IsDone, CompletedAt
│   ├── CleaningCompletionLog.cs     # NEW: entity for completion_log table
│   ├── CleaningDbContext.cs          # MODIFY: add CompletionLog DbSet, new entity config + indexes
│   └── Migrations/                  # NEW: migration for v3 schema
├── Endpoints/
│   └── TaskEndpoints.cs             # MODIFY: CreateTaskRequest (effort, frequency, firstDueDate, rotationOrder), CompleteTaskRequest (nextUserId?), v3 DTOs
├── Services/
│   ├── CleaningTaskService.cs       # MODIFY: CompleteAsync → one-way with rotation advance + completion log; CreateAsync → effort/frequency/rotation; remove toggle
│   └── LeaderboardService.cs        # MODIFY: query completion_log SUM(points_earned) instead of done tasks SUM(points)
└── Hubs/
    └── CleaningHub.cs               # MODIFY: remove TaskUncompleted event; add TaskCompleted with rotation info

frontend/src/features/cleaning/
├── types.ts                         # MODIFY: add effort, frequency, rotation types; remove isDone, completedAt
├── api.ts                           # MODIFY: updated request/response shapes for v3
├── CleaningChecklist.tsx            # MODIFY: remove done/undone sections; add rotation indicators, recurring badges
├── ChecklistItem.tsx                # MODIFY: "complete for" flow with next-in-rotation picker
├── TaskDialogs.tsx                  # MODIFY: effort preset selector, frequency input, first due date, rotation order setup
├── TaskDetail.tsx                   # MODIFY: show completion history, rotation schedule
└── useCleaningHub.ts               # MODIFY: handle new SignalR events

frontend/tests/e2e/cleaning.spec.ts  # MODIFY: recurring + rotation E2E tests
shared/locales/{en,de}.json          # MODIFY: new i18n keys for effort labels, frequency, rotation

backend/tests/
├── OpenFlat.Cleaning.Tests/
│   ├── CleaningTaskServiceTests.cs      # MODIFY: test rotation advance, completion log, effort mapping
│   ├── LeaderboardServiceTests.cs       # MODIFY: test completion-log-based totals
│   └── Integration/CleaningEndpointTests.cs  # MODIFY: v3 endpoints
└── OpenFlat.Integration.Tests/
    └── CleaningContractTests.cs         # MODIFY: v3 DTO shapes
```

**Structure Decision**: Existing web application structure (backend/ + frontend/) retained. No new projects — changes scoped to the Cleaning module. One new entity class (`CleaningCompletionLog`) added within existing data layer.

## Complexity Tracking

> No constitution violations — no entries needed.

---

## Phase 0: Research Decisions

### D1: Recurring Task Model — Template with Auto-Reset

**Decision**: A `CleaningTask` acts as a **recurring template**. When completed, the system auto-advances `due_date` and `assigned_user_id` to the next cycle. No separate "task instance" table.

**Rationale**: With 5 users and 20-50 tasks, an instance-spawning model adds unnecessary complexity. The template pattern keeps the query model simple (one row per chore) and avoids unbounded table growth.

**Alternatives considered**:
- *Instance-per-occurrence*: Better audit trail but excessive for household scale. Rejected for complexity.
- *Cron expression*: Too flexible — "every X days/weeks" covers all household needs.

### D2: Frequency Model

**Decision**: Store as `frequency_value` (integer ≥ 1) + `frequency_unit` (enum: `Days`, `Weeks`).

- "Every 3 days" → `frequency_value=3, frequency_unit=Days`
- "Every 2 weeks" → `frequency_value=2, frequency_unit=Weeks`

Next due date = `current_due_date + (frequency_value × unit_in_days)`.

### D3: Effort Presets

**Decision**: Map effort to points via enum with custom override.

| Effort | Enum Value | Points | Label (en) | Label (de) |
|--------|-----------|--------|------------|------------|
| None | 0 | 0 | None | Kein |
| Normal | 1 | 1 | Normal | Normal |
| Big | 2 | 2 | Big | Groß |
| Huge | 3 | 4 | Huge | Riesig |
| Custom | 4 | user-defined | Custom | Individuell |

Store as `effort` (int enum 0-4) + `points` (int). When effort is not Custom, points is auto-set from the preset and the UI disables manual entry.

### D4: Rotation Order

**Decision**: Store rotation as an **ordered array of user IDs** on each task (`rotation_order int[]`). A `rotation_index` (int) pointer tracks who is currently assigned.

On completion:
1. `rotation_index = (rotation_index + 1) % rotation_order.length`
2. `assigned_user_id = rotation_order[rotation_index]`
3. `due_date` advances by frequency

When a user completes *for someone else*:
- The completer earns the points
- The user picks who is next → the system sets `rotation_index` to that user's position in `rotation_order`

**Empty rotation_order**: If no rotation is set (empty array), the task behaves like a non-rotating chore — `assigned_user_id` stays null and no auto-advance occurs.

### D5: Points go to Completer

**Decision**: The user who checks off the task (`X-User-Id` header) gets the points, NOT the assigned user.

- `CompleteAsync` uses `completedByUserId` from the request context
- Points are credited to the completer
- `LastCompletedByUserId` is stored for display

**Rationale**: This matches the user's requirement "Users can check off tasks for other people and then get the points themselves."

### D6: Completion Log

**Decision**: Add a `cleaning.completion_log` table for historical tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | PK |
| `task_id` | `uuid` | FK to tasks |
| `completed_by_user_id` | `int` | Who did it |
| `assigned_user_id` | `int?` | Who it was assigned to |
| `points_earned` | `int` | Points at time of completion |
| `completed_at` | `timestamptz` | When |

The leaderboard query changes from summing `points` of done tasks to summing `points_earned` from the completion log, giving accurate totals across rotations.

### D7: "Undone" Changes

**Decision**: **Remove the undo/toggle behavior**. Completing a recurring task advances the rotation and resets the task — there is no "uncheck" since the task immediately becomes the next occurrence. This is a deliberate simplification: household chores move forward, not backward.

If a task was completed by mistake, the coordinator can manually reassign and adjust the due date via edit.

### D8: Task Deletion & Completion History

**Decision**: Deleting a recurring task **cascades** to its `completion_log` entries (`ON DELETE CASCADE`). This means historical points are removed from the leaderboard.

**Rationale**: In a household of 5 with 20–50 tasks, preserving orphaned completion records adds query complexity (null-safe joins) for minimal audit value. The prototype prioritizes simplicity. If audit preservation is needed later, change to `ON DELETE SET NULL` and update the leaderboard query to handle `task_id IS NULL`.

**Impact**: Deleting a task reduces leaderboard totals. Users should be warned before deletion (a confirmation dialog is sufficient).
