# Tasks: Cleaning Board Redesign (Kanban → Checklist)

**Input**: Design documents from `/specs/001-openflat-foundation/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/cleaning-api.yaml ✅

**Tests**: Existing test suites will be updated to match the new checklist model (unit, integration, contract, E2E).

**Organization**: Tasks organized by implementation phase. This is a redesign of User Story 2 (Cleaning Checklist) — other user stories are already implemented and unaffected.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[US2]**: Cleaning Checklist (the redesigned user story)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Prepare the codebase for the Kanban → Checklist migration

- [x] T001 Remove `@dnd-kit/react` and `@dnd-kit/dom` dependencies from frontend/package.json and run `npm install`
- [x] T002 [P] Delete Kanban-specific frontend files: frontend/src/features/cleaning/KanbanBoard.tsx and frontend/src/features/cleaning/TaskCard.tsx

---

## Phase 2: Foundational (Backend Model & Migration)

**Purpose**: Update the data model, EF entity, DbContext, and generate the database migration. MUST be complete before any service/endpoint/frontend work.

**⚠️ CRITICAL**: No US2 implementation work can begin until this phase is complete.

- [x] T003 [US2] Update `CleaningTask` entity in backend/OpenFlat.Cleaning.Api/Data/CleaningTask.cs: remove `Status` enum and `SortOrder` property, add `bool IsDone` (default false), `DateOnly? DueDate`, `DateTimeOffset? CompletedAt`
- [x] T004 [US2] Update entity configuration in backend/OpenFlat.Cleaning.Api/Data/CleaningDbContext.cs: remove Status conversion and sort indexes (`ix_tasks_status`, `ix_tasks_status_sort`), add `IsDone` default value, configure `DueDate` as nullable date, add composite index `ix_tasks_is_done_due_date` on `(IsDone, DueDate)`
- [x] T005 [US2] Generate EF Core migration: run `dotnet ef migrations add KanbanToChecklist --project backend/OpenFlat.Cleaning.Api` and verify the migration drops `status`/`sort_order` columns and adds `is_done`/`due_date`/`completed_at` columns
- [x] T006 [US2] Update seed data in OpenFlat.MigrationService/MigrationWorker.cs: replace `Status`/`SortOrder` fields with `IsDone`/`DueDate`/`CompletedAt` on sample cleaning tasks (e.g., "Wash dishes" → `IsDone = true, CompletedAt = now`, others → `IsDone = false, DueDate = <various>`)

**Checkpoint**: Database schema updated. Run `dotnet build` on the solution and verify the migration service applies cleanly against a fresh database.

---

## Phase 3: User Story 2 — Cleaning Checklist Backend (Priority: P2)

**Goal**: Replace the Kanban move-between-columns API with a checklist toggle-done API. Tasks are listed sorted by urgency (overdue → due soon → no deadline → completed).

**Independent Test**: `curl -H "X-User-Id: 1" https://localhost:5101/api/tasks` returns tasks with `isDone`, `dueDate`, `completedAt` fields. `POST /api/tasks/{id}/complete` toggles done state and returns points delta.

### Backend Service Layer

- [x] T007 [US2] Refactor `CleaningTaskService` in backend/OpenFlat.Cleaning.Api/Services/CleaningTaskService.cs: remove `MoveAsync` method, add `CompleteAsync(Guid taskId)` that toggles `IsDone`, sets/clears `CompletedAt`, and returns `(task, pointsDelta, warningNoAssignee)`
- [x] T008 [US2] Update `GetAllAsync` in backend/OpenFlat.Cleaning.Api/Services/CleaningTaskService.cs: replace status-based ordering with urgency sort — `OrderBy(IsDone).ThenBy(DueDate == null).ThenBy(DueDate).ThenByDescending(CreatedAt)`
- [x] T009 [US2] Update `CreateAsync` in backend/OpenFlat.Cleaning.Api/Services/CleaningTaskService.cs: accept optional `DueDate` and `AssignedUserId` parameters, remove `Status = Todo` and `SortOrder` initialization
- [x] T010 [US2] Update `UpdateAsync` in backend/OpenFlat.Cleaning.Api/Services/CleaningTaskService.cs: accept `DueDate` parameter, handle point recalculation when `IsDone` and points change (FR-014a)
- [x] T011 [P] [US2] Update `LeaderboardService` in backend/OpenFlat.Cleaning.Api/Services/LeaderboardService.cs: change leaderboard query to filter by `IsDone == true` instead of `Status == Done`

