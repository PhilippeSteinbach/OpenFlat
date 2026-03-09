# Tasks: Recurring Cleaning Tasks with Rotation

**Input**: Design documents from `/specs/001-openflat-foundation/`
**Prerequisites**: plan.md, spec.md (US2), data-model.md (v3 schema), contracts/cleaning-api.yaml (v3.0.0), research.md

**Tests**: Included — constitution Principle II (Test-Driven QA) is NON-NEGOTIABLE. Plan constitution check confirms unit, integration, contract, and E2E tests.

**Organization**: This plan evolves the existing v2 Cleaning Checklist (already implemented, commit `c8da8d0`) to v3 Recurring Tasks with Rotation. All tasks target **User Story 2** (Cleaning Checklist). User Stories 1, 3, 4, 5 are already implemented and unaffected.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[US2]**: All story-phase tasks belong to User Story 2 (Cleaning Checklist v3)
- File paths are relative to repository root

---

## Phase 1: Setup

**Purpose**: Create new files needed before schema changes

- [X] T001 Create CleaningCompletionLog entity in backend/OpenFlat.Cleaning.Api/Data/CleaningCompletionLog.cs per data-model.md (Id, TaskId, CompletedByUserId, AssignedUserId, PointsEarned, CompletedAt, nav to CleaningTask)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema migration and entity redesign — MUST complete before any US2 service/endpoint/frontend work

**⚠️ CRITICAL**: No US2 implementation can begin until this phase is complete

- [X] T002 Update CleaningTask entity in backend/OpenFlat.Cleaning.Api/Data/CleaningTask.cs — add CleaningEffort enum (None=0,Normal=1,Big=2,Huge=3,Custom=4), FrequencyUnit enum (Days,Weeks), new properties (Effort, Points, FrequencyValue, FrequencyUnit, DueDate as DateOnly NOT NULL, RotationOrder int[], RotationIndex, LastCompletedAt, LastCompletedByUserId, CompletionLogs nav); remove IsDone, CompletedAt
- [X] T003 Update CleaningDbContext in backend/OpenFlat.Cleaning.Api/Data/CleaningDbContext.cs — add DbSet<CleaningCompletionLog> CompletionLogs, configure CompletionLog entity (table "completion_log", FK to tasks with cascade, indexes ix_completion_log_completed_by + ix_completion_log_task_id), update CleaningTask config (remove IsDone/CompletedAt columns, add effort default 1, frequency_value CHECK >=1, due_date NOT NULL, rotation_order integer[] default '{}', new indexes ix_tasks_due_date + filtered ix_tasks_assigned_user_id)
- [X] T004 Create EF Core migration in backend/OpenFlat.Cleaning.Api/Data/Migrations/ — `dotnet ef migrations add RecurringTasksWithRotation --context CleaningDbContext` for v3 schema (adds effort, frequency_value, frequency_unit, rotation_order, rotation_index, last_completed_at, last_completed_by_user_id, completion_log table; removes is_done, completed_at; updates indexes). Constitution V: verify migration includes reversible Down() method restoring IsDone/CompletedAt columns.
- [X] T005 Update seed data in OpenFlat.MigrationService for v3 cleaning tasks — replace v2 seeds (IsDone, CompletedAt, free-form Points) with v3 seeds per data-model.md seed table (Vacuum: Big/2pts/7d/overdue, Kitchen: Normal/1pt/3d, Trash: None/0pts/1d, Mop: Huge/4pts/14d, Dishes: Normal/1pt/1d/no rotation)

**Checkpoint**: Database schema is v3, migrations run cleanly, seed data loads

---

## Phase 3: User Story 2 — Recurring Cleaning Tasks (Priority: P2) 🎯

**Goal**: Transform the one-shot cleaning checklist into a recurring task system with effort presets, round-robin rotation, one-way completion, and completer-gets-points

**Independent Test**: Create a recurring task with effort=Big and frequency=7d, rotation=[Alex,Sam,Jordan]. Complete the task as Sam (not assigned). Verify: points go to Sam (completer), rotation advances to next user, due date advances by 7 days, completion log records the event, leaderboard updates.

### Backend Services

