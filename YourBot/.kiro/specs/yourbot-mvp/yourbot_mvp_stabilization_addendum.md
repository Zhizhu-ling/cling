# YourBot MVP Stabilization Addendum

> 目的：补齐当前任务文档中对 AI 稳定性、状态一致性、前后端事件同步、数据一致性和长期可维护性不足的部分，确保 Kiro 后续生成的代码能够直接落地，并且便于后续维护与重构。

---

## 1. 目标

本补充文档用于解决以下五类问题：

1. **AI 功能“能跑但不稳定”**
2. **状态逻辑越来越乱**
3. **前后端事件不同步**
4. **数据一致性问题**
5. **后期重构困难**

本补充文档不是替代原有 `requirements.md / design.md / tasks.md`，而是作为**实施约束层**追加到任务文档之前，要求 Kiro 在生成代码和任务时必须遵守。

---

## 2. 总体原则

### 2.1 架构原则
- 系统采用**模块化单体（Modular Monolith）**实现 MVP。
- 所有业务变更通过**服务层**完成，禁止前端直接拼接数据库字段逻辑。
- AI 能力必须通过**异步作业（Async Job）**执行，禁止将大模型调用作为强同步阻塞请求的唯一实现方式。
- 所有状态变更必须经过**明确的状态机校验**。
- 前后端事件必须通过**统一事件协议**同步。
- 关键写操作必须满足**幂等、事务、审计**三项要求。

### 2.2 代码原则
- 类型先行：所有 DTO、VO、Schema、Event 都必须显式定义。
- 单一事实来源：任务状态、报告状态、AI Job 状态都必须有唯一主状态源。
- 可追踪：所有关键操作必须能追溯到 `request_id`、`operator_id`、`event_id`、`job_id`。
- 可恢复：AI 失败、任务更新失败、事件投递失败必须可重试或回滚。
- 可演进：所有对外输出均要版本化，避免后续重构时破坏兼容性。

---

## 3. AI 稳定性加固方案

### 3.1 问题描述
当前 AI 相关能力包括需求拆解、任务分配建议、报告生成。  
如果直接同步调用模型，容易出现以下问题：
- 响应耗时不稳定
- 结果格式不稳定
- 超时后用户体验差
- 失败后难以重试
- 解析失败后难以定位问题

### 3.2 解决方案
AI 能力必须改造为“**提交作业 → 异步处理 → 轮询/订阅结果 → 前端展示**”的工作流。

### 3.3 AI Job 模型
新增 `ai_jobs` 表，作为 AI 任务的统一执行记录。

#### ai_jobs 字段建议
- `id`
- `job_type`：`requirement_split | assignment_suggest | report_generate`
- `status`：`pending | running | success | fail | canceled`
- `request_id`
- `biz_ref_id`：关联需求、任务或报告
- `input_payload`：输入上下文 JSON
- `output_payload`：输出结果 JSON
- `raw_response`：模型原始返回
- `prompt_version`
- `schema_version`
- `retry_count`
- `max_retry`
- `error_message`
- `created_by`
- `created_at`
- `started_at`
- `completed_at`

### 3.4 AI 执行方式
1. 前端提交 AI 请求。
2. 后端创建 `ai_jobs` 记录，状态为 `pending`。
3. 后端将任务投递到队列。
4. Worker 消费队列，状态改为 `running`。
5. Worker 调用模型并校验 JSON 输出。
6. 校验成功则写入结果，状态改为 `success`。
7. 校验失败或超时则重试，超限后状态改为 `fail`。
8. 前端通过轮询或 WebSocket 获取最终结果。

### 3.5 AI 输出要求
所有 AI 输出必须满足以下要求：
- 只允许返回结构化 JSON
- 必须包含 `schema_version`
- 必须包含业务主键引用
- 必须包含 `confidence` 或 `reason`
- 必须可被后端 Zod 或 class-validator 校验
- 若 JSON 无法解析，必须重试一次；若仍失败，写入失败日志并返回可读错误

### 3.6 AI 重试策略
- 网络失败：自动重试 2 次
- 解析失败：自动重试 1 次
- 模型超时：自动重试 1 次
- 业务校验失败：不重试，直接失败并保留原始返回

### 3.7 AI 容错策略
- 任何 AI 作业失败，不得影响主业务数据的提交与保存。
- 需求创建、任务保存、任务状态更新等主流程必须优先成功。
- AI 结果作为辅助建议，不得成为阻塞主流程的唯一条件。