### Backend Endpoints & DTOs

- [x] T012 [US2] Update DTOs in backend/OpenFlat.Cleaning.Api/Endpoints/TaskEndpoints.cs: replace `TaskResponse` fields (`status`, `sortOrder`) with `isDone`, `dueDate`, `completedAt`, `assignedUserName`; update `CreateTaskRequest`/`UpdateTaskRequest` to include optional `dueDate`; add `CompleteTaskResponse` record with `task`, `pointsDelta`, `warningNoAssignee`
- [x] T013 [US2] Update endpoint mappings in backend/OpenFlat.Cleaning.Api/Endpoints/TaskEndpoints.cs: remove `POST /api/tasks/{taskId}/move` endpoint, add `POST /api/tasks/{taskId}/complete` endpoint that calls `CompleteAsync` and broadcasts via SignalR
- [x] T014 [US2] Update SignalR broadcast calls in backend/OpenFlat.Cleaning.Api/Endpoints/TaskEndpoints.cs: replace `TaskMoved` event with `TaskCompleted`/`TaskUncompleted` events using `CompleteTaskResponse` payload; keep `TaskCreated`, `TaskUpdated`, `TaskDeleted`, `TaskAssigned`, `LeaderboardUpdated`

**Checkpoint**: Backend API compiles and serves the new contract. Verify with curl: `GET /api/tasks` returns `isDone`/`dueDate`/`completedAt` fields; `POST /complete` toggles state.

---

## Phase 4: User Story 2 — Cleaning Checklist Frontend (Priority: P2)

**Goal**: Replace the Kanban board UI with a checklist view showing responsible person names and deadline badges. Active tasks sorted by urgency, completed tasks below.

**Independent Test**: Navigate to `/cleaning`, verify tasks display as a checklist with checkboxes, assignee names, deadline badges ("3d left" / "2d overdue"), and checkbox toggle works.

### Types & API Layer

- [x] T015 [P] [US2] Update types in frontend/src/features/cleaning/types.ts: remove `TaskStatus` enum, `TASK_STATUSES`, `STATUS_LABELS`; update `CleaningTask` interface with `isDone: boolean`, `dueDate: string | null`, `completedAt: string | null`, `assignedUserName: string | null`; remove `status` and `sortOrder` fields
- [x] T016 [P] [US2] Update API functions in frontend/src/features/cleaning/api.ts: remove `moveTask` mutation, add `completeTask(taskId: string)` mutation that POSTs to `/api/tasks/{taskId}/complete`; update `createTask`/`updateTask` to include optional `dueDate` field; ensure response mapping matches new `TaskDto` shape

### New Components

- [x] T017 [US2] Create frontend/src/features/cleaning/CleaningChecklist.tsx: main checklist view that fetches tasks via `useQuery`, splits into active (undone, sorted by urgency) and completed sections, renders `ChecklistItem` for each task, includes "Add Task" button opening create dialog
- [x] T018 [US2] Create frontend/src/features/cleaning/ChecklistItem.tsx: single checklist row with checkbox (toggle done), task title, point badge, assigned person's name, deadline badge (compute days from `dueDate` — "Xd left" green/yellow or "Xd overdue" red), highlight if assigned to current user (FR-011), tap to open detail view

### Updated Components

