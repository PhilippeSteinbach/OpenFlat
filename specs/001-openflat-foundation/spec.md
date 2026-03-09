# Feature Specification: OpenFlat Foundation

**Feature Branch**: `001-openflat-foundation`
**Created**: 2026-03-09
**Status**: Draft
**Input**: User description: "Develop OpenFlat Foundation — the initial testing phase of the household management platform with predefined users, user selection screen, Main Dashboard, Cleaning Checklist (gamified checklist with due dates), Shopping List, Finance Tracker, and cross-module commenting."

## Assumptions

- This is a testing/prototype phase. Persistence uses PostgreSQL (decided during planning) to support multi-service architecture and realistic testing.
- The five predefined users are hardcoded and cannot be created, edited, or deleted by any user.
- The predefined users are: **Alex** (Coordinator), **Jordan** (Coordinator), **Sam** (Resident), **Taylor** (Resident), **Casey** (Resident).
- "Coordinator" and "Resident" are display labels only; both roles have identical permissions in this phase. Role-based access control is deferred to a future phase.
- "Mobile-first UI" means the interface is optimized for smartphone viewports (≤ 428px width) but remains usable on tablet and desktop screens.
- Currency for the Finance Tracker defaults to EUR (€). Multi-currency support is out of scope.
- Real-time collaboration (multiple users editing simultaneously on different devices) is not required in this phase; the app is designed for one person acting at a time. However, SignalR keeps any open clients in sync for demo and testing convenience.
- The Cleaning Checklist follows the same checklist pattern as the Shopping List — tasks are toggled done/undone rather than moved through columns.

## Clarifications

### Session 2026-03-09

- Q: Where and how are accumulated points displayed to users? → A: Points summary visible on the dashboard — current user's points in the header + compact ranking of all five users.
- Q: Can users move items back from "Recently Bought" to the active list, and are "Recently Bought" items ever cleared? → A: Users can tap a "Recently Bought" item to move it back to the active list (undo); items auto-clear from "Recently Bought" after 7 days.
- Q: Can tasks and shopping items be edited or deleted after creation? → A: Tasks are editable (title, points) and deletable by any user. Shopping items are editable (name, quantity) but not manually deletable — their lifecycle is add → check off → auto-clear after 7 days.
- Q: Can expenses be edited or deleted after logging? → A: Any user can edit or delete their own expenses; the Settlement View recalculates immediately.
- Q: What are the actual names of the five predefined users? → A: Alex, Jordan (Coordinators); Sam, Taylor, Casey (Residents).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — User Selection & Dashboard Entry (Priority: P1)

A person opens OpenFlat for the first time and sees a selection screen listing five household members. They tap on their name/avatar to enter the app. No password or authentication is required. After selection, they land on the Main Dashboard showing the three core modules as navigable entry points.

**Why this priority**: Without user selection and the dashboard, no other module is reachable. This is the gateway to the entire application.

**Independent Test**: Open the app, verify five users are displayed with names and roles, tap a user, confirm the dashboard loads with three module tiles and a header showing the selected user's name.

**Acceptance Scenarios**:

1. **Given** the app is launched, **When** the selection screen loads, **Then** exactly five users are displayed — two labeled "Coordinator" and three labeled "Resident" — each with a name and a distinguishable avatar or icon.
2. **Given** the selection screen is visible, **When** a user taps on a name, **Then** the app navigates to the Main Dashboard and the header displays the selected user's name.
3. **Given** a user is on the Main Dashboard, **When** they view the dashboard, **Then** three module tiles are visible: "Cleaning", "Shopping List", and "Finance Tracker", each tappable.
4. **Given** a user is on the Main Dashboard, **When** they wish to switch users, **Then** they can navigate back to the selection screen and pick a different user.

---

### User Story 2 — Cleaning Checklist (Gamified Checklist) (Priority: P2)

A user navigates to the Cleaning Checklist and sees a list of cleaning tasks displayed as checklist items (similar to the Shopping List pattern). Each item shows a title, a point value, the name of the responsible person (if assigned), and deadline information: the number of days remaining until the due date, or the number of days overdue (highlighted in red). Users can tap a checkbox to mark a task as done. Users can assign any of the five household members to a task. When a task is marked done, the point value is added to the assigned user's total points. Active (undone) tasks are sorted by urgency: overdue first, then due soonest, then no deadline. Completed tasks appear below.

**Why this priority**: The Cleaning Checklist validates the gamification system (points, leaderboard) and the assignment/deadline model that distinguishes it from the simpler Shopping List.

**Independent Test**: Navigate to the Cleaning Checklist, verify tasks render with assignee names and deadline badges, create a task with a due date, mark it done, confirm point crediting.