---

## 4. 状态机加固方案

### 4.1 问题描述
目前任务、需求、报告、AI Job 都存在“状态枚举已定义，但转移规则不完整”的风险。  
如果状态机不严格，后续会出现：
- 状态乱跳
- 前后端判断不一致
- 非法操作写入数据库
- 看板和详情页显示冲突

### 4.2 统一状态机原则
所有核心业务实体必须满足：
- 状态枚举明确
- 状态转移规则明确
- 非法转移必须拒绝
- 每次状态变化必须记录日志
- 前端按钮展示必须跟状态机保持一致

### 4.3 Task 状态机
#### 允许状态
- `todo`
- `doing`
- `blocked`
- `delayed`
- `done`

#### 允许转移
- `todo -> doing`
- `doing -> blocked`
- `doing -> delayed`
- `doing -> done`
- `blocked -> doing`
- `delayed -> doing`

#### 禁止转移
- `done -> doing`
- `done -> blocked`
- `blocked -> done`（需先回到 doing）
- `todo -> done`（除非管理员强制关闭，需单独审批流程）

#### 规则要求
- 当任务进入 `done`，必须自动写入 `completed_at`。
- 当任务进入 `blocked`，必须填写 `blocked_reason`。
- 当任务进入 `done`，`progress_percent` 必须变为 100。
- `progress_percent` 必须始终在 0~100 范围内。

### 4.4 Requirement 状态机
#### 允许状态
- `draft`
- `analyzing`
- `split_done`
- `assigned`
- `in_progress`
- `closed`

#### 允许转移
- `draft -> analyzing`
- `analyzing -> split_done`
- `split_done -> assigned`
- `assigned -> in_progress`
- `in_progress -> closed`

#### 禁止转移
- `closed -> in_progress`
- `split_done -> draft`
- `assigned -> split_done`
- `closed -> assigned`

### 4.5 AI Job 状态机
#### 允许状态
- `pending`
- `running`
- `success`
- `fail`
- `canceled`

#### 允许转移
- `pending -> running`
- `running -> success`
- `running -> fail`
- `pending -> canceled`

#### 禁止转移
- `success -> running`
- `fail -> success`
- `canceled -> running`

### 4.6 状态机实现要求
- 状态机规则必须集中放在统一的 domain 层。
- 不允许在 controller 中手写状态判断。
- 不允许前端单独决定状态是否合法。
- 前端只负责展示和发起请求，合法性必须以后端为准。

---

## 5. 前后端事件同步方案

### 5.1 问题描述
如果前后端只靠“请求后刷新页面”同步，会带来：
- 看板不实时
- 任务分配后成员端不及时感知
- 报告生成完成后用户无法即时看到
- AI Job 处理完成后前端不知道什么时候刷新

### 5.2 统一事件模型
系统必须定义统一事件总线，事件名称、载荷结构、触发条件都要标准化。

### 5.3 事件列表
以下事件必须实现：

- `task.created`
- `task.updated`
- `task.assigned`
- `task.status_changed`
- `task.blocked`
- `task.done`
- `requirement.created`
- `requirement.split_done`
- `ai_job.created`
- `ai_job.running`
- `ai_job.success`
- `ai_job.fail`
- `report.generated`
- `alert.created`
- `alert.resolved`
- `notification.created`

### 5.4 事件载荷统一格式
所有事件必须至少包含：

```json
{
  "event_id": "uuid",
  "event_type": "task.updated",
  "request_id": "uuid",
  "timestamp": "2026-05-27T12:00:00Z",
  "actor_id": 123,
  "entity_type": "task",
  "entity_id": 456,
  "payload": {}
}
```

### 5.5 事件投递机制
- 后端业务成功后，先写数据库事务。
- 数据提交成功后，再投递领域事件。
- 事件投递失败不得影响主事务提交。
- 事件必须可重放、可追踪。

### 5.6 前端同步方式
前端必须支持以下两种同步策略之一，MVP 推荐优先使用 WebSocket：
1. **WebSocket 实时订阅**
2. **轮询补偿**

#### 推荐策略
- AI Job：轮询 `GET /api/ai/jobs/:id`
- Board / Dashboard / Alerts：WebSocket 实时刷新
- 报告生成结果：WebSocket 通知 + 页面主动刷新