- [x] T019 [US2] Update frontend/src/features/cleaning/TaskDetail.tsx: remove status display and move-between-columns controls; show `isDone` checkbox, due date display, `completedAt` timestamp, assigned person name; keep comment thread and assign/edit/delete actions
- [x] T020 [US2] Update frontend/src/features/cleaning/TaskDialogs.tsx: add date picker for `dueDate` in create and edit dialogs; add optional `assignedUserId` selector in create dialog; remove any status-related form fields
- [x] T021 [US2] Update frontend/src/features/cleaning/useCleaningHub.ts: replace `TaskMoved` event handler with `TaskCompleted` and `TaskUncompleted` handlers that invalidate tasks query and update leaderboard; ensure `CompleteTaskResponse` payload is correctly typed

### Route Integration

- [x] T022 [US2] Update cleaning route entry point to render `CleaningChecklist` instead of `KanbanBoard` — update the import in the route file under frontend/src/app/ that references the cleaning feature

**Checkpoint**: Full checklist UI functional. Navigate to Cleaning, see tasks as checklist items with checkboxes, assignee names, deadline badges. Toggle done state, verify points update on leaderboard.

---

## Phase 5: Test Updates

**Purpose**: Update all existing test suites to match the new checklist model and API shape

### Backend Unit Tests

- [x] T023 [P] [US2] Update backend/tests/OpenFlat.Cleaning.Tests/CleaningTaskServiceTests.cs: replace `MoveAsync` tests with `CompleteAsync` tests — verify toggle done/undone, point crediting/deducting, `warningNoAssignee` when no assignee, `CompletedAt` set/cleared
- [x] T024 [P] [US2] Update backend/tests/OpenFlat.Cleaning.Tests/LeaderboardServiceTests.cs: update test data to use `IsDone = true` instead of `Status = Done` for completed tasks in leaderboard calculations

### Backend Integration Tests

- [x] T025 [P] [US2] Update backend/tests/OpenFlat.Cleaning.Tests/Integration/CleaningEndpointTests.cs: replace `/move` endpoint tests with `/complete` endpoint tests; update response assertions for new `TaskDto` shape (`isDone`, `dueDate`, `completedAt` instead of `status`, `sortOrder`); verify urgency sort order in `GET /api/tasks`
- [x] T026 [P] [US2] Update backend/tests/OpenFlat.Integration.Tests/CleaningContractTests.cs: update contract test assertions to match new API schema (v2.0.0) — verify `TaskDto` contains `isDone`/`dueDate`/`completedAt`, `CompleteTaskResponse` shape, absence of `/move` endpoint

### Frontend E2E Tests

- [x] T027 [US2] Update frontend/tests/e2e/cleaning.spec.ts: replace Kanban board tests (column rendering, drag-and-drop between columns) with checklist tests — verify checklist rendering, checkbox toggle, deadline badges ("Xd left" / "Xd overdue"), assignee name display, point crediting on completion

**Checkpoint**: All tests pass. Run `dotnet test` for backend and `npx playwright test` for E2E.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, documentation, and final validation

- [x] T028 [P] Remove any remaining Kanban-related imports, CSS classes, or i18n keys across frontend/src/ (search for "kanban", "KanbanBoard", "TaskCard", "drag", "dnd", "column" references)
- [x] T029 [P] Update the dashboard module tile label from "Cleaning Board" to "Cleaning" in the dashboard component under frontend/src/features/dashboard/ or frontend/src/app/
- [x] T029a [P] Add i18n resource keys (English + German) for all new Cleaning Checklist strings: deadline badges ("Xd left" / "Xd overdue"), no-assignee warning, empty state message, component labels in CleaningChecklist.tsx and ChecklistItem.tsx. Update both `en.json` and `de.json` resource files.
- [x] T029b [P] Update data-model.md documentation: fix seed data table, ERD, and remaining references to match the checklist redesign
- [x] T030 Verify the full workflow end-to-end: start Aspire AppHost, navigate to the app, select a user, open Cleaning, create a task with due date, assign a user, mark done, verify points on leaderboard, verify SignalR real-time update in a second browser tab
- [x] T031 Run quickstart.md validation: follow all steps from scratch on a clean database and verify the cleaning checklist works as documented

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all implementation work
- **Backend (Phase 3)**: Depends on Phase 2 completion
- **Frontend (Phase 4)**: Depends on Phase 3 completion (needs working API)
- **Tests (Phase 5)**: Backend tests (T023–T026) can start after Phase 3; E2E test (T027) needs Phase 4
- **Polish (Phase 6)**: Depends on Phase 4 completion