**Acceptance Scenarios**:

1. **Given** the user opens the Cleaning Checklist, **When** the list loads, **Then** active (undone) tasks are displayed first, sorted by urgency, followed by completed tasks.
2. **Given** an active task has a due date 3 days from now, **When** the list renders, **Then** a badge shows "3d left" next to the task.
3. **Given** an active task's due date was 2 days ago, **When** the list renders, **Then** a badge shows "2d overdue" in a warning/red style.
4. **Given** a task is assigned to a user, **When** the list renders, **Then** the assigned person's name is displayed on the checklist item.
5. **Given** a task with 50 points is assigned to "User A", **When** the user taps the checkbox to mark it done, **Then** 50 points are added to User A's total score.
6. **Given** a task has no user assigned, **When** it is marked done, **Then** no points are awarded and the system shows a visual indicator that an assignee is needed before points can be credited.
7. **Given** the user is on the Cleaning Checklist, **When** they want to create a new task, **Then** they can add a task with a title, point value, and optional due date, and the task appears in the active list.
8. **Given** a completed task exists, **When** the user taps its checkbox to uncheck it, **Then** the task moves back to the active list and previously credited points are deducted.
9. **Given** the user opens the Cleaning Checklist, **When** no tasks exist, **Then** an empty state message is displayed (e.g., "No cleaning tasks yet — add one!").

---

### User Story 3 — Shopping List (Priority: P3)

A user navigates to the Shopping List and sees all current items needed for the household. Each item displays a name, quantity, and who added it. Any user can add new items without limit. Any user can check off an item, which moves it to a "Recently Bought" section below the active list.

**Why this priority**: The Shopping List is a simpler CRUD module but essential for daily household coordination. It validates the basic add/check-off interaction pattern.

**Independent Test**: Navigate to the Shopping List, add an item with name and quantity, verify it appears with the adding user's name, check it off, confirm it moves to "Recently Bought".

**Acceptance Scenarios**:

1. **Given** the user opens the Shopping List, **When** no items exist, **Then** an empty state message is displayed (e.g., "No items yet — add something!").
2. **Given** the Shopping List is open, **When** the user adds an item with name "Milk" and quantity "2", **Then** the item appears in the active list showing "Milk", quantity "2", and the name of the user who added it.
3. **Given** an item "Bread (x1)" exists in the active list, **When** any user checks it off, **Then** the item moves to the "Recently Bought" section and is no longer in the active list.
4. **Given** the "Recently Bought" section has items, **When** the user views it, **Then** each item still shows its name, quantity, and who added it.
5. **Given** an item exists in "Recently Bought", **When** a user taps it, **Then** the item moves back to the active list (undo).
6. **Given** an item was checked off 7 days ago, **When** the "Recently Bought" section is viewed, **Then** that item has been automatically removed.
7. **Given** multiple users have added items, **When** the list is viewed, **Then** items from all users are visible in one shared list.

---

### User Story 4 — Finance Tracker & Settlement (Priority: P4)

A user navigates to the Finance Tracker, logs an expense with an amount and description, and sees it appear in a chronological list. Below the expense list, a "Settlement View" calculates an even five-way split of all expenses and shows who owes whom, simplifying debts into the minimum number of transactions.

**Why this priority**: The Finance Tracker involves calculation logic (debt simplification) which is more complex than simple CRUD. It is prioritized after the simpler modules.

**Independent Test**: Navigate to the Finance Tracker, log two expenses from different users, verify the expense list shows both entries, check the Settlement View for correct debt calculations.

**Acceptance Scenarios**:

1. **Given** the user opens the Finance Tracker, **When** no expenses exist, **Then** an empty state message is displayed and the Settlement View shows all balances at zero.
2. **Given** the Finance Tracker is open, **When** the user logs an expense of €50.00 with description "Groceries", **Then** the expense appears in the list showing the amount (€50.00), description ("Groceries"), the user who logged it, and the date.
3. **Given** User A has logged €100 in total expenses and no other user has logged expenses, **When** the Settlement View is calculated, **Then** each of the other four users owes User A €20.00 (€100 ÷ 5 = €20 per person; User A already covered their share).
4. **Given** multiple users have logged expenses, **When** the Settlement View is displayed, **Then** debts are simplified so that the fewest number of transactions are shown (e.g., if A owes B €10 and B owes A €5, only "A owes B €5" is shown).
5. **Given** all users have contributed equally, **When** the Settlement View is displayed, **Then** it shows a "settled up" state with no outstanding debts.

---

### User Story 5 — Comments on Tasks and Shopping Items (Priority: P5)