- [X] T006 [US2] Rewrite CleaningTaskService.CreateAsync in backend/OpenFlat.Cleaning.Api/Services/CleaningTaskService.cs — accept effort, frequencyValue, frequencyUnit, firstDueDate, rotationOrder; validate effort-to-points mapping (when effort != Custom, auto-set points from preset); initialize rotationIndex=0, set assignedUserId from rotationOrder[0] if non-empty
- [X] T007 [US2] Rewrite CleaningTaskService.CompleteAsync in backend/OpenFlat.Cleaning.Api/Services/CleaningTaskService.cs — one-way completion (no toggle): write CleaningCompletionLog (completedByUserId, assignedUserId, pointsEarned, completedAt), credit points to completer (D5), advance rotation (rotation_index = (rotation_index+1) % length, assigned_user_id = rotation_order[new_index]), advance due_date by frequency (from old due_date, not today, D2); support optional nextUserId param to override rotation advance (D4); handle empty rotation (no advance, assigned stays null)
- [X] T008 [US2] Update CleaningTaskService.UpdateAsync in backend/OpenFlat.Cleaning.Api/Services/CleaningTaskService.cs — accept effort, frequencyValue, frequencyUnit, dueDate, rotationOrder; re-validate effort-to-points; if rotationOrder changes, reset rotationIndex to 0 and update assignedUserId
- [X] T009 [US2] Update LeaderboardService.GetLeaderboardAsync in backend/OpenFlat.Cleaning.Api/Services/LeaderboardService.cs — change query from SUM(tasks.Points) WHERE IsDone to SUM(completion_log.PointsEarned) GROUP BY completed_by_user_id; return all 5 predefined users sorted by totalPoints desc

### Backend Endpoints

- [X] T010 [US2] Update TaskEndpoints.cs DTOs in backend/OpenFlat.Cleaning.Api/Endpoints/TaskEndpoints.cs — replace TaskDto (add effort, points, frequencyValue, frequencyUnit, dueDate, rotationOrder, rotationIndex, assignedUserId, assignedUserName, lastCompletedAt, lastCompletedByUserName, commentCount; remove isDone, completedAt), add CreateTaskRequest (title, effort, points?, frequencyValue, frequencyUnit, firstDueDate, rotationOrder?), UpdateTaskRequest (title, effort, points?, frequencyValue, frequencyUnit, dueDate?, rotationOrder?), CompleteTaskRequest (nextUserId?), CompleteTaskResponse (task, pointsEarned, completedByUserName, nextAssignedUserName) per cleaning-api.yaml v3.0.0
- [X] T011 [US2] Update TaskEndpoints.cs route handlers in backend/OpenFlat.Cleaning.Api/Endpoints/TaskEndpoints.cs — POST /api/tasks: map CreateTaskRequest to service.CreateAsync with v3 params; POST /api/tasks/{id}/complete: accept optional CompleteTaskRequest body, pass nextUserId to service.CompleteAsync, return CompleteTaskResponse; PUT /api/tasks/{id}: map UpdateTaskRequest to service.UpdateAsync with v3 params; remove toggle logic from /complete
- [X] T012 [US2] Update CleaningHub in backend/OpenFlat.Cleaning.Api/Hubs/CleaningHub.cs — remove TaskUncompleted client method, ensure TaskCompleted sends CompleteTaskResponse (includes rotated task + points info), keep LeaderboardUpdated
- [X] T012a [US2] Implement /api/tasks/{taskId}/assign endpoint in backend/OpenFlat.Cleaning.Api/Endpoints/TaskEndpoints.cs — accept AssignTaskRequest (assignedUserId nullable int 1–5), manually set assigned_user_id on task overriding rotation-derived value, broadcast TaskAssigned via SignalR per cleaning-api.yaml contract

### Frontend Types & API

- [X] T013 [P] [US2] Update types.ts in frontend/src/features/cleaning/types.ts — add CleaningEffort enum (None/Normal/Big/Huge/Custom), FrequencyUnit enum (Days/Weeks), update TaskDto interface (effort, points, frequencyValue, frequencyUnit, dueDate string, rotationOrder number[], rotationIndex, assignedUserId, assignedUserName, lastCompletedAt, lastCompletedByUserName; remove isDone, completedAt), add CreateTaskRequest, UpdateTaskRequest, CompleteTaskRequest, CompleteTaskResponse types per cleaning-api.yaml v3
- [X] T014 [US2] Update api.ts in frontend/src/features/cleaning/api.ts — update createTask() to send v3 CreateTaskRequest (effort, frequencyValue, frequencyUnit, firstDueDate, rotationOrder), update completeTask() to accept optional nextUserId and send CompleteTaskRequest body, update updateTask() for v3 UpdateTaskRequest, update response type mappings

### Frontend Components