### 5.7 前端刷新规则
- 收到 `task.status_changed` 时，自动刷新任务详情和看板。
- 收到 `alert.created` 时，自动刷新预警列表和仪表盘。
- 收到 `report.generated` 时，自动刷新报告列表。
- 收到 `ai_job.success` 时，自动刷新 AI 结果页。

---

## 6. 数据一致性方案

### 6.1 问题描述
当前系统中涉及多个写入点：
- 需求创建
- AI 拆解确认
- 任务分配
- 状态更新
- 报告生成
- 预警创建

如果没有事务与幂等控制，会出现：
- 重复创建任务
- 任务已分配但日志缺失
- AI 结果写入成功但主表未更新
- 前端重复点击导致重复提交
- 报告生成多次覆盖

### 6.2 事务规则
所有如下操作必须使用数据库事务：
- 任务确认持久化
- 批量任务分配
- 状态更新与日志写入
- 报告生成与保存
- 预警创建与关联

### 6.3 幂等规则
所有高频写接口必须支持幂等键：
- `X-Idempotency-Key`
- 后端基于该键去重重复请求
- 同一个幂等键在有效期内只允许成功处理一次

### 6.4 Outbox 方案
对于必须保证最终一致性的事件投递，建议采用 Outbox 模式：
1. 主业务事务成功时，同时写 `outbox_events` 表。
2. 后台 worker 定时扫描 `outbox_events`。
3. 成功发送事件后标记为已发送。
4. 避免“数据库成功但事件丢失”的问题。

### 6.5 核心一致性规则
- 任务 owner_id、status、status_log 必须在同一事务中更新。
- 任务树确认时，父子关系、任务列表、依赖关系必须一次性落库。
- 报告生成时，报告正文和 AI 调用日志必须一起保存。
- 预警创建必须确保不会重复插入同一类重复告警。

### 6.6 去重规则
以下场景必须去重：
- 同一任务的同一状态重复提交
- 同一 AI Job 重试后的重复结果写入
- 同一条预警在阈值周期内重复生成
- 同一批任务分配请求重复提交

---

## 7. 可维护性与重构约束

### 7.1 问题描述
如果系统没有边界和版本控制，后续会出现：
- AI prompt 改动影响所有页面
- DTO 改动导致前后端联动崩溃
- 页面组件与业务逻辑耦合过强
- 无法替换模型或增加新功能

### 7.2 模块边界约束
以下模块必须严格隔离：
- `auth`
- `user`
- `requirement`
- `task`
- `ai`
- `report`
- `alert`
- `dashboard`
- `notification`
- `realtime`
- `audit`
- `outbox`

禁止跨模块直接访问内部实现细节，只允许通过服务接口或事件。

### 7.3 接口版本化
所有对外 API 必须版本化，例如：
- `/api/v1/auth/login`
- `/api/v1/requirements`
- `/api/v1/tasks`

若后续要变更字段或行为，优先新增版本，不直接破坏旧版本。

### 7.4 AI Prompt 版本化
每一种 AI 场景都必须有：
- `prompt_version`
- `schema_version`
- `template_name`

Prompt 修改时不得直接覆盖旧版本，应新增版本号以便回溯。

### 7.5 DTO 与 Schema 版本化
- 前端表单 DTO
- 后端请求 DTO
- AI 输出 Schema
- DB migration

都必须有版本意识，避免后续大改时无法回滚。

### 7.6 目录结构建议
后端建议采用：
- `modules/*`
- `common/*`
- `domain/*`
- `infra/*`
- `events/*`
- `jobs/*`
- `schemas/*`

前端建议采用：
- `pages/*`
- `components/*`
- `store/*`
- `api/*`
- `hooks/*`
- `schemas/*`
- `services/*`

---

## 8. 必须新增的数据表

### 8.1 ai_jobs
用于 AI 异步执行。

### 8.2 outbox_events
用于事件最终一致性。

#### 字段建议
- `id`
- `event_type`
- `aggregate_type`
- `aggregate_id`
- `payload`
- `status`
- `retry_count`
- `next_retry_at`
- `created_at`
- `sent_at`

### 8.3 notifications
用于消息中心。

#### 字段建议
- `id`
- `receiver_id`
- `notification_type`
- `title`
- `content`
- `ref_type`
- `ref_id`
- `is_read`
- `read_at`
- `created_at`

### 8.4 audit_logs
用于审计追踪。

#### 字段建议
- `id`
- `entity_type`
- `entity_id`
- `operation`
- `operator_id`
- `before_snapshot`
- `after_snapshot`
- `request_id`
- `created_at`

