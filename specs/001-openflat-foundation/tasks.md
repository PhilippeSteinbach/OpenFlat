# Tasks: OpenFlat Foundation

**Input**: Design documents from `/specs/001-openflat-foundation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Constitution Principle II (NON-NEGOTIABLE) — test tasks are integrated into each phase.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create solution structure, Aspire orchestration projects, and initialize web + mobile app scaffolding

- [X] T001 Create .NET solution file with all project directories per plan.md structure in OpenFlat.sln
- [X] T002 [P] Create OpenFlat.AppHost project with Aspire SDK 13.1 in OpenFlat.AppHost/OpenFlat.AppHost.csproj
- [X] T003 [P] Create OpenFlat.ServiceDefaults project with health checks and telemetry extensions in OpenFlat.ServiceDefaults/Extensions.cs
- [X] T004 [P] Create OpenFlat.Shared project with PredefinedUsers constants and UserInfo record in backend/OpenFlat.Shared/Users/PredefinedUsers.cs
- [X] T005 [P] Initialize React 19 frontend with Vite, TypeScript, Tailwind CSS 3.4, ESLint, and Prettier in frontend/
- [X] T006 [P] Initialize Expo SDK 52+ app with TypeScript, Expo Router v4, and NativeWind v4 in mobile/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend API skeletons with EF Core, database migrations, AppHost orchestration, and frontend/mobile infrastructure

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 [P] Create OpenFlat.Cleaning.Api project with CleaningDbContext, CleaningTask + CleaningComment entities, and Program.cs in backend/OpenFlat.Cleaning.Api/
- [X] T008 [P] Create OpenFlat.Shopping.Api project with ShoppingDbContext, ShoppingItem + ShoppingComment entities, and Program.cs in backend/OpenFlat.Shopping.Api/
- [X] T009 [P] Create OpenFlat.Finance.Api project with FinanceDbContext, Expense entity, and Program.cs in backend/OpenFlat.Finance.Api/
- [X] T010 Create OpenFlat.MigrationService with MigrationWorker that runs all 3 DbContext migrations and seeds sample data in OpenFlat.MigrationService/
- [X] T011 Configure AppHost to orchestrate PostgreSQL, MigrationService, 3 APIs, and Vite frontend in OpenFlat.AppHost/Program.cs
- [X] T011a [P] Create test projects (OpenFlat.Cleaning.Tests, OpenFlat.Shopping.Tests, OpenFlat.Finance.Tests, OpenFlat.Integration.Tests) with xUnit, FluentAssertions, Testcontainers, and WebApplicationFactory in backend/tests/
- [X] T011b [P] Configure Vitest + React Testing Library in frontend/tests/unit/ and Playwright in frontend/tests/e2e/
- [X] T011c [P] Configure Jest + React Native Testing Library in mobile/__tests__/
- [X] T011d [P] Create CI pipeline (GitHub Actions) with lint, format, unit tests, integration tests, contract tests, build, bundle size check, and code coverage gates per constitution Quality Gates table in .github/workflows/ci.yml
- [X] T012 [P] Create shared locale files with common UI strings (en.json, de.json) in shared/locales/
- [X] T013 [P] Create shared UI primitives (Button, Card, Input, Modal, EmptyState) in frontend/src/shared/components/
- [X] T014 [P] Setup React Router app shell with root layout and route definitions in frontend/src/app/
- [X] T015 [P] Configure TanStack Query v5 provider and API client wrappers per service in frontend/src/shared/api/
- [X] T016 [P] Create Zustand v5 current-user store, useSignalR hook, and i18next config in frontend/src/shared/
- [X] T017 [P] Setup Expo root layout with stack navigator, tab navigator scaffold, and i18n config in mobile/app/ and mobile/shared/i18n/
- [X] T018 [P] Configure mobile API client wrappers, Zustand user store, and SignalR hook in mobile/shared/

**Checkpoint**: All services start via `dotnet run` in AppHost. Frontend and mobile render empty shells. Database migrated with seed data.

---

## Phase 3: User Story 1 — User Selection & Dashboard (Priority: P1) 🎯 MVP

**Goal**: Users can select their identity from 5 predefined users and land on a dashboard with 3 module tiles and a points leaderboard.

**Independent Test**: Open the app, verify 5 users displayed with names and roles, tap a user, confirm dashboard loads with 3 module tiles and header showing selected user's name. Leaderboard shows all users at 0 points initially.

### Implementation for User Story 1

- [X] T019 [US1] Implement user selection screen showing 5 users with names, roles, and avatars in frontend/src/features/user-selection/
- [X] T020 [P] [US1] Implement mobile user selection screen in mobile/app/user-selection.tsx
- [X] T021 [US1] Implement main dashboard with 3 module tiles (Cleaning Board, Shopping List, Finance Tracker) and user header in frontend/src/features/dashboard/
- [X] T022 [P] [US1] Implement mobile dashboard with 3 module tiles and user header in mobile/app/(tabs)/index.tsx
- [X] T023 [US1] Add current user's points in dashboard header and compact leaderboard widget in frontend/src/features/dashboard/
- [X] T024 [P] [US1] Add points display and leaderboard widget to mobile dashboard in mobile/app/(tabs)/index.tsx
- [X] T025 [US1] Implement user switching navigation (back to selection screen) in frontend/src/app/ routes
- [X] T026 [P] [US1] Implement mobile user switching in mobile/app/_layout.tsx

**Checkpoint**: User selection → dashboard flow works on web and mobile. 3 module tiles visible, leaderboard shows 5 users at 0 points.

---

## Phase 4: User Story 2 — Cleaning Board (Priority: P2)

**Goal**: Kanban board with 4 columns, drag-and-drop task movement, user assignment, gamified point crediting/deducting, and real-time updates via SignalR.

**Independent Test**: Navigate to Cleaning Board, verify 4 columns render with seed tasks, drag a task between columns, assign a user, move to Done and confirm points credited, move back and confirm points deducted.

### Implementation for User Story 2

- [X] T027 [P] [US2] Implement CleaningTaskService with CRUD, move, assign, and point crediting/deducting logic in backend/OpenFlat.Cleaning.Api/Services/CleaningTaskService.cs
- [X] T028 [P] [US2] Implement LeaderboardService for point aggregation across all users in backend/OpenFlat.Cleaning.Api/Services/LeaderboardService.cs
- [X] T029 [US2] Implement task endpoints (listTasks, createTask, getTask, updateTask, deleteTask, moveTask, assignTask) per contracts/cleaning-api.yaml in backend/OpenFlat.Cleaning.Api/Endpoints/TaskEndpoints.cs
- [X] T030 [US2] Implement leaderboard endpoint (getLeaderboard) per contracts/cleaning-api.yaml in backend/OpenFlat.Cleaning.Api/Endpoints/LeaderboardEndpoints.cs
- [X] T031 [US2] Implement CleaningHub SignalR hub for real-time task and leaderboard updates in backend/OpenFlat.Cleaning.Api/Hubs/CleaningHub.cs
- [X] T032 [US2] Create Kanban board component with 4 columns and @dnd-kit/react drag-and-drop in frontend/src/features/cleaning/KanbanBoard.tsx
- [X] T033 [US2] Implement TaskCard component with title, points, assignee display, and current-user highlight in frontend/src/features/cleaning/TaskCard.tsx
- [X] T034 [US2] Implement create/edit/delete task dialogs and user assignment dropdown in frontend/src/features/cleaning/
- [X] T035 [US2] Connect cleaning board to SignalR CleaningHub via useSignalR hook in frontend/src/features/cleaning/
- [X] T035a [P] [US2] Write unit tests for CleaningTaskService (CRUD, move, assign, point credit/deduct, edge cases) and LeaderboardService in backend/tests/OpenFlat.Cleaning.Tests/
- [X] T035b [P] [US2] Write integration tests for all 12 Cleaning API endpoints using WebApplicationFactory + Testcontainers in backend/tests/OpenFlat.Cleaning.Tests/Integration/
- [X] T035c [US2] Write Playwright E2E test for Kanban board user journey (create task → drag to Done → verify points) in frontend/tests/e2e/cleaning.spec.ts
- [X] T036 [US2] Create mobile cleaning board with status tabs, task cards, move actions, and create/assign modals in mobile/app/(tabs)/cleaning.tsx
- [X] T037 [US2] Implement mobile task cards, create/edit/delete forms, and assignment control in mobile/app/(tabs)/cleaning.tsx
- [X] T038 [US2] Wire leaderboard API data to dashboard leaderboard widgets on web and mobile

**Checkpoint**: Cleaning Board fully functional with drag-and-drop, point system, real-time sync. Dashboard leaderboard reflects task completions.

---

## Phase 5: User Story 3 — Shopping List (Priority: P3)

**Goal**: Shopping list with add/edit items, check-off to Recently Bought, undo, 7-day auto-clear, and real-time updates via SignalR.

**Independent Test**: Navigate to Shopping List, add an item with name and quantity, verify it appears with adder's name, check it off, confirm it moves to Recently Bought, tap to undo, confirm it returns to active list.

### Implementation for User Story 3

- [X] T039 [P] [US3] Implement ShoppingItemService with CRUD, buy, undo, and validation logic in backend/OpenFlat.Shopping.Api/Services/ShoppingItemService.cs
- [X] T040 [P] [US3] Implement AutoClearService as hosted background service for 7-day expiry in backend/OpenFlat.Shopping.Api/Services/AutoClearService.cs
- [X] T041 [US3] Implement item endpoints (listItems, createItem, getItem, updateItem, buyItem, undoBuyItem) per contracts/shopping-api.yaml in backend/OpenFlat.Shopping.Api/Endpoints/ItemEndpoints.cs
- [X] T042 [US3] Implement ShoppingHub SignalR hub for real-time item updates in backend/OpenFlat.Shopping.Api/Hubs/ShoppingHub.cs
- [X] T043 [US3] Create shopping list view with active items list and Recently Bought section in frontend/src/features/shopping/ShoppingList.tsx
- [X] T044 [US3] Implement add/edit item form and check-off/undo interactions in frontend/src/features/shopping/
- [X] T045 [US3] Connect shopping list to SignalR ShoppingHub via useSignalR hook in frontend/src/features/shopping/
- [X] T046 [US3] Create mobile shopping list with active and Recently Bought sections in mobile/app/(tabs)/shopping/index.tsx
- [X] T047 [US3] Implement mobile add/edit item form, check-off/undo gestures in mobile/features/shopping/
- [X] T048 [US3] Connect mobile shopping list to SignalR ShoppingHub in mobile/features/shopping/
- [X] T048a [P] [US3] Write unit tests for ShoppingItemService (CRUD, buy, undo, validation) and AutoClearService (7-day expiry) in backend/tests/OpenFlat.Shopping.Tests/Unit/
- [X] T048b [P] [US3] Write integration tests for all 10 Shopping API endpoints using WebApplicationFactory + Testcontainers in backend/tests/OpenFlat.Shopping.Tests/Integration/
- [X] T048c [US3] Write Playwright E2E test for shopping user journey (add item → check off → undo → verify Recently Bought) in frontend/tests/e2e/shopping.spec.ts

**Checkpoint**: Shopping List fully functional with add, edit, buy, undo, auto-clear, real-time sync on web and mobile.

---

## Phase 6: User Story 4 — Finance Tracker & Settlement (Priority: P4)

**Goal**: Expense logging with own-only edit/delete, chronological list, and Settlement View with minimized debt transactions using greedy net-balance matching.

**Independent Test**: Navigate to Finance Tracker, log 2 expenses from different users, verify expense list shows both entries with amounts and dates, check Settlement View for correct 5-way split and minimized transactions.

### Implementation for User Story 4

- [X] T049 [P] [US4] Implement ExpenseService with CRUD and amount validation (positive cents only) in backend/OpenFlat.Finance.Api/Services/ExpenseService.cs
- [X] T050 [P] [US4] Implement SettlementService with greedy net-balance matching algorithm (max N-1 transactions) in backend/OpenFlat.Finance.Api/Services/SettlementService.cs
- [X] T051 [US4] Implement expense and settlement endpoints (listExpenses, createExpense, getExpense, updateExpense, deleteExpense, getSettlement) per contracts/finance-api.yaml in backend/OpenFlat.Finance.Api/Endpoints/
- [X] T052 [US4] Create expense list view with chronological display and own-only edit/delete controls in frontend/src/features/finance/ExpenseList.tsx
- [X] T053 [US4] Implement log/edit/delete expense forms with EUR validation in frontend/src/features/finance/
- [X] T054 [US4] Implement Settlement View with debt transactions list and settled-up state in frontend/src/features/finance/SettlementView.tsx
- [X] T055 [US4] Create mobile expense list and log/edit/delete forms with own-only controls in mobile/app/(tabs)/finance/index.tsx
- [X] T056 [US4] Implement mobile settlement view with transactions and settled-up state in mobile/features/finance/
- [X] T056a [P] [US4] Write unit tests for ExpenseService (CRUD, own-only validation) and SettlementService (greedy net-balance, all-settled, single-payer, zero-amount edge cases) in backend/tests/OpenFlat.Finance.Tests/Unit/
- [X] T056b [P] [US4] Write integration tests for all 6 Finance API endpoints using WebApplicationFactory + Testcontainers in backend/tests/OpenFlat.Finance.Tests/Integration/
- [X] T056c [US4] Write Playwright E2E test for finance user journey (log expense → verify settlement calculation) in frontend/tests/e2e/finance.spec.ts

**Checkpoint**: Finance Tracker fully functional. Expenses logged, own-only edit/delete works, Settlement View shows correct minimized debts.

---

## Phase 7: User Story 5 — Comments on Tasks and Shopping Items (Priority: P5)

**Goal**: Comment threads on cleaning tasks and shopping items with add, edit own, delete own, and edited indicator. Real-time updates via existing SignalR hubs.

**Independent Test**: Open a task card, add a comment, verify it appears with author name and timestamp. Verify edit/delete controls only on own comments. Open a shopping item, repeat same test.

### Implementation for User Story 5

- [X] T057 [P] [US5] Implement task comment endpoints (listTaskComments, addTaskComment, updateTaskComment, deleteTaskComment) per contracts/cleaning-api.yaml in backend/OpenFlat.Cleaning.Api/Endpoints/CommentEndpoints.cs
- [X] T058 [P] [US5] Implement item comment endpoints (listItemComments, addItemComment, updateItemComment, deleteItemComment) per contracts/shopping-api.yaml in backend/OpenFlat.Shopping.Api/Endpoints/CommentEndpoints.cs
- [X] T059 [US5] Create shared CommentThread component with add, edit, delete, edited indicator, and own-only controls in frontend/src/features/comments/CommentThread.tsx
- [X] T060 [US5] Integrate CommentThread into cleaning task detail view in frontend/src/features/cleaning/TaskDetail.tsx
- [X] T061 [P] [US5] Integrate CommentThread into shopping item detail view in frontend/src/features/shopping/ItemDetail.tsx
- [X] T062 [US5] Create mobile shared CommentThread component in mobile/features/comments/CommentThread.tsx
- [X] T063 [US5] Integrate comments into mobile task detail screen in mobile/app/(tabs)/cleaning/[taskId].tsx
- [X] T064 [P] [US5] Integrate comments into mobile shopping item detail screen in mobile/features/shopping/
- [X] T064a [P] [US5] Write integration tests for comment endpoints (Cleaning + Shopping) covering add, edit own, delete own, reject other's in backend/tests/OpenFlat.Cleaning.Tests/ and backend/tests/OpenFlat.Shopping.Tests/
- [X] T064b [US5] Write Playwright E2E test for comments user journey (add comment → edit → delete → verify permission enforcement) in frontend/tests/e2e/comments.spec.ts

**Checkpoint**: Comments work on both cleaning tasks and shopping items, both web and mobile. Own-only edit/delete enforced. Edited indicator shown.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: i18n completion, responsive validation, error/empty/loading states, and quickstart validation

- [X] T065 [P] Complete EN + DE translations for all user-facing strings in shared/locales/en.json and shared/locales/de.json
- [X] T066 [P] Validate all views on 375px viewport (iPhone SE) — no horizontal scroll or overlapping (FR-033, FR-034, SC-009)
- [X] T067 [P] Add empty states, loading states, and error states to all views across web and mobile
- [X] T068 Add validation error messages for all forms: expense amount (FR-030), item name (FR-031), comment text (FR-032)
- [X] T069 Run quickstart.md validation — clean clone, install, dotnet run AppHost, verify all services start and seed data loads
- [X] T069a [P] Write contract tests validating all 3 API responses against OpenAPI specs (cleaning-api.yaml, shopping-api.yaml, finance-api.yaml) in backend/tests/OpenFlat.Integration.Tests/
- [X] T069b [P] Write Playwright E2E test for US1 user journey (select user → verify dashboard → switch user) in frontend/tests/e2e/user-selection.spec.ts
- [X] T069c [P] Write Jest + RNTL component tests for mobile user selection, dashboard, and core feature screens in mobile/__tests__/
- [X] T069d [P] Audit and add ARIA labels to all interactive web elements, accessibility traits to all mobile interactive elements, and verify WCAG 2.1 AA color contrast (4.5:1 for text) across all views

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — **BLOCKS all user stories**
- **US1 (Phase 3)**: Depends on Phase 2 — no dependencies on other stories
- **US2 (Phase 4)**: Depends on Phase 2 — no dependencies on other stories
- **US3 (Phase 5)**: Depends on Phase 2 — no dependencies on other stories
- **US4 (Phase 6)**: Depends on Phase 2 — no dependencies on other stories
- **US5 (Phase 7)**: Depends on **US2 + US3** (needs task detail and item detail views to integrate comments into)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)** → Independent after Phase 2. Dashboard leaderboard shows 0 points until US2 provides data.
- **US2 (P2)** → Independent after Phase 2. T038 (wire leaderboard to dashboard) requires US1 dashboard widgets to exist.
- **US3 (P3)** → Fully independent after Phase 2.
- **US4 (P4)** → Fully independent after Phase 2.
- **US5 (P5)** → Requires US2 (cleaning task detail view) and US3 (shopping item detail view).

### Within Each User Story

- Backend services before endpoints
- Endpoints before frontend integration
- Web frontend before mobile (mirrors same logic)
- SignalR hub before real-time client connection
- Core implementation before cross-story integration

### Parallel Opportunities

**Phase 1**: T002–T006 all run in parallel (different projects/directories)

**Phase 2**: T007–T009 in parallel (3 independent API projects), then T010–T011 sequentially (depend on all 3 DbContexts + AppHost). T012–T018 all in parallel (different frontend/mobile directories).

**Phase 3+**: Once Phase 2 complete, US1–US4 can proceed in parallel if team capacity allows. US5 must wait for US2 + US3.

**Within stories**: Backend tasks marked [P] run in parallel. Web and mobile implementations of the same screen can run in parallel (e.g., T019 ∥ T020, T021 ∥ T022).

---

## Parallel Example: User Story 2

```text
# Step 1: Backend services (parallel)
T027: CleaningTaskService       ─┐
T028: LeaderboardService        ─┤── parallel (different files)
                                 │