- [X] T015 [US2] Rewrite TaskDialogs.tsx in frontend/src/features/cleaning/TaskDialogs.tsx — TaskFormDialog: replace free-form points input with effort preset selector (radio/button group showing None 0pts / Normal 1pt / Big 2pts / Huge 4pts / Custom), show manual points input only when Custom selected, add frequency input (number + Days/Weeks dropdown), add firstDueDate date picker (required), add rotation order multi-select (reorderable list of 5 predefined users); EditTaskDialog: same fields with current values pre-filled
- [X] T016 [US2] Update CleaningChecklist.tsx in frontend/src/features/cleaning/CleaningChecklist.tsx — remove done/undone split (tasks are never permanently done), single list sorted by urgency (overdue → due soon → no due date), add frequency badge ("every Xd" or "every Xw"), add rotation indicator showing currently assigned user avatar, show "last completed by" info where relevant, highlight items assigned to the current user with a visually distinct border/color (FR-011)
- [X] T017 [US2] Update ChecklistItem.tsx in frontend/src/features/cleaning/ChecklistItem.tsx — replace toggle checkbox with one-way complete button, on complete: if current user != assigned user, show next-in-rotation user picker (click user avatar to choose who is next), call completeTask API with optional nextUserId; show effort badge, frequency info, rotation position
- [X] T018 [US2] Update TaskDetail.tsx in frontend/src/features/cleaning/TaskDetail.tsx — add completion history section (list of completion_log entries showing who completed, when, points earned), show rotation schedule (ordered user list with current position highlighted), show frequency and next due date
- [X] T019 [US2] Update useCleaningHub.ts in frontend/src/features/cleaning/useCleaningHub.ts — handle TaskCompleted event (update task in cache with rotated state, update leaderboard), remove TaskUncompleted handler, ensure LeaderboardUpdated updates dashboard cache

### Backend Tests

- [X] T020 [P] [US2] Update CleaningTaskServiceTests in backend/tests/OpenFlat.Cleaning.Tests/CleaningTaskServiceTests.cs — test effort-to-points auto-mapping (Normal→1, Big→2, Huge→4, Custom→user-value), test one-way completion (no toggle back), test completion_log entry creation on complete, test rotation advance (index increments mod length), test complete-for-other with nextUserId overrides rotation, test empty rotation (no advance, assigned stays null), test due date advance from due_date not from today, test single-person rotation (same user reassigned)
- [X] T021 [P] [US2] Update LeaderboardServiceTests in backend/tests/OpenFlat.Cleaning.Tests/LeaderboardServiceTests.cs — test totals from completion_log SUM(points_earned) grouped by completed_by_user_id, test all 5 users returned even with 0 points, test multiple completions by same user accumulate correctly
- [X] T022 [P] [US2] Update CleaningEndpointTests in backend/tests/OpenFlat.Cleaning.Tests/Integration/CleaningEndpointTests.cs — integration test POST /api/tasks with v3 CreateTaskRequest returns v3 TaskDto, test POST /api/tasks/{id}/complete returns CompleteTaskResponse with advanced rotation, test PUT /api/tasks/{id} with v3 UpdateTaskRequest, test /api/leaderboard returns completion-log-based totals
- [X] T023 [P] [US2] Update CleaningContractTests in backend/tests/OpenFlat.Integration.Tests/CleaningContractTests.cs — validate v3 TaskDto shape (effort, frequencyValue, frequencyUnit, rotationOrder, rotationIndex; no isDone/completedAt), validate TaskDetailDto (extends TaskDto with comments array), validate CreateTaskRequest required fields, validate UpdateTaskRequest fields, validate CompleteTaskResponse shape (pointsEarned, completedByUserName, nextAssignedUserName), validate AssignTaskRequest shape

**Checkpoint**: Recurring task creation, one-way completion with rotation advance, effort presets, completer-gets-points, and completion-log-based leaderboard all working end-to-end. All backend tests pass, frontend renders v3 task list.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: i18n, dashboard integration, E2E tests, documentation validation