---

## 9. 编码实现顺序建议

为了降低重构成本，建议 Kiro 按以下顺序实现：

1. 基础设施：统一响应、异常处理、鉴权、日志
2. 状态机：Task / Requirement / AI Job
3. AI Job 异步队列
4. Outbox 与事件总线
5. 前端实时订阅与轮询
6. 任务与需求主流程
7. 看板与报告
8. 通知中心与审计日志
9. 最后再做体验优化

---

## 10. 交付给 AI / Kiro 的提示词

以下提示词可以直接交给 AI，让其理解本补充文档的执行要求。

---

### 10.1 系统级提示词

```text
你正在开发一个团队任务协同助手 Web 系统。你必须优先保证系统稳定性、一致性和可维护性，而不是只追求功能可用。

请严格遵守以下规则：
1. AI 功能必须异步化，使用 ai_jobs 作为统一作业模型，禁止直接同步阻塞主流程。
2. 所有任务、需求、AI Job、报告都必须遵守明确的状态机，非法状态转移必须拒绝。
3. 前后端事件必须通过统一事件协议同步，关键事件需要包含 event_id、request_id、timestamp、entity_type、entity_id 和 payload。
4. 所有关键写操作必须支持事务、幂等和审计。
5. 所有对外接口必须使用统一响应格式 { code, message, data, request_id }。
6. 所有 AI 输出必须是可验证的 JSON，必须通过 schema 校验。
7. 任何 AI 失败不得阻塞主业务流程，必须可重试、可追踪、可恢复。
8. 代码必须模块化，禁止在 controller 中编写复杂业务逻辑。
9. 所有提示词、DTO、Schema、接口都必须可版本化。
10. 前端必须支持 loading、empty、error 和 retry 状态。

你的目标不是“让代码能跑”，而是“让系统在真实团队协作场景中可持续运行、可维护、可扩展”。
```

---

### 10.2 AI 作业提示词

```text
你是一个 AI 作业执行器，负责处理需求拆解、任务分配建议和报告生成。

输入中会包含：
- job_type
- prompt_version
- schema_version
- biz_ref_id
- business_context
- constraints
- expected_output_schema

你的任务：
1. 只输出符合 schema 的 JSON。
2. 如果信息不足，返回结构化的待确认项，不要编造。
3. 如果输出无法通过 schema 校验，主动修正后再返回。
4. 如果仍然无法修正，返回 failable_reason，并交给后端重试或失败处理。
5. 结果必须包含 confidence、reason 或 equivalent 字段。
6. 输出内容必须可直接用于系统落库或展示。

请不要输出无关解释、不要输出自然语言长段落、不要输出 Markdown 包裹内容。
```

---

### 10.3 状态机执行提示词

```text
你正在实现一个具备严格状态机的管理系统。

请遵守：
1. 所有实体的状态转移必须按预定义状态机执行。
2. 如果当前状态到目标状态不合法，必须拒绝并返回清晰错误。
3. 对每次状态变更都要记录日志。
4. 前端展示必须与后端状态机完全一致。
5. 禁止通过前端按钮逻辑绕过后端校验。

你必须优先保证状态一致性，而不是图省事直接更新字段。
```

---

### 10.4 事件同步提示词

```text
你正在实现一个前后端事件同步系统。

请遵守：
1. 所有业务事件必须通过统一事件模型发布。
2. 事件必须包含 event_id、event_type、request_id、timestamp、actor_id、entity_type、entity_id 和 payload。
3. 事件投递失败不得影响主事务。
4. 前端必须能够通过 WebSocket 或轮询接收并刷新最新状态。
5. 事件名称、载荷结构和处理方式必须保持版本化。

请确保前后端看到的是同一份事实，而不是各自猜测的状态。
```

---

## 11. 结论

本补充文档的目标是把 YourBot MVP 从“可以演示”提升为“可以长期稳定运行”的工程系统。

如果后续继续由 Kiro 生成代码，请要求其：
- 优先实现 AI 异步作业模型
- 优先实现状态机和事务
- 优先实现事件与一致性
- 再实现页面和交互
- 最后优化体验与外观

---

## 12. 推荐下一步

建议让 Kiro 基于本补充文档，先重新生成一版：
1. `architecture_addendum.md`
2. `backend_infra_tasks.md`
3. `realtime_and_consistency_tasks.md`

然后再进入编码阶段。
