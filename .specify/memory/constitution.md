<!--
  Sync Impact Report
  ==================
  Version change: 1.0.1 → 1.0.2 (patch — clarification)
  Modified principles: None
  Modified sections:
    - Principle V (Modular & Extensible Architecture):
      Docker Compose bullet broadened to "Local orchestration
      (Docker Compose or .NET Aspire AppHost)" since Aspire
      replaces Compose for this project's local dev workflow.
    - Technology Standards: Containerization row updated from
      "Docker / Docker Compose" to "Docker / .NET Aspire" to
      reflect that Aspire AppHost is the orchestration tool.
  Previous amendments:
    - 1.0.0 → 1.0.1: Mobile Apps row updated from
      "React Native" to "React Native (Expo)".
  Removed sections: None
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ compatible (no changes needed)
    - .specify/templates/spec-template.md ✅ compatible (no changes needed)
    - .specify/templates/tasks-template.md ✅ compatible (no changes needed)
  Follow-up TODOs: None
-->

# OpenFlat Constitution

## Core Principles

### I. Code Quality & Consistency

All code committed to OpenFlat MUST adhere to enforced,
automated style and quality standards. Manual style review
is insufficient; tooling MUST catch violations before merge.

- Every project (backend, frontend, mobile) MUST use a
  configured linter and formatter that runs on pre-commit or
  CI. No unformatted code reaches the main branch.
- Backend C# code MUST follow .NET conventions and pass
  Roslyn analyzers with zero warnings treated as errors.
- Frontend and mobile TypeScript/JavaScript code MUST pass
  ESLint with a strict shared configuration. `any` types
  are prohibited except where explicitly justified with an
  inline suppression comment and reviewed rationale.
- All public API endpoints MUST be documented with OpenAPI
  specifications. Internal services MUST have XML-doc or
  JSDoc comments on every public member.
- Magic numbers, string literals used as identifiers, and
  commented-out code MUST NOT exist in production source.
  Use named constants, enums, or configuration instead.
- Dependency additions MUST be justified: state the problem
  solved and confirm no existing dependency covers the need.

### II. Test-Driven Quality Assurance (NON-NEGOTIABLE)

Every feature MUST be verified by automated tests before it
is considered complete. Untested code is unfinished code.

- New features MUST include unit tests covering all critical
  paths and edge cases. Minimum code coverage target for new
  code is 80% line coverage per module.
- Integration tests MUST exist for every API endpoint and
  every cross-service interaction (e.g., backend ↔ database,
  frontend ↔ API, SignalR real-time flows).
- Contract tests MUST be written for every REST endpoint to
  verify request/response schemas. Schema drift between
  frontend expectations and backend responses MUST be caught
  automatically.
- Tests MUST be deterministic: no flaky tests allowed. A
  test that fails intermittently MUST be fixed or quarantined
  within 24 hours of detection.
- CI pipeline MUST run the full test suite on every pull
  request. Merging with failing tests is forbidden.
- End-to-end tests MUST cover the primary user journeys for
  each module (chore completion, shopping list sync, expense
  settlement, bulletin board posting).

### III. User Experience Consistency

OpenFlat MUST deliver a coherent, intuitive experience
across web and mobile platforms. Users MUST NOT perceive
the platforms as separate products.

- A shared design system (component library) MUST define
  all UI primitives: buttons, inputs, cards, modals,
  typography, color tokens, spacing scale, and iconography.
- Every user-facing string MUST be externalized into i18n
  resource files. Hard-coded user-visible text is forbidden.
  English is the default; German MUST be maintained in
  parity. New features MUST ship with both translations.
- Accessibility MUST be treated as a requirement, not a
  nice-to-have. All interactive elements MUST have proper
  ARIA labels (web) or accessibility traits (mobile). Color
  contrast MUST meet WCAG 2.1 AA minimum (4.5:1 for text).
- Navigation patterns, terminology, and interaction flows
  MUST be consistent between web and mobile. A user
  switching platforms MUST find the same features in the
  same logical locations.
- Error states, empty states, and loading states MUST be
  designed and implemented for every view. No blank screens
  or raw error messages shown to users.
- All user-facing changes MUST be reviewed for UX impact.
  Features that alter navigation, terminology, or primary
  workflows require explicit UX sign-off before merge.

### IV. Performance & Responsiveness

OpenFlat MUST be fast enough that users choose it over
sticky notes and spreadsheets. Performance is a feature.

- API response times MUST NOT exceed 200ms at p95 for
  standard CRUD operations under normal load (up to 100
  concurrent users per instance).
- Real-time updates (WebSocket/SignalR) MUST propagate to
  all connected clients within 500ms of the originating
  event under normal load.
- Web frontend initial load (Time to Interactive) MUST be
  under 3 seconds on a 4G connection. Bundle size MUST be
  monitored; increases over 10% per release require explicit
  justification.
- Mobile app cold start MUST complete in under 2 seconds on
  mid-range devices (e.g., 2021-era Android phone).
