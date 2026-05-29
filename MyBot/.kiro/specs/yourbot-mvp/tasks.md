# Implementation Plan: YourBot MVP (Stabilized)

## Overview

本实现计划基于 YourBot MVP 需求文档、设计文档和稳定性补充文档，按照"基础设施 → 状态机 → AI 异步队列 → Outbox 与事件总线 → 前端实时订阅 → 主业务流程 → 看板与报告 → 通知与审计 → 体验优化"的顺序组织任务。所有 AI 能力采用异步作业模型，所有状态变更遵循严格状态机，所有关键写操作满足事务+幂等+审计要求。

## Tasks

- [x] 1. Infrastructure: Unified Response, Exception Handling, Auth, Logging
  - Set up backend project structure (modules/*, common/*, domain/*, infra/*, events/*, jobs/*, schemas/*)
  - Set up frontend project structure (pages/*, components/*, store/*, api/*, hooks/*, schemas/*, services/*)
  - All endpoints under `/api/v1/` prefix

  - [x] 1.1 Initialize backend NestJS project with module structure
    - Create NestJS project with modules: auth, user, requirement, task, ai, report, alert, dashboard, notification, realtime, audit, outbox
    - Configure Prisma with PostgreSQL connection
    - Set up environment configuration (.env, config module)
    - _Requirements: 11.1, 11.2_

  - [x] 1.2 Initialize frontend React + Vite + TypeScript project
    - Set up Vite with React and TypeScript
    - Configure Ant Design, Zustand, React Router, Axios
    - Create directory structure: pages/*, components/*, store/*, api/*, hooks/*, schemas/*, services/*
    - _Requirements: 11.1_

  - [x] 1.3 Implement unified API response format and global exception filter
    - Create `ApiResponse<T>` interface: `{ code, message, data, request_id }`
    - Implement `GlobalExceptionFilter` mapping exceptions to error codes (0, 40001, 40101, 40301, 40401, 50001, 50002)
    - Generate unique `request_id` (UUID v4) for every response
    - Implement `PaginatedList<T>` with page/page_size defaults (1/20)
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x]* 1.4 Write property test for API response format invariant
    - **Property 21: API response format invariant**
    - **Validates: Requirements 11.1, 11.3, 11.4**

  - [x] 1.5 Implement JWT authentication and role-based guards
    - Implement `AuthService` with bcrypt (cost factor ≥ 10) password hashing
    - Implement JWT token generation and validation
    - Create `JwtAuthGuard` and `RolesGuard` decorators
    - Implement login endpoint `POST /api/v1/auth/login`
    - Implement `GET /api/v1/auth/me` for current user profile
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

  - [x]* 1.6 Write property tests for authentication
    - **Property 1: Valid login returns token and role**
    - **Property 2: Invalid credentials rejected uniformly**
    - **Property 3: Role-based endpoint access control**
    - **Property 4: Invalid token rejection**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7**

  - [x] 1.7 Implement frontend Axios client with interceptors
    - Create Axios instance with baseURL `/api/v1`
    - Add request interceptor to attach JWT Bearer token
    - Add response interceptor for unified error handling (40101 → redirect login)
    - Implement `X-Idempotency-Key` header injection for write requests
    - _Requirements: 11.1, 11.4_

  - [x] 1.8 Implement frontend auth store and login page
    - Create Zustand `authStore` with token, user, login/logout/fetchMe actions
    - Build Login page with Ant Design form
    - Implement route guards for role-based page access
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 1.7_

- [x] 2. State Machines: Task / Requirement / AI Job Domain Layer
  - Centralize all state machine rules in `domain/` layer
  - State machine rules MUST NOT be in controllers
  - Frontend buttons MUST only show valid transitions

  - [x] 2.1 Implement Task state machine in domain layer
    - Define Task states: todo, doing, blocked, delayed, done
    - Define allowed transitions: todo→doing, doing→blocked, doing→delayed, doing→done, blocked→doing, delayed→doing
    - Enforce FORBIDDEN transitions: done→doing, done→blocked, blocked→done, todo→done (unless admin force-close)
    - Enforce rules: done sets completed_at + progress=100, blocked requires blocked_reason, progress in [0,100]
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x]* 2.2 Write property test for Task state machine transitions
    - **Property 15: Task status transition validation and logging**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

  - [x] 2.3 Implement Requirement state machine in domain layer
    - Define Requirement states: draft, analyzing, split_done, assigned, in_progress, closed
    - Define allowed transitions: draft→analyzing, analyzing→split_done, split_done→assigned, assigned→in_progress, in_progress→closed
    - Enforce FORBIDDEN transitions: closed→in_progress, split_done→draft, assigned→split_done, closed→assigned
    - _Requirements: 2.1, 2.4, 3.1, 3.3_

  - [x] 2.4 Implement AI Job state machine in domain layer
    - Define AI Job states: pending, running, success, fail, canceled
    - Define allowed transitions: pending→running, running→success, running→fail, pending→canceled
    - Enforce FORBIDDEN transitions: success→running, fail→success, canceled→running
    - _Requirements: 3.1, 3.6, 4.4, 8.6_

  - [x]* 2.5 Write property test for Task status update permission enforcement
    - **Property 16: Task status update permission enforcement**
    - **Validates: Requirements 6.6**

- [x] 3. Checkpoint - Infrastructure and State Machines
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. AI Job Async Queue
  - All AI capabilities (requirement split, assignment suggest, report generate) MUST use async job pattern
  - AI failure MUST NOT block main business flow

  - [x] 4.1 Create ai_jobs and related Prisma schema migrations
    - Add `ai_jobs` table: id, job_type (requirement_split|assignment_suggest|report_generate), status (pending|running|success|fail|canceled), request_id, biz_ref_id, input_payload, output_payload, raw_response, prompt_version, schema_version, retry_count, max_retry, error_message, created_by, created_at, started_at, completed_at
    - Run Prisma migration
    - _Requirements: 3.5, 4.3, 8.5_

  - [x] 4.2 Implement AI Job service with queue dispatch and worker
    - Create `AiJobService` to create jobs (pending), dispatch to queue
    - Implement worker that consumes queue: pending→running→success/fail
    - Integrate AI Job state machine from domain layer
    - Implement prompt versioning: prompt_version, schema_version, template_name per scenario
    - _Requirements: 3.1, 3.5, 3.6, 4.3, 4.4, 8.5, 8.6_

  - [x] 4.3 Implement AI retry strategy and output validation
    - Network fail: auto-retry 2 times
    - Parse fail: auto-retry 1 time
    - Model timeout: auto-retry 1 time
    - Business validation fail: no retry, direct fail with raw_response preserved
    - All AI output must be structured JSON validated by Zod schema
    - Output must include schema_version, business key reference, confidence/reason
    - _Requirements: 3.5, 3.6, 4.4, 8.6_

  - [x]* 4.4 Write property tests for AI call logging and failure handling
    - **Property 8: AI call logging completeness**
    - **Property 9: AI failure returns 50002 and logs error**
    - **Validates: Requirements 3.5, 3.6, 4.3, 4.4, 8.5, 8.6**

  - [x] 4.5 Implement AI requirement split job handler
    - Build prompt template for requirement decomposition with prompt_version
    - Parse AI response into task tree structure (title, description, estimated_hours, dependencies, acceptance_criteria)
    - Validate output against Zod schema with schema_version
    - Return structured result without persisting to tasks table
    - _Requirements: 3.1, 3.2, 3.5_

  - [x] 4.6 Implement AI assignment suggestion job handler
    - Build prompt template for assignment suggestions with prompt_version
    - Analyze member profiles (skills, workload, availability, historical_success_rate)
    - Return ranked recommendations with ai_reason for each suggestion
    - Validate output against Zod schema
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 4.7 Implement AI report generation job handler
    - Build prompt template for report generation (daily/weekly/stage) with prompt_version
    - Generate summary, detailed content, and risk_summary
    - Validate output against Zod schema
    - _Requirements: 8.1, 8.5_

- [x] 5. Outbox Pattern and Event Bus
  - Unified event model with event_id, event_type, request_id, timestamp, actor_id, entity_type, entity_id, payload
  - Event delivery failure MUST NOT affect main transaction

  - [x] 5.1 Create outbox_events Prisma schema and migration
    - Add `outbox_events` table: id, event_type, aggregate_type, aggregate_id, payload, status, retry_count, next_retry_at, created_at, sent_at
    - Run Prisma migration
    - _Requirements: 11.4_

  - [x] 5.2 Implement outbox writer and background worker
    - Write outbox events within main business transaction
    - Implement background worker to scan and dispatch pending events
    - Mark events as sent after successful delivery
    - Implement retry logic for failed event delivery
    - _Requirements: 11.4_

  - [x] 5.3 Implement domain event bus and event definitions
    - Define all required events: task.created, task.updated, task.assigned, task.status_changed, task.blocked, task.done, requirement.created, requirement.split_done, ai_job.created, ai_job.running, ai_job.success, ai_job.fail, report.generated, alert.created, alert.resolved, notification.created
    - Implement unified event payload format with event_id, event_type, request_id, timestamp, actor_id, entity_type, entity_id, payload
    - Wire event emission into service layer after successful transactions
    - _Requirements: 11.4_

  - [x] 5.4 Implement idempotency middleware
    - Create middleware to read `X-Idempotency-Key` header
    - Store idempotency keys with TTL, reject duplicate requests within validity period
    - Apply to all high-frequency write endpoints (task status update, batch assignment, AI job submit, report generate)
    - _Requirements: 11.4_

- [x] 6. Frontend Realtime Subscription and Polling
  - WebSocket for board/dashboard/alerts
  - Polling for AI jobs

  - [x] 6.1 Implement backend WebSocket gateway (realtime module)
    - Create NestJS WebSocket gateway for real-time event broadcasting
    - Subscribe to domain events and broadcast to connected clients
    - Implement room-based subscription (per user, per project)
    - _Requirements: 7.4, 9.1_

  - [x] 6.2 Implement frontend WebSocket client and event handlers
    - Create WebSocket connection manager with auto-reconnect
    - Implement event handlers: task.status_changed → refresh board, alert.created → refresh dashboard, report.generated → refresh report list, ai_job.success → refresh AI result page
    - Create `useRealtimeEvents` hook for components
    - _Requirements: 7.4, 9.1_

  - [x] 6.3 Implement frontend AI job polling service
    - Create `useAiJobPolling` hook that polls `GET /api/v1/ai/jobs/:id`
    - Handle job status transitions: show loading (pending/running), show result (success), show error with retry (fail)
    - Implement exponential backoff for polling interval
    - _Requirements: 3.1, 3.6, 4.4, 8.6_

- [x] 7. Checkpoint - AI Jobs, Events, and Realtime
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Task and Requirement Main Flows
  - Transactions required for: task tree confirmation, batch assignment, status update + log
  - Deduplication for repeated status updates and batch assignment requests

  - [x] 8.1 Implement Requirement CRUD endpoints
    - `POST /api/v1/requirements` - create with validation (required fields, valid priority, future due_date)
    - `GET /api/v1/requirements` - paginated list with filter (status, priority) and sort (created_at, due_date)
    - `GET /api/v1/requirements/:id` - detail view
    - `PUT /api/v1/requirements/:id` - update with timestamp
    - Apply Requirement state machine for status transitions
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x]* 8.2 Write property tests for Requirement creation and validation
    - **Property 5: Requirement creation round-trip**
    - **Property 6: Requirement validation rejects invalid input**
    - **Property 7: List filtering and sorting correctness**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.5, 2.6**

  - [x] 8.3 Implement AI split endpoint (async job submission)
    - `POST /api/v1/requirements/:id/split` - submit AI split job (creates ai_jobs record, returns job_id)
    - `GET /api/v1/ai/jobs/:id` - poll job status and result
    - Transition requirement status: draft→analyzing on submit, analyzing→split_done on success
    - Return task tree result without persisting to tasks table
    - _Requirements: 3.1, 3.2, 3.4_

  - [x]* 8.4 Write property test for task tree non-persistence before confirmation
    - **Property 10: Task tree not persisted until confirmed**
    - **Validates: Requirements 3.2**

  - [x] 8.5 Implement task tree confirmation with transactional persistence
    - `POST /api/v1/requirements/:id/confirm-split` - persist confirmed task tree
    - Use database transaction: persist all tasks with parent-child relationships and dependencies atomically
    - Transition requirement status: split_done→assigned after confirmation
    - Emit task.created events for each task via outbox
    - _Requirements: 3.3, 3.4_

  - [x]* 8.6 Write property test for confirmed task tree parent-child relationships
    - **Property 11: Confirmed task tree preserves parent-child relationships**
    - **Validates: Requirements 3.3**

  - [x] 8.7 Implement AI assignment suggestion endpoint (async job)
    - `POST /api/v1/tasks/assignment-suggest` - submit AI assignment suggestion job
    - Return ranked assignee recommendations with ai_reason for each task
    - AI failure allows manual assignment fallback (does not block)
    - _Requirements: 4.1, 4.2, 4.4_

  - [x]* 8.8 Write property test for assignment suggestions completeness
    - **Property 12: Assignment suggestions complete with reasoning**
    - **Validates: Requirements 4.1, 4.2**

  - [x] 8.9 Implement task assignment and batch dispatch
    - `POST /api/v1/tasks/assign` - assign tasks to members (single or batch)
    - Validate assigned member exists and has active status
    - Use transaction: update owner_id, set status to todo, record assignment timestamp, create notification
    - Batch assignment must be atomic: if any assignment invalid, reject entire batch
    - Apply idempotency key deduplication
    - Emit task.assigned events via outbox
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x]* 8.10 Write property tests for task assignment
    - **Property 13: Task assignment updates state correctly**
    - **Property 14: Batch assignment atomicity**
    - **Validates: Requirements 5.1, 5.3, 5.4**

  - [x] 8.11 Implement task status update endpoint
    - `POST /api/v1/tasks/:id/status` - update task status
    - Apply Task state machine validation from domain layer
    - Enforce permission: only task owner, manager, or admin can update
    - Use transaction: update status + create TaskStatusLog atomically
    - Deduplication: reject same status repeated submission
    - Emit task.status_changed (and task.blocked / task.done as applicable) events via outbox
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 8.12 Implement task list and detail endpoints
    - `GET /api/v1/tasks` - paginated list with filters (requirement_id, owner_id, status)
    - `GET /api/v1/tasks/:id` - task detail with status logs timeline
    - _Requirements: 7.1, 7.3_

- [x] 9. Checkpoint - Main Business Flows
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Frontend Requirement and Task Pages
  - Frontend buttons MUST match state machine (only show valid transitions)
  - All pages must support loading, empty, error, and retry states

  - [x] 10.1 Implement Requirement list and creation pages
    - Build RequirementFilterBar (status, priority filters, sort options)
    - Build RequirementTable with pagination
    - Build RequirementFormDrawer for create/edit with field validation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 10.2 Implement AI Split page with async job flow
    - Build RequirementSummaryCard showing requirement details
    - Build TaskTreeView for displaying AI-generated task tree
    - Implement AI job submission → polling → result display flow
    - Build TaskEditDrawer for editing tasks before confirmation
    - Show loading/progress during AI processing, error with retry on failure
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 10.3 Implement Task Assignment page with async AI suggestions
    - Build TaskAssignmentTable showing unassigned tasks
    - Build MemberRecommendCard showing AI suggestions with reasoning
    - Implement AI suggestion job submission → polling → display flow
    - Build AssignConfirmDialog for batch assignment confirmation
    - Allow manual assignment when AI fails
    - _Requirements: 4.1, 4.2, 4.4, 5.1, 5.2, 5.3_

  - [x] 10.4 Implement My Tasks page for members
    - Build MyTaskSummary with task counts by status
    - Build MyTaskList with status filter
    - Build TaskQuickUpdateForm with state-machine-aware buttons (only valid transitions shown)
    - Require blocked_reason input when transitioning to blocked
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 10.5 Implement Task Detail page
    - Build TaskDetailHeader with status badge and action buttons (state-machine-aware)
    - Build TaskMetaCard showing all task metadata
    - Build StatusTimeline showing task status history
    - _Requirements: 6.1, 6.2, 7.2_

- [x] 11. Kanban Board and Reports
  - Real-time refresh via WebSocket on task.status_changed and report.generated events

  - [x] 11.1 Implement Kanban Board backend endpoint
    - `GET /api/v1/dashboard/board` - return tasks grouped by status columns (todo, doing, blocked, done, delayed)
    - Support filters: requirement_id, owner_id
    - Each task includes title, owner name, priority, due_date
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x]* 11.2 Write property test for Kanban board grouping
    - **Property 17: Kanban board grouping correctness**
    - **Validates: Requirements 7.1, 7.3, 7.4**

  - [x] 11.3 Implement frontend Kanban Board page
    - Build FilterBar (requirement, assignee filters)
    - Build KanbanBoard with KanbanColumn components (todo, doing, blocked, done, delayed)
    - Build TaskCard showing title, owner, priority, due_date
    - Auto-refresh on WebSocket task.status_changed event
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 11.4 Implement Report generation endpoint (async AI job)
    - `POST /api/v1/reports/generate` - submit report generation AI job (type: daily/weekly/stage, date range)
    - On AI job success: save report with ai_generated=true, use transaction for report + AI call log
    - `GET /api/v1/reports` - paginated report list
    - `GET /api/v1/reports/:id` - report detail
    - `PUT /api/v1/reports/:id` - edit report, update modification timestamp
    - Emit report.generated event via outbox
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 11.5 Implement frontend Reports page
    - Build ReportFilterBar (type, date range)
    - Build ReportList with pagination
    - Build ReportEditor for editing generated reports
    - Build ReportPreview with Markdown export
    - Implement AI job submission → polling → result display for report generation
    - Auto-refresh on WebSocket report.generated event
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 12. Dashboard and Alert System
  - Auto-refresh on WebSocket alert.created event

  - [x] 12.1 Implement Alert detection service
    - Detect overdue tasks (past due_date and status ≠ done) → create alert type=delay
    - Detect tasks blocked > 24 hours → create alert type=blocked
    - Detect member workload exceeding available_hours_per_week → create alert type=overload
    - Use transaction for alert creation
    - Deduplication: same alert type for same entity within threshold period
    - Emit alert.created events via outbox
    - _Requirements: 9.4, 9.5, 9.6_

  - [x]* 12.2 Write property test for alert detection correctness
    - **Property 18: Alert detection correctness**
    - **Validates: Requirements 9.4, 9.5, 9.6**

  - [x] 12.3 Implement Dashboard backend endpoint
    - `GET /api/v1/dashboard` - return overview cards (total requirements, active tasks, completed tasks, overdue tasks)
    - Return task status distribution data for chart
    - Return member workload distribution
    - Return active alerts list
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 12.4 Implement frontend Dashboard page
    - Build OverviewCards (requirements count, active/completed/overdue tasks)
    - Build TaskStatusChart (pie/bar chart of status distribution)
    - Build MemberLoadList showing workload per member
    - Build AlertList showing active alerts with severity
    - Auto-refresh on WebSocket alert.created event
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 13. Checkpoint - Kanban, Reports, and Dashboard
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Notification Center and Audit Logs
  - Notifications for task assignment, alerts, AI job completion
  - Audit logs for all critical state changes

  - [x] 14.1 Create notifications and audit_logs Prisma schema and migration
    - Add `notifications` table: id, receiver_id, notification_type, title, content, ref_type, ref_id, is_read, read_at, created_at
    - Add `audit_logs` table: id, entity_type, entity_id, operation, operator_id, before_snapshot, after_snapshot, request_id, created_at
    - Run Prisma migration
    - _Requirements: 5.2, 11.4_

  - [x] 14.2 Implement Notification service and endpoints
    - Create notifications on: task assignment, alert creation, AI job completion
    - `GET /api/v1/notifications` - paginated notification list for current user
    - `POST /api/v1/notifications/:id/read` - mark notification as read
    - `POST /api/v1/notifications/read-all` - mark all as read
    - Emit notification.created event via outbox
    - _Requirements: 5.2_

  - [x] 14.3 Implement Audit log service
    - Create audit log entries for: task status changes, requirement updates, user role changes, task assignments
    - Record before_snapshot and after_snapshot for each operation
    - Include request_id and operator_id for traceability
    - _Requirements: 11.4_

  - [x] 14.4 Implement frontend Notification center
    - Build notification bell icon with unread count badge
    - Build notification dropdown/drawer with list
    - Mark as read on click
    - Auto-refresh on WebSocket notification.created event
    - _Requirements: 5.2_

- [x] 15. User and Permission Management
  - Admin-only endpoints for user CRUD

  - [x] 15.1 Implement User management endpoints
    - `POST /api/v1/users` - create user with hashed password and role (admin only)
    - `GET /api/v1/users` - paginated user list (admin only)
    - `PUT /api/v1/users/:id` - update user role/status (admin only)
    - `PUT /api/v1/users/:id/deactivate` - deactivate user (prevent login, preserve data)
    - Validate username and email uniqueness
    - Immediately apply new permissions on role change
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x]* 15.2 Write property tests for user management
    - **Property 19: User uniqueness constraint**
    - **Property 20: Deactivated user cannot authenticate**
    - **Validates: Requirements 10.3, 10.4**

  - [x] 15.3 Implement frontend Admin Users page
    - Build UserTable with pagination and status filter
    - Build UserFormDrawer for create/edit user
    - Build MemberProfileEditor for managing skills, workload, availability
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 16. Final Checkpoint - Full System Integration
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all state machines enforce correct transitions
  - Verify all AI jobs use async pattern
  - Verify all events are emitted via outbox
  - Verify frontend auto-refreshes on relevant events

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- ALL AI capabilities use async job pattern (ai_jobs table) — no synchronous AI blocking
- ALL state transitions enforced by centralized domain layer state machines
- ALL critical writes use transactions + idempotency keys + audit logs
- ALL events use outbox pattern for guaranteed delivery
- Frontend auto-refreshes via WebSocket for board/dashboard/alerts, polling for AI jobs
- API versioning: all endpoints under `/api/v1/`
- Module isolation strictly enforced between all 12 backend modules

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.5"] },
    { "id": 2, "tasks": ["1.4", "1.6", "1.7"] },
    { "id": 3, "tasks": ["1.8", "2.1", "2.3", "2.4"] },
    { "id": 4, "tasks": ["2.2", "2.5", "4.1", "5.1"] },
    { "id": 5, "tasks": ["4.2", "4.3", "5.2", "5.4"] },
    { "id": 6, "tasks": ["4.4", "4.5", "4.6", "4.7", "5.3"] },
    { "id": 7, "tasks": ["6.1", "6.3", "8.1"] },
    { "id": 8, "tasks": ["6.2", "8.2", "8.3"] },
    { "id": 9, "tasks": ["8.4", "8.5", "8.7"] },
    { "id": 10, "tasks": ["8.6", "8.8", "8.9"] },
    { "id": 11, "tasks": ["8.10", "8.11", "8.12"] },
    { "id": 12, "tasks": ["10.1", "10.2", "10.3", "10.4", "10.5"] },
    { "id": 13, "tasks": ["11.1", "11.4", "12.1", "14.1"] },
    { "id": 14, "tasks": ["11.2", "11.3", "11.5", "12.2", "12.3"] },
    { "id": 15, "tasks": ["12.4", "14.2", "14.3", "15.1"] },
    { "id": 16, "tasks": ["14.4", "15.2", "15.3"] }
  ]
}
```
