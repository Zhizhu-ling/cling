# Requirements Document

## Introduction

YourBot 智能团队任务协同助手（Web 版）是一个面向团队管理者的 Web 管理仪表盘。该系统允许团队负责人创建需求、利用 AI 将需求拆解为任务树、将任务分配给团队成员、通过看板追踪进度，并生成管理报告。本文档定义了 MVP 阶段的核心功能需求。

## Glossary

- **System**: The YourBot Web management dashboard application
- **Auth_Module**: The authentication and authorization subsystem handling JWT-based login and role verification
- **Requirement_Module**: The subsystem managing requirement creation, listing, filtering, and lifecycle
- **AI_Service**: The encapsulated AI service layer responsible for task decomposition, assignment suggestions, and report generation
- **Task_Module**: The subsystem managing task lifecycle, status transitions, assignment, and dispatch
- **Board_Module**: The kanban board subsystem displaying task progress across columns
- **Report_Module**: The subsystem for generating, editing, and exporting management reports
- **Alert_Module**: The subsystem for detecting and surfacing delay, blocked, and overload warnings
- **User**: A person with an account in the system, having one of three roles: admin, manager, or member
- **Manager**: A user with the manager role who can create requirements, assign tasks, and view reports
- **Member**: A user with the member role who can update task status and view assigned tasks
- **Admin**: A user with the admin role who can manage users and permissions
- **Requirement**: A business requirement document containing title, background, objective, constraints, deliverables, priority, and due date
- **Task**: A work item decomposed from a requirement, containing title, description, status, owner, estimated hours, and acceptance criteria
- **Task_Tree**: A hierarchical structure of tasks decomposed from a single requirement, with parent-child relationships and dependencies
- **Kanban_Board**: A visual board with columns (todo, doing, blocked, done, delayed) showing task progress
- **Report**: An AI-generated management report (daily, weekly, or stage) that is editable and exportable
- **MemberProfile**: A record of a member's skills, workload, availability, and historical performance
- **AiCallLog**: A record of each AI service invocation including prompt, response, latency, and token usage

## Requirements

### Requirement 1: User Authentication and Authorization

**User Story:** As a user, I want to log in with my credentials and access features appropriate to my role, so that the system remains secure and each user sees only what they are permitted to.

#### Acceptance Criteria

1. WHEN a user submits valid credentials (username and password), THE Auth_Module SHALL return a JWT token and the user's role information
2. WHEN a user submits invalid credentials, THE Auth_Module SHALL reject the login attempt and return an unauthorized error without revealing which field is incorrect
3. WHILE a user session is active with a valid JWT token, THE System SHALL allow access to role-appropriate API endpoints
4. WHEN a JWT token expires or is invalid, THE Auth_Module SHALL reject the request with a 40101 unauthorized error code
5. WHILE a user has the admin role, THE System SHALL grant access to user management endpoints
6. WHILE a user has the manager role, THE System SHALL grant access to requirement creation, task assignment, kanban viewing, and report generation endpoints
7. WHILE a user has the member role, THE System SHALL restrict access to only task viewing, task status updating, and personal workspace endpoints
8. WHEN the Auth_Module hashes a password, THE Auth_Module SHALL use bcrypt with a minimum cost factor of 10

### Requirement 2: Requirement Creation and Management

**User Story:** As a manager, I want to create and manage business requirements with structured fields, so that I can clearly communicate project needs to the team and AI system.

#### Acceptance Criteria

1. WHEN a manager submits a new requirement with all required fields (title, background, objective, deliverables, priority, due_date), THE Requirement_Module SHALL create the requirement and return its unique identifier
2. WHEN a manager submits a requirement with missing required fields, THE Requirement_Module SHALL reject the submission with a 40001 validation error specifying which fields are missing
3. WHEN a manager requests the requirement list, THE Requirement_Module SHALL return a paginated list supporting filtering by status and priority, and sorting by created date or due date
4. WHEN a manager updates an existing requirement, THE Requirement_Module SHALL persist the changes and update the modification timestamp
5. THE Requirement_Module SHALL validate that priority is one of: critical, high, medium, low
6. THE Requirement_Module SHALL validate that due_date is a future date at the time of creation

### Requirement 3: AI Task Decomposition

**User Story:** As a manager, I want the system to use AI to decompose a requirement into a structured task tree, so that I can quickly plan work breakdown without manual effort.

#### Acceptance Criteria

1. WHEN a manager triggers AI decomposition for a requirement, THE AI_Service SHALL generate a task tree containing tasks with title, description, estimated hours, dependencies, and acceptance criteria
2. WHEN the AI_Service generates a task tree, THE System SHALL present the result to the manager for review without persisting it to the database
3. WHEN a manager confirms the AI-generated task tree, THE Task_Module SHALL persist all tasks with their parent-child relationships and dependencies
4. WHEN a manager rejects or modifies the AI-generated task tree, THE System SHALL allow editing before confirmation
5. WHEN the AI_Service is invoked for decomposition, THE System SHALL log the call in AiCallLog with prompt text, model name, response, token usage, and latency in milliseconds
6. IF the AI_Service fails or times out during decomposition, THEN THE System SHALL return a 50002 AI error code and log the failure in AiCallLog

### Requirement 4: AI Task Assignment Suggestions

**User Story:** As a manager, I want the system to recommend task assignees based on member profiles, so that I can make informed assignment decisions quickly.

#### Acceptance Criteria