From a Cleaning Checklist task or a Shopping List item, a user can open a comment thread, view existing comments, and add a new comment. Users can edit or delete their own comments but cannot modify or remove comments left by others.

**Why this priority**: Comments are a cross-cutting enhancement that adds communication value to the two main modules. Since they depend on both the Cleaning Checklist and Shopping List existing first, they are lowest priority.

**Independent Test**: Open a task card, add a comment, verify it appears with the author name and timestamp. Verify the edit/delete controls appear only on the current user's own comments.

**Acceptance Scenarios**:

1. **Given** a Cleaning Checklist task is open, **When** the user adds a comment "I'll handle this tomorrow", **Then** the comment appears in the thread with the user's name and a timestamp.
2. **Given** a Shopping List item is selected, **When** the user adds a comment "Get the organic brand", **Then** the comment appears in the item's comment thread with the user's name and a timestamp.
3. **Given** a comment thread has comments from multiple users, **When** the current user views the thread, **Then** edit and delete controls are visible only on comments authored by the current user.
4. **Given** a user edits their own comment, **When** they save the change, **Then** the updated text is displayed and an "edited" indicator is shown.
5. **Given** a user deletes their own comment, **When** they confirm deletion, **Then** the comment is removed from the thread.
6. **Given** a comment was authored by another user, **When** the current user views it, **Then** no edit or delete controls are visible for that comment.

---

### Edge Cases

- What happens when a user marks a task as done without an assignee? No points are awarded and a visual indicator shows that an assignee is needed.
- What happens when an expense amount of €0.00 or a negative value is entered? The system rejects non-positive amounts and shows a validation message.
- What happens when a shopping item is added with an empty name? The system rejects the submission and highlights the required field.
- What happens when all five users have identical total expenses? The Settlement View shows "All settled — no payments needed."
- What happens when a user unchecks a completed task? The points previously credited are deducted from the assigned user's total.
- What happens when comment text is empty? The system prevents submission of blank comments.
- What happens when a task's point value is zero? The task can still be checked off, but zero points are awarded.
- What happens when a task has no due date? It appears after tasks with deadlines in the active list, with no deadline badge.

## Requirements *(mandatory)*

### Functional Requirements

**User Selection & Session**

- **FR-001**: System MUST present exactly five predefined users on the selection screen: Alex (Coordinator), Jordan (Coordinator), Sam (Resident), Taylor (Resident), Casey (Resident).
- **FR-002**: System MUST allow a user to be selected with a single tap; no password or credentials are required.
- **FR-003**: System MUST maintain the selected user as the "current user" for the duration of the session until the user explicitly switches.
- **FR-004**: System MUST allow the current user to return to the selection screen and switch to a different user at any time.

**Main Dashboard**

- **FR-005**: System MUST display three module tiles on the dashboard: "Cleaning", "Shopping List", and "Finance Tracker".
- **FR-006**: Each module tile MUST be tappable and navigate to the corresponding module view.
- **FR-006a**: The dashboard MUST display the current user's total points in the header area.
- **FR-006b**: The dashboard MUST display a compact points ranking of all five users (e.g., a small leaderboard widget), visible without navigating away.

**Cleaning Checklist**

- **FR-007**: System MUST display a checklist of cleaning tasks with active (undone) tasks first, sorted by urgency (overdue → due soonest → no deadline), followed by completed tasks.
- **FR-008**: Each checklist item MUST display a title, point value, assigned person's name (if any), and deadline badge (days remaining or days overdue).
- **FR-008a**: Active tasks with a due date in the past MUST show a "Xd overdue" badge in a warning style (red).
- **FR-008b**: Active tasks with a due date in the future MUST show a "Xd left" badge.
- **FR-008c**: Active tasks with no due date MUST appear after deadline tasks with no deadline badge.
- **FR-009**: System MUST allow any user to toggle a task's done/undone state by tapping a checkbox.
- **FR-010**: System MUST allow any user to assign any of the five household members to a task.
- **FR-011**: Checklist items assigned to the currently selected user MUST be highlighted with a visually distinct color or border.
- **FR-012**: When a task is marked done and has an assigned user, the system MUST credit the point value to that user's total score.
- **FR-013**: When a completed task is unchecked (marked undone), the system MUST deduct the previously credited points from the assigned user's total score.
- **FR-014**: System MUST allow any user to create a new task by providing a title, point value, and optional due date; the task appears in the active list.
- **FR-014a**: System MUST allow any user to edit a task's title, point value, and due date. If the task is done and the point value changes, the assigned user's total score MUST be recalculated.
- **FR-014b**: System MUST allow any user to delete a task. If the deleted task was done, the credited points MUST be deducted from the assigned user's total score.
- **FR-015**: If a task with no assignee is marked done, the system MUST show a visual indicator that no points were awarded and an assignee is needed.

