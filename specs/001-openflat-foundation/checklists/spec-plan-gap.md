# Spec–Plan Gap Analysis Checklist: OpenFlat Foundation

**Purpose**: Validate that spec.md requirements are complete, clear, and consistent with plan.md v3 decisions (D1–D7) for recurring tasks, rotation, effort presets, and completion semantics
**Created**: 2026-03-09
**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md)
**Focus**: Spec–Plan alignment for Cleaning Checklist v3 evolution
**Depth**: Standard | **Audience**: Author (self-review)

---

## Requirement Completeness

- [x] CHK001 — Are recurring task creation requirements defined, including frequency value, frequency unit, and first due date as mandatory fields? [Resolved — FR-014 rewritten, FR-035 added]
- [x] CHK002 — Are effort preset requirements specified with explicit preset-to-points mappings (None=0, Normal=1, Big=2, Huge=4, Custom=user-defined)? [Resolved — FR-036 added]
- [x] CHK003 — Are round-robin rotation requirements documented, including rotation order setup and auto-advance on completion? [Resolved — FR-037, FR-038 added]
- [x] CHK004 — Are "complete for someone else" requirements documented, stating any user can mark another user's assigned task as done? [Resolved — FR-039 added]
- [x] CHK005 — Are "choose next-in-rotation" requirements defined for the complete-for-other flow, including the UI picker interaction? [Resolved — FR-039, US2 Scenario 10 added]
- [x] CHK006 — Are completion history/log requirements documented for audit trail and leaderboard accuracy? [Resolved — FR-040 added]
- [x] CHK007 — Are auto-reset requirements specified, stating that completing a task resets its due date and advances the assignee to the next rotation slot? [Resolved — FR-038, US2 Scenario 9 added]
- [x] CHK008 — Are leaderboard calculation requirements updated to reflect completion-log-based totals instead of summing points from done tasks? [Resolved — FR-041 added]
- [x] CHK009 — Are requirements defined for the Custom effort preset, including when manual points input is enabled vs disabled? [Resolved — FR-036, US2 Scenario 11 added]

## Requirement Clarity

- [x] CHK010 — Is the one-way completion behavior (no undo/toggle) explicitly stated, replacing the current toggle semantics? [Resolved — FR-009 rewritten to one-way complete]
- [x] CHK011 — Is the relationship between effort enum value and points clearly defined, especially that Huge (enum=3) maps to 4 points? [Resolved — FR-036 specifies all mappings]
- [x] CHK012 — Is the "completer gets points" rule unambiguously stated, making clear that the checking-off user earns points regardless of who the task is assigned to? [Resolved — FR-012 rewritten, US2 Scenario 5 updated]
- [x] CHK013 — Is the behavior for an empty rotation order (non-rotating task) clearly specified? [Resolved — FR-015 narrowed, US2 Scenario 6 added, Edge Case added]
- [x] CHK014 — Are the rules for due date recalculation after completion clearly defined (next due = current due + frequency, not "from today")? [Resolved — FR-035, FR-043 added]
- [x] CHK015 — Is "effort" clearly distinguished from "points" in the spec, so it's unambiguous that effort is a preset selector and points is the numeric value? [Resolved — FR-036 defines effort as preset, points as numeric]

## Requirement Consistency

- [x] CHK016 — Does FR-009 (toggle done/undone via checkbox) conflict with the plan's one-way completion model where tasks reset rather than staying done? [Resolved — FR-009 rewritten to one-way complete]
- [x] CHK017 — Does FR-012 (points credited to the assigned user) conflict with D5 (points credited to the completer)? [Resolved — FR-012 rewritten to credit completer]
- [x] CHK018 — Does FR-013 (deduct points when a task is unchecked) conflict with D7 (no undo — completion is permanent)? [Resolved — FR-013 removed with explanatory note]
- [x] CHK019 — Does the edge case "user unchecks a completed task → points deducted" conflict with the no-undo model? [Resolved — Edge case replaced with "completed by mistake" guidance]
- [x] CHK020 — Does FR-014's "optional due date" conflict with the plan's mandatory frequency and first due date? [Resolved — FR-014 rewritten with mandatory fields]
- [x] CHK021 — Does FR-015 (no-assignee warning when marking done) still apply when rotation auto-assigns users? [Resolved — FR-015 narrowed to non-rotating tasks only]

## Acceptance Criteria Quality

- [x] CHK022 — Are acceptance scenarios defined for completing a recurring task, including the auto-reset of due date and rotation advance? [Resolved — US2 Scenario 9 added]
- [x] CHK023 — Are acceptance scenarios defined for the "complete for someone else" flow, covering both point crediting and next-picker interaction? [Resolved — US2 Scenario 10 added]
- [x] CHK024 — Are acceptance scenarios defined for effort preset selection during task creation (including the Custom override)? [Resolved — US2 Scenario 11 added]
- [x] CHK025 — Can rotation correctness be objectively measured from the acceptance criteria (e.g., after N completions, all users in rotation have been assigned exactly once)? [Resolved — US2 Scenario 12 added]

## Scenario Coverage

- [x] CHK026 — Are requirements defined for what happens when a single-person rotation task is completed (same person reassigned)? [Resolved — FR-042, Edge Case added]
- [x] CHK027 — Are requirements defined for what happens when an overdue recurring task is completed — does the next due date calculate from the original due date or from today? [Resolved — FR-043, Edge Case added]
- [x] CHK028 — Are requirements defined for editing a task's rotation order or frequency after creation? [Resolved — FR-014a expanded to v3 fields]
- [x] CHK029 — Are requirements defined for deleting a recurring task that has completion history in the log? [Resolved — FR-014b rewritten, plan.md D8 added]

## Non-Functional & SignalR Coverage

- [x] CHK030 — Are SignalR real-time event requirements updated for new events (e.g., task recurred, rotation advanced) replacing the removed TaskUncompleted event? [Resolved — cleaning-api.yaml SignalR section updated, contract descriptions fixed]

## Notes

- The existing `requirements.md` checklist validated the original v2 spec quality. This checklist specifically targets the **gap between spec.md (v2 semantics) and plan.md (v3 decisions D1–D7)**.
- All 6 direct conflicts identified (CHK016–CHK021) will need spec amendments before generating tasks.md.
- Items marked `[Gap]` indicate requirements that exist in the plan but have no corresponding FR or acceptance scenario in the spec.
- Items marked `[Conflict]` indicate spec requirements that directly contradict plan decisions and must be revised.