# Step 2: Backend endpoints (after services)
T029: Task endpoints             ─┐
T030: Leaderboard endpoint       ─┤── sequential within endpoints
T031: CleaningHub SignalR         ─┘

# Step 3: Frontend (after endpoints)
T032: Kanban board               ─┐
T033: Task card component        ─┤── sequential (board → cards → dialogs → SignalR)
T034: Task dialogs + assignment  ─┤
T035: SignalR connection         ─┘

# Step 4: Mobile (parallel with web frontend)
T036: Mobile Kanban board        ─┐
T037: Mobile task cards + forms  ─┤── can run parallel with T032–T035
                                 │
# Step 5: Integration
T038: Wire leaderboard to dashboard (after T030 + T023/T024)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (**CRITICAL — blocks all stories**)
3. Complete Phase 3: User Story 1 (User Selection + Dashboard)
4. **STOP and VALIDATE**: Tap a user → dashboard loads → 3 tiles visible → leaderboard at 0
5. Deploy/demo if ready — app is navigable end-to-end

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → MVP! Selection + Dashboard working
3. Add US2 → Cleaning Board with gamified Kanban → leaderboard comes alive
4. Add US3 → Shopping List with buy/undo cycle
5. Add US4 → Finance Tracker with settlement
6. Add US5 → Comments on tasks and items
7. Polish → i18n, responsive validation, error states

### Suggested MVP Scope

**User Story 1 only** (8 tasks: T019–T026). Delivers:
- User selection screen with 5 users
- Dashboard with 3 module tiles
- Points header + leaderboard (initially empty)
- User switching

This validates the navigation shell and user context flow before investing in module implementation.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in the same phase
- [Story] label maps each task to its user story for traceability
- Each user story is independently completable and testable after Phase 2
- Test tasks are included per constitution Principle II (NON-NEGOTIABLE). Coverage: unit, integration, contract, E2E.
- All backend entities and DbContexts follow data-model.md exactly
- All API endpoints follow contracts/*.yaml specifications
- SignalR hubs: CleaningHub (/hubs/cleaning), ShoppingHub (/hubs/shopping). No Finance hub.
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