- Database queries MUST NOT perform full table scans on
  tables expected to grow beyond 10,000 rows. Every query
  serving a user-facing feature MUST use appropriate indexes.
- Performance budgets MUST be enforced in CI where tooling
  allows (bundle size checks, lighthouse scores for web).
  Regressions MUST block the merge until resolved.

### V. Modular & Extensible Architecture

OpenFlat MUST remain easy to extend with new modules
without destabilizing existing functionality.

- Each feature module (Cleaning, Shopping, Expenses,
  Bulletin Board, Calendar, Polls, Wiki) MUST be
  self-contained with clear boundaries. Cross-module
  dependencies MUST flow through defined interfaces, never
  through direct database access or internal implementation.
- Backend services MUST follow a layered architecture:
  API controllers → service layer → data access. Skipping
  layers (controller directly querying the database) is
  forbidden.
- Frontend code MUST be organized by feature module. Shared
  UI components live in the design system; feature-specific
  logic MUST NOT leak into shared packages.
- New modules MUST be addable without modifying existing
  module code (Open/Closed Principle). Integration points
  (e.g., notification triggers, gamification hooks) MUST
  use event-based or plugin-style contracts.
- Local orchestration (Docker Compose or .NET Aspire AppHost)
  MUST allow each service to start independently for
  development. A developer working on the frontend MUST NOT
  need to build the mobile app.
- Database migrations MUST be forward-compatible and
  reversible. Breaking schema changes MUST include a
  migration path documented in the PR description.

## Technology Standards

The following technology constraints are binding for all
OpenFlat development. Deviations require a constitution
amendment.

| Layer | Standard | Version Requirement |
|-------|----------|---------------------|
| Backend API | .NET (C#) | .NET 8+ |
| Web Frontend | React | Latest stable |
| Mobile Apps | React Native (Expo) | Latest stable (iOS + Android) |
| Database | PostgreSQL | 16+ |
| Real-time | SignalR (WebSockets) | Bundled with .NET |
| Containerization & Orchestration | Docker / .NET Aspire | Latest stable |
| i18n | Standard resource files | English default, German included |

- All runtime dependencies MUST be pinned to specific
  versions in lock files (package-lock.json, .csproj).
- Node.js version MUST be 20+ for all JavaScript/TypeScript
  tooling.
- Third-party dependencies MUST be licensed under
  Apache-2.0, MIT, BSD, or similarly permissive licenses
  compatible with Apache-2.0.

## Development Workflow & Quality Gates

Every code change follows this workflow. No exceptions.

### Pull Request Requirements

1. Every change MUST be submitted via pull request against
   the main branch from a feature branch.
2. PRs MUST include a description referencing the feature
   spec or issue being addressed.
3. PRs MUST pass all CI checks (lint, format, test suite,
   build, performance budgets) before review.
4. PRs MUST receive at least one approving review before
   merge.
5. PRs that modify user-facing behavior MUST include
   updated or new tests covering the change.

### Quality Gates (CI Pipeline)

| Gate | Action on Failure |
|------|-------------------|
| Lint & Format | Block merge |
| Unit Tests | Block merge |
| Integration Tests | Block merge |
| Contract Tests | Block merge |
| Build (all targets) | Block merge |
| Bundle Size Budget | Block merge |
| Code Coverage (new code ≥ 80%) | Warn (block if below 60%) |

### Branch Strategy

- `main` is the stable, deployable branch.
- Feature branches follow `###-feature-name` convention.
- Direct commits to `main` are forbidden.

## Governance

This constitution is the authoritative source of technical
standards for OpenFlat. It supersedes informal practices,
individual preferences, and ad-hoc decisions.

### Authority & Compliance

- All pull requests and code reviews MUST verify compliance
  with constitutional principles. Reviewers are expected to
  flag violations.
- When a technical decision conflicts with a principle,
  the principle wins unless a formal exception is granted
  via the amendment process below.
- Complexity and architectural deviations MUST be justified
  in writing (PR description or ADR) with reference to the
  specific principle being stretched.

### Amendment Procedure

1. Propose the change as a pull request modifying this file.
2. The PR description MUST state: what changes, why, and
   the impact on existing code or workflows.
3. The amendment MUST be reviewed and approved by at least
   two contributors.
4. Version MUST be incremented following semantic versioning:
   - **MAJOR**: Principle removal, redefinition, or
     backward-incompatible governance change.
   - **MINOR**: New principle or section added, or material
     expansion of existing guidance.
   - **PATCH**: Clarifications, wording fixes, non-semantic
     refinements.
5. The Sync Impact Report (HTML comment at top of this file)
   MUST be updated with every amendment.

### Compliance Review

- A quarterly review of this constitution SHOULD be
  conducted to ensure principles remain relevant as the
  project evolves.
- If a principle is consistently waived or ignored, it MUST
  be either enforced or formally removed via amendment. Stale
  principles erode trust in the constitution.

**Version**: 1.0.2 | **Ratified**: 2026-03-09 | **Last Amended**: 2026-03-09