1. WHEN a manager requests assignment suggestions for a set of tasks, THE AI_Service SHALL analyze member profiles (skills, workload, availability, historical success rate) and return ranked assignee recommendations for each task
2. WHEN the AI_Service generates assignment suggestions, THE System SHALL present recommendations with reasoning explanations (ai_reason field) for each suggestion
3. WHEN the AI_Service is invoked for assignment suggestions, THE System SHALL log the call in AiCallLog with prompt text, model name, response, token usage, and latency in milliseconds
4. IF the AI_Service fails during assignment suggestion, THEN THE System SHALL return a 50002 AI error code and allow the manager to assign tasks manually

### Requirement 5: Task Dispatch and Notification

**User Story:** As a manager, I want to confirm task assignments and notify team members, so that everyone knows their responsibilities and can begin work.

#### Acceptance Criteria

1. WHEN a manager confirms a task assignment for a member, THE Task_Module SHALL update the task owner_id, set status to todo, and record the assignment timestamp
2. WHEN a task is dispatched to a member, THE System SHALL create a notification for the assigned member
3. WHEN a manager dispatches multiple tasks in batch, THE Task_Module SHALL process all assignments atomically and notify all affected members
4. THE Task_Module SHALL validate that the assigned member exists and has an active account status before accepting the assignment

### Requirement 6: Task Status Management

**User Story:** As a member, I want to update my task status and progress, so that the team can track work completion in real time.

#### Acceptance Criteria

1. WHEN a member updates a task status, THE Task_Module SHALL validate that the new status is one of: todo, doing, blocked, done, delayed
2. WHEN a task status changes, THE Task_Module SHALL create a TaskStatusLog entry with the previous status, new status, progress percentage, optional note, and the user who made the change
3. WHEN a member marks a task as blocked, THE Task_Module SHALL require a blocked_reason in the status log
4. WHEN a member marks a task as done, THE Task_Module SHALL set the completed_at timestamp and progress to 100 percent
5. WHEN a member updates task progress, THE Task_Module SHALL validate that progress_percent is between 0 and 100 inclusive
6. THE Task_Module SHALL restrict task status updates to the task owner or a user with manager or admin role

### Requirement 7: Progress Kanban Board

**User Story:** As a manager, I want to view team task progress on a kanban board, so that I can quickly assess team workload and identify blockers.

#### Acceptance Criteria

1. WHEN a manager requests the kanban board, THE Board_Module SHALL return tasks grouped by status columns: todo, doing, blocked, done, delayed
2. WHEN the kanban board is displayed, THE Board_Module SHALL show each task with its title, owner name, priority, and due date
3. WHEN a manager filters the kanban board by requirement or assignee, THE Board_Module SHALL return only matching tasks in their respective columns
4. WHEN a task status changes, THE Board_Module SHALL reflect the updated position on the next board request

### Requirement 8: Report Generation

**User Story:** As a manager, I want to generate AI-powered management reports, so that I can communicate team progress and risks to stakeholders efficiently.

#### Acceptance Criteria

1. WHEN a manager requests report generation specifying type (daily, weekly, or stage) and date range, THE Report_Module SHALL invoke the AI_Service to generate a report containing summary, detailed content, and risk summary
2. WHEN the AI_Service generates a report, THE Report_Module SHALL save it with ai_generated flag set to true and associate it with the requesting user
3. WHEN a manager edits a generated report, THE Report_Module SHALL persist the changes and update the modification timestamp
4. WHEN a manager exports a report, THE Report_Module SHALL produce the report content in Markdown format
5. WHEN the AI_Service is invoked for report generation, THE System SHALL log the call in AiCallLog with prompt text, model name, response, token usage, and latency in milliseconds
6. IF the AI_Service fails during report generation, THEN THE System SHALL return a 50002 AI error code and log the failure

### Requirement 9: Dashboard Overview

**User Story:** As a manager, I want to see a dashboard with key metrics and alerts, so that I can quickly understand team status and respond to issues.

#### Acceptance Criteria

1. WHEN a manager accesses the dashboard, THE System SHALL display overview cards showing total requirements count, active tasks count, completed tasks count, and overdue tasks count
2. WHEN a manager accesses the dashboard, THE System SHALL display a task status distribution chart
3. WHEN a manager accesses the dashboard, THE System SHALL display member workload distribution
4. WHEN the Alert_Module detects a task is overdue (past due_date and not done), THE Alert_Module SHALL create an alert with type delay and appropriate severity
5. WHEN the Alert_Module detects a task has been blocked for more than 24 hours, THE Alert_Module SHALL create an alert with type blocked
6. WHEN the Alert_Module detects a member's current workload exceeds available hours per week, THE Alert_Module SHALL create an alert with type overload

### Requirement 10: User and Permission Management

**User Story:** As an admin, I want to manage user accounts and roles, so that I can control system access and maintain organizational structure.

#### Acceptance Criteria

1. WHEN an admin creates a new user, THE System SHALL store the user with a hashed password and the specified role
2. WHEN an admin updates a user's role, THE System SHALL immediately apply the new permissions on subsequent requests
3. WHEN an admin deactivates a user account, THE System SHALL prevent that user from logging in while preserving historical data
4. THE System SHALL validate that username and email are unique across all users

### Requirement 11: API Response Consistency and Logging

**User Story:** As a developer, I want all API responses to follow a unified format and all state changes to be logged, so that the system is predictable and auditable.

#### Acceptance Criteria

1. THE System SHALL return all API responses in the format: { code, message, data, request_id }
2. THE System SHALL use error codes: 0 for success, 40001 for validation errors, 40101 for unauthorized, 40301 for forbidden, 40401 for not found, 50001 for server errors, 50002 for AI errors
3. WHEN any list API is called, THE System SHALL support pagination parameters (page, page_size) with defaults of page=1 and page_size=20
4. THE System SHALL include a unique request_id in every API response for tracing purposes