**Shopping List**

- **FR-016**: System MUST display a list of active shopping items, each showing name, quantity, and the name of the user who added it.
- **FR-017**: Any user MUST be able to add a new item with a name (required) and quantity (required, positive integer).
- **FR-017a**: Any user MUST be able to edit a shopping item's name and quantity while it is in the active list.
- **FR-018**: Any user MUST be able to check off an item, which moves it from the active list to a "Recently Bought" section.
- **FR-019**: The "Recently Bought" section MUST remain visible below the active list and display checked-off items.
- **FR-019a**: Any user MUST be able to tap a "Recently Bought" item to move it back to the active list (undo accidental check-off).
- **FR-019b**: Items in the "Recently Bought" section MUST be automatically cleared after 7 days from the time they were checked off.

**Finance Tracker**

- **FR-020**: Any user MUST be able to log an expense by entering a positive amount (in EUR) and a description.
- **FR-020a**: A user MUST be able to edit their own expense's amount and description. The Settlement View MUST recalculate immediately after the edit.
- **FR-020b**: A user MUST be able to delete their own expense. The Settlement View MUST recalculate immediately after the deletion.
- **FR-020c**: A user MUST NOT be able to edit or delete expenses logged by another user — controls for these actions MUST be hidden on other users' entries.
- **FR-021**: System MUST display a chronological list of all expenses showing amount, description, who logged it, and date.
- **FR-022**: System MUST display a "Settlement View" below the expense list that calculates an even five-way split of all expenses.
- **FR-023**: The Settlement View MUST simplify debts to the minimum number of transactions (e.g., net out mutual debts).
- **FR-024**: When all users are settled (no outstanding debts), the Settlement View MUST display a "settled up" state.

**Comments**

- **FR-025**: System MUST allow users to add comments on Cleaning Checklist tasks and Shopping List items.
- **FR-026**: Each comment MUST display the author's name and a timestamp.
- **FR-027**: A user MUST be able to edit or delete their own comments.
- **FR-028**: A user MUST NOT be able to edit or delete comments authored by another user — controls for these actions MUST be hidden.
- **FR-029**: Edited comments MUST display an "edited" indicator.

**Validation**

- **FR-030**: System MUST reject expense amounts that are zero or negative with a validation message.
- **FR-031**: System MUST reject shopping items with an empty name with a validation message.
- **FR-032**: System MUST reject empty comment submissions.

**UI & Responsiveness**

- **FR-033**: The interface MUST be mobile-first, optimized for smartphone viewports (≤ 428px width).
- **FR-034**: The interface MUST remain functional and usable on tablet and desktop viewports.

### Key Entities

- **User**: Represents a household member. Attributes: unique identifier, display name, role label ("Coordinator" or "Resident"), avatar/icon, total points earned. The five predefined users are: Alex (Coordinator), Jordan (Coordinator), Sam (Resident), Taylor (Resident), Casey (Resident). All are immutable.
- **Task (Cleaning Checklist)**: A household chore. Attributes: title, point value, done/undone state, due date (optional), assigned user (optional), completed-at timestamp, comments. Tasks can be created by any user and toggled done/undone.
- **Shopping Item**: An item needed for the household. Attributes: name, quantity, added-by user, status (active or recently bought), comments.
- **Expense**: A financial entry. Attributes: amount (EUR), description, logged-by user, date.
- **Comment**: A text message attached to a Task or Shopping Item. Attributes: text content, author (user), timestamp, edited flag.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can select their identity and reach the Main Dashboard in under 5 seconds (two taps maximum).
- **SC-002**: A user can create a new cleaning task and see it appear on the board in under 10 seconds.
- **SC-003**: A user can toggle a task's done state with a single tap on the checkbox, and the state change completes visually within 1 second.
- **SC-004**: Points are accurately credited (or deducted) within 1 second of a task being marked done (or undone).
- **SC-005**: A user can add a shopping item and see it in the list within 5 seconds.
- **SC-006**: Checking off a shopping item moves it to "Recently Bought" within 1 second.
- **SC-007**: A user can log an expense and see the Settlement View update within 5 seconds.
- **SC-008**: The Settlement View correctly calculates minimized debts for any combination of expenses across five users (verified against manual calculations in test scenarios).
- **SC-009**: 100% of user-facing views render correctly on a 375px-wide viewport (iPhone SE size) without horizontal scrolling or overlapping elements.
- **SC-010**: Comments can be added, edited, and deleted with correct permission enforcement — own comments are editable/deletable; others' comments are read-only.