### Within Each Phase

```
Phase 1:  T001 ──┐
          T002 ──┤ (parallel — different concerns)
                 ▼
Phase 2:  T003 → T004 → T005 → T006  (sequential — model → config → migration → seed)
                 ▼
Phase 3:  T007 → T008 → T009 → T010  (sequential — service methods)
          T011 ─────────────────────  (parallel — different service file)
                 ▼
          T012 → T013 → T014         (sequential — DTOs → endpoints → SignalR)
                 ▼
Phase 4:  T015 ──┐
          T016 ──┤ (parallel — types & api layer)
                 ▼
          T017 → T018                (sequential — parent component → child)
                 ▼
          T019 ──┐
          T020 ──┤
          T021 ──┤ (parallel — independent component updates)
                 ▼
          T022                       (route integration — last)
                 ▼
Phase 5:  T023 ──┐
          T024 ──┤
          T025 ──┤ (parallel — independent test files)
          T026 ──┤
                 ▼
          T027                       (E2E — needs full stack running)
                 ▼
Phase 6:  T028 ──┐
          T029 ──┤ (parallel — independent cleanup)
                 ▼
          T030 → T031               (sequential — validate then quickstart)
```

### Parallel Opportunities

Within each phase, tasks marked `[P]` can run in parallel:
- **Phase 1**: T001 ∥ T002
- **Phase 2**: None (sequential dependency chain)
- **Phase 3**: T011 ∥ T007–T010 (different files)
- **Phase 4**: T015 ∥ T016, then T019 ∥ T020 ∥ T021
- **Phase 5**: T023 ∥ T024 ∥ T025 ∥ T026
- **Phase 6**: T028 ∥ T029

---

## Implementation Strategy

### MVP First (Working Checklist)

1. Complete Phase 1: Setup (remove dead dependencies)
2. Complete Phase 2: Foundational (model + migration)
3. Complete Phase 3: Backend API (new endpoints working)
4. Complete Phase 4: Frontend UI (checklist renders)
5. **STOP and VALIDATE**: Full checklist workflow works end-to-end
6. Complete Phase 5: Tests pass
7. Complete Phase 6: Polish and cleanup

### Incremental Delivery

1. Phase 1–2 → Database ready with new schema
2. Phase 3 → API ready, testable with curl
3. Phase 4 → UI ready, full user-facing feature complete
4. Phase 5 → Quality confirmed, all tests green
5. Phase 6 → Production-ready, documented and validated

---

## Notes

- This is a **redesign** of existing code, not greenfield — all files listed already exist (except CleaningChecklist.tsx and ChecklistItem.tsx which are new)
- The `@dnd-kit/react` removal (T001) may trigger linter errors in other files that import it — T002 (delete files) resolves this
- EF migration (T005) must be generated AFTER T003+T004 are complete — the migration is derived from the entity/DbContext changes
- SignalR hub class (CleaningHub.cs) needs no changes — it's a marker hub; events are broadcast from endpoints
- The `CleaningComment` entity and comment endpoints are unchanged — they still reference `CleaningTask` via FK
- All `user_id` references continue to use compile-time `PredefinedUsers.All` (1–5), no DB foreign key