- [X] T024 [P] Update shared/locales/en.json — add i18n keys for effort labels (None/Normal/Big/Huge/Custom), frequency labels (every/days/weeks), rotation labels (nextUp/rotationOrder/assigned), completion messages (completedBy/pointsEarned/noUndo)
- [X] T025 [P] Update shared/locales/de.json — German translations: effort (Kein/Normal/Groß/Riesig/Individuell), frequency (alle/Tage/Wochen), rotation (als Nächstes/Reihenfolge/zugewiesen), completion (erledigt von/Punkte erhalten/kein Rückgängig)
- [X] T026 Update dashboard leaderboard widget to use completion-log-based /api/leaderboard endpoint — verify points displayed on dashboard (FR-006a, FR-006b) reflect v3 completion_log totals, not legacy isDone sums
- [X] T027 Update E2E tests in frontend/tests/e2e/cleaning.spec.ts — test create recurring task with effort preset and frequency, test one-way completion advances rotation and due date, test complete-for-other with next-picker, test leaderboard updates after completion
- [X] T028 Run quickstart.md validation — verify all documented endpoints match v3 implementation, confirm seed data loads correctly, validate Aspire dashboard shows healthy services

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001) — **BLOCKS all US2 work**
- **US2 (Phase 3)**: All tasks depend on Foundational (Phase 2) completion
  - Backend services (T006-T009) before endpoints (T010-T012)
  - Endpoints (T010-T012) before frontend API (T014)
  - Frontend types (T013) can run in parallel with backend work
  - Frontend components (T015-T019) depend on types (T013) and API (T014)
  - Backend tests (T020-T023) can run in parallel with frontend work
- **Polish (Phase 4)**: Depends on US2 core implementation (Phase 3 services + endpoints + components)

### Within Phase 3 (US2)

```
T006 (CreateAsync) ──┐
T007 (CompleteAsync) ─┤─→ T010 (DTOs) → T011 (handlers) → T014 (api.ts) → T015-T019 (components)
T008 (UpdateAsync) ───┤
T009 (Leaderboard) ───┘
                       ├─→ T012 (Hub) → T019 (useCleaningHub)
T013 (types.ts) ───────┤─→ T014 (api.ts) → T015-T019 (components)
                       └─→ T020-T023 (tests) [parallel with frontend]
```

### Parallel Opportunities

- **Phase 2**: T002 + T003 must be sequential (T003 depends on T002 entity); T004 depends on both; T005 independent of T004
- **Phase 3**: T013 (types.ts) in parallel with T006-T009 (backend services); T020-T023 (all tests) in parallel with each other and with frontend work
- **Phase 4**: T024 + T025 (i18n en/de) in parallel

---

## Parallel Example: Phase 3 Backend + Frontend

```
# After Phase 2 completes, launch in parallel:

# Stream A — Backend services (sequential):
T006: Rewrite CreateAsync in CleaningTaskService.cs
T007: Rewrite CompleteAsync in CleaningTaskService.cs
T008: Update UpdateAsync in CleaningTaskService.cs
T009: Update LeaderboardService.cs

# Stream B — Frontend types (parallel with Stream A):
T013: Update types.ts with v3 types

# Stream C — Backend tests (parallel with Streams A and B):
T020: CleaningTaskServiceTests.cs
T021: LeaderboardServiceTests.cs
T022: CleaningEndpointTests.cs
T023: CleaningContractTests.cs

# After Stream A completes:
T010: Update DTOs in TaskEndpoints.cs
T011: Update route handlers in TaskEndpoints.cs
T012: Update CleaningHub.cs

# After T013 (types) + T011 (handlers) complete:
T014: Update api.ts
T015-T019: Frontend components (sequential)
```

---

## Implementation Strategy

### MVP First (Phase 1 + 2 + 3 Core)

1. Complete Phase 1: Setup (1 task)
2. Complete Phase 2: Foundational — migration + seed (4 tasks)
3. Complete Phase 3 backend: Services + Endpoints + Hub (T006-T012)
4. Complete Phase 3 frontend: Types + API + Components (T013-T019)
5. **STOP and VALIDATE**: Create a task, complete it, verify rotation + points + leaderboard
6. Complete Phase 3 tests: T020-T023
7. Complete Phase 4: Polish

### Incremental Delivery

1. **Foundation ready** → Schema migrated, seed data loads, app starts cleanly
2. **Backend complete** → v3 API endpoints work, all backend tests pass
3. **Frontend complete** → v3 UI renders, effort presets work, rotation picker works
4. **Tests pass** → All unit, integration, contract tests green
5. **Polish done** → i18n complete, E2E tests pass, dashboard reflects v3 totals

---

## Notes

- All v2 cleaning code is already implemented (commit `c8da8d0`). These tasks modify existing files, not create from scratch.
- The spec.md still has v2 semantics (6 direct conflicts identified in checklists/spec-plan-gap.md). This task list follows the v3 plan decisions (D1-D7) which supersede conflicting spec FRs.
- The `cleaning-api.yaml` contract (v3.0.0) is the source of truth for all DTO shapes.
- User Stories 1, 3, 4, 5 are unaffected and already complete.
- [P] tasks target different files with no shared dependencies — safe for parallel execution.
