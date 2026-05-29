# 智能团队任务协同助手（Web 版）MVP 代码生成说明
版本：v2.0  
适用对象：Kiro / AI 编程助手 / 前后端开发团队  
目标：把需求写到“可直接生成代码”的粒度  
范围：阶段 1 - MVP（Web 管理后台）

---

## 1. 产品结论

本系统先做 **网页版本（Web App / 管理后台）**，不是原生 App。

### 为什么是 Web 版本
- 团队负责人主要在电脑端完成需求创建、任务拆解、任务分配、进度查看和报告生成。
- 表格、看板、详情页、报告编辑器等管理能力更适合 Web。
- Web 版本便于后续接入企业内部系统、权限体系和桌面办公场景。
- 第一阶段优先追求“可用、可控、可迭代”，不追求移动端原生体验。

---

## 2. MVP 范围

### 2.1 本阶段必须实现
1. 登录 / 权限
2. 需求创建
3. AI 拆解
4. 任务分配建议
5. 任务下发
6. 进度看板
7. 报告生成

### 2.2 本阶段不做
- 原生 App
- 复杂绩效考核
- 自动监控员工电脑行为
- 复杂审批流
- 多组织 SaaS 计费
- 飞书 / 钉钉 / 企业微信深度集成
- 代码仓库自动联动
- 日程系统自动联动
- 复杂工时管理

### 2.3 本阶段预留但不强制实现
- 外部数据源接入接口
- AI 模型可替换机制
- 导出 PDF / Word
- 多语言支持
- 任务模板库
- 组织级统计分析

---

## 3. 推荐技术栈

> 如果 Kiro 没有默认技术栈，请按以下方案实现。

### 3.1 前端
- React + TypeScript
- Vite
- React Router
- Ant Design（或 Shadcn UI，二选一，不要混用）
- Zustand 或 Redux Toolkit（二选一）
- Axios
- ECharts（用于看板统计图表）

### 3.2 后端
- Node.js + NestJS（推荐）或 Express
- Prisma（推荐）或 TypeORM
- PostgreSQL（推荐）或 MySQL
- JWT 鉴权
- bcrypt 密码加密
- Zod / class-validator 做参数校验

### 3.3 AI 服务层
- 单独封装 `aiService`
- 不要把 AI 调用逻辑写死在 Controller 里
- 便于后续切换大模型或 prompt

---

## 4. 代码结构建议

```text
project-root/
  frontend/
    src/
      api/
      assets/
      components/
      layouts/
      pages/
        login/
        dashboard/
        requirements/
        tasks/
        reports/
        members/
        alerts/
      store/
      types/
      utils/
      hooks/
  backend/
    src/
      modules/
        auth/
        users/
        requirements/
        tasks/
        reports/
        dashboard/
        ai/
        alerts/
      common/
      config/
      prisma/
      main.ts
  docs/
  README.md
```

---

## 5. 核心业务对象

### 5.1 角色
- `admin`：系统管理员
- `manager`：团队负责人
- `member`：团队成员

### 5.2 业务对象
- 用户 `User`
- 成员画像 `MemberProfile`
- 需求 `Requirement`
- 任务 `Task`
- 任务状态日志 `TaskStatusLog`
- 预警 `Alert`
- 报告 `Report`
- AI 调用记录 `AiCallLog`

---

## 6. 页面与交互设计（前端页面级别说明）

---

# 6.1 登录页

## 路由
- `/login`

## 页面目标
完成用户登录，获取 token，根据角色跳转到不同首页。

## 页面布局
- 左侧：系统名称与产品介绍
- 右侧：登录表单

## UI 组件
- 系统标题
- 用户名输入框
- 密码输入框
- 登录按钮
- 错误提示区
- “记住我”勾选框（可选）

## 字段定义
| 字段 | 类型 | 必填 | 校验规则 |
|---|---|---:|---|
| username | string | 是 | 不能为空 |
| password | string | 是 | 长度 >= 6 |
| remember | boolean | 否 | 默认 false |

## 交互逻辑
1. 用户输入用户名和密码。
2. 点击“登录”后，前端先做基础校验。
3. 通过后调用 `POST /api/auth/login`。
4. 登录成功后保存 token 到本地存储。
5. 再调用 `GET /api/auth/me` 获取用户信息和角色。
6. 根据角色跳转：
   - `admin` / `manager` -> `/dashboard`
   - `member` -> `/tasks/my`

## 错误处理
- 用户名或密码为空：前端即时提示。
- 登录失败：显示“账号或密码错误”。
- 网络错误：显示“网络异常，请稍后重试”。

## 页面状态
- `idle`
- `loading`
- `error`
- `success`

---

# 6.2 首页 / 仪表盘

## 路由
- `/dashboard`

## 页面目标
快速查看团队总体状态、任务分布、预警情况和待处理事项。

## 页面布局
- 顶部：时间范围筛选、项目筛选
- 中部：概览卡片
- 左下：任务状态图
- 右下：成员负载榜
- 右侧：预警列表
- 顶部右侧：快捷按钮（新建需求、生成报告）

## UI 组件
- OverviewCards
- TaskStatusChart
- MemberLoadList
- AlertList
- QuickActionBar

## 概览卡片
建议展示：
- 需求数
- 任务总数
- 进行中任务
- 已完成任务
- 阻塞任务
- 延期任务

## 交互逻辑
1. 页面加载时请求 `GET /api/dashboard/board`.
2. 按当前筛选条件刷新数据。
3. 点击某个状态卡片可跳转到任务列表并自动套用筛选条件。
4. 点击预警项可进入对应任务详情页。
5. 点击“新建需求”进入需求创建页。
6. 点击“生成报告”进入报告中心并自动带入日期范围。

## 空状态
- 没有项目数据时显示引导文案。
- 没有预警时显示“当前无异常”。

---

# 6.3 需求管理页

## 路由
- `/requirements`

## 页面目标
创建、查看、编辑需求，进入 AI 拆解流程。

## 页面布局
- 上方：搜索 / 筛选 / 新建按钮
- 中间：需求列表表格
- 右侧或弹窗：需求详情

## UI 组件
- RequirementFilterBar
- RequirementTable
- RequirementFormModal / Drawer
- RequirementDetailPanel
- SplitButton

## 列表字段
- 需求标题
- 项目
- 优先级
- 截止时间
- 状态
- 创建人
- 更新时间

## 需求表单字段
| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| title | string | 是 | 需求标题 |
| background | string | 是 | 背景说明 |
| objective | string | 是 | 目标 |
| constraints | string | 否 | 约束条件 |
| deliverables | string[] / json | 是 | 交付物列表 |
| priority | number | 是 | 1-5 |
| due_date | string(date) | 是 | 截止时间 |
| project_id | number | 是 | 所属项目 |
| notes | string | 否 | 备注 |

## 交互逻辑
1. 点击“新建需求”打开表单。
2. 填写后点击保存，调用 `POST /api/requirements`。
3. 保存成功后在列表中显示该需求。
4. 点击某条需求可进入详情页或抽屉。
5. 点击“AI 拆解”进入拆解流程。

## 状态定义
- `draft`
- `analyzing`
- `split_done`
- `assigned`
- `in_progress`
- `closed`

## 错误处理
- 必填字段缺失：前端校验阻断提交。
- 后端校验失败：展示具体字段错误。
- 保存失败：提示重试。

---

# 6.4 AI 拆解结果页

## 路由
- `/requirements/:id/split`

## 页面目标
展示 AI 拆解出的任务树，允许管理者人工微调并确认。

## 页面布局
- 上方：需求摘要
- 中间：任务树 / 任务卡列表
- 右侧：任务编辑面板
- 底部：确认拆解按钮

## UI 组件
- RequirementSummaryCard
- TaskTreeView
- TaskEditDrawer
- ConfirmSplitButton
- PromptHintBox

## 拆解结果展示内容
每个任务至少包含：
- 任务标题
- 任务描述
- 优先级
- 预计工时
- 依赖任务
- 风险点
- 验收标准
- 推荐角色（可选）

## 交互逻辑
1. 用户点击“AI 拆解”。
2. 前端调用 `POST /api/requirements/:id/split`。
3. 后端返回拆解后的任务树 JSON。
4. 前端将任务树渲染为树形结构。
5. 管理者可编辑任务名称、描述、工期、优先级、依赖关系。
6. 确认后保存任务并进入分配页。

## 任务树操作
- 增加子任务
- 删除任务
- 修改任务信息
- 调整任务顺序
- 设置依赖
- 标记待确认项

## 页面状态
- `splitting`
- `split_ready`
- `editing`
- `confirmed`

## 需要特别处理
- 如果 AI 无法给出完整任务树，应返回“待确认问题”列表。
- 如果拆解结果太少，允许管理者手动继续拆分。
- 如果拆解结果中出现相互冲突依赖，提示用户修正。

---

# 6.5 任务分配建议页

## 路由
- `/tasks/assignment`

## 页面目标
基于成员画像和任务特征，为任务推荐负责人，并支持人工确认。

## 页面布局
- 左侧：任务列表
- 中间：推荐负责人卡片
- 右侧：成员画像详情 / 分配理由
- 顶部：筛选条件
- 底部：批量确认按钮

## UI 组件
- TaskAssignmentTable
- MemberRecommendCard
- MemberProfileDrawer
- AssignConfirmDialog

## 任务列表字段
- 任务名称
- 所属需求
- 预计工时
- 风险等级
- 当前建议负责人
- 分配状态

## 推荐结果字段
- 推荐负责人
- 备选负责人
- 匹配分数
- 推荐理由
- 风险说明
- 是否建议人工确认

## 交互逻辑
1. 页面加载时调用 `GET /api/tasks?status=unassigned`。
2. 用户选择某个任务后调用 `POST /api/tasks/assignment-suggest`。
3. 后端返回推荐负责人列表。
4. 前端展示推荐结果与原因。
5. 管理者可手动切换负责人。
6. 确认后调用 `POST /api/tasks/assign`。
7. 分配成功后任务进入已分配状态。

## 分配策略建议
前端无需实现算法，但应展示以下因素：
- 技能匹配
- 当前负载
- 可用时间
- 历史完成质量
- 是否适合该类型任务

---

# 6.6 任务下发页 / 任务详情页

## 路由
- `/tasks/:id`

## 页面目标
查看任务详情、下发给成员、查看状态历史和协作信息。

## 页面布局
- 顶部：任务基本信息
- 左侧：任务内容
- 右侧：状态卡、负责人、协作人、截止时间
- 下方：状态日志、备注、附件（可选）

## UI 组件
- TaskDetailHeader
- TaskMetaCard
- StatusTimeline
- CommentList
- AssignActionBar

## 页面展示字段
- 任务标题
- 关联需求
- 负责人
- 协作人
- 开始时间
- 截止时间
- 预计工时
- 状态
- 进度百分比
- 风险等级
- 验收标准
- AI 推荐理由

## 交互逻辑
1. 管理者确认分配后，任务进入下发状态。
2. 成员可在任务详情页查看任务要求。
3. 成员可以更新状态、补充备注、标记阻塞。
4. 每次更新会写入任务状态日志。

## 成员侧可做操作
- 接收任务
- 修改状态
- 填写进度说明
- 标记阻塞
- 上传文本备注（MVP 可先不做文件上传）

---

# 6.7 我的任务页（成员工作台）

## 路由
- `/tasks/my`

## 页面目标
成员快速查看自己负责的任务并更新进度。

## 页面布局
- 顶部：我的任务概览
- 中间：任务卡片列表
- 右侧：当前任务详情
- 底部：快速更新表单

## UI 组件
- MyTaskSummary
- MyTaskList
- TaskQuickUpdateForm
- TaskProgressBadge

## 交互逻辑
1. 页面加载调用 `GET /api/tasks?owner_id=me`。
2. 点击某个任务可展开详情。
3. 可以直接修改状态：
   - 未开始
   - 进行中
   - 阻塞
   - 已完成
   - 延期
4. 提交备注后调用 `POST /api/tasks/:id/status`。

## 体验要求
- 成员视角只看自己任务。
- 快速操作优先，减少填写成本。
- 阻塞时必须引导填写原因。

---

# 6.8 进度看板页

## 路由
- `/tasks/board`

## 页面目标
以 Kanban / 状态看板形式查看团队所有任务进度。

## 页面布局
- 顶部：筛选器
- 中间：看板列
- 右侧：任务详情抽屉
- 底部：统计信息

## UI 组件
- FilterBar
- KanbanBoard
- KanbanColumn
- TaskCard
- TaskDetailDrawer
- BoardSummaryStrip

## 看板列
- 未开始
- 进行中
- 阻塞
- 已完成
- 延期

## 任务卡片展示字段
- 任务名称
- 负责人
- 截止时间
- 进度百分比
- 风险标签
- 最近更新时间

## 交互逻辑
1. 页面加载调用 `GET /api/dashboard/board` 或 `GET /api/tasks/board`。
2. 支持按项目、需求、负责人、状态筛选。
3. 点击卡片打开详情抽屉。
4. 若任务超期则在卡片上显示红色延期标签。
5. 若任务超过一定时间未更新则显示“长期无更新”提示。

## 可选交互
- 拖拽任务卡在状态列之间移动（MVP 可选，若实现则需后端同步状态）
- 点击筛选器即时刷新

---

# 6.9 报告中心

## 路由
- `/reports`

## 页面目标
生成和查看日报 / 周报 / 阶段报告。

## 页面布局
- 顶部：报告类型和日期范围
- 左侧：报告列表
- 右侧：报告预览 / 编辑器
- 底部：导出和保存按钮

## UI 组件
- ReportFilterBar
- ReportList
- ReportEditor
- ReportPreview
- GenerateReportButton
- ExportButton

## 报告字段
| 字段 | 类型 | 说明 |
|---|---|---|
| report_type | string | daily / weekly / stage |
| date_range | string[] | 起止日期 |
| title | string | 标题 |
| content | string | 报告正文 |
| summary | string | 概要 |
| risk_summary | string | 风险总结 |
| ai_generated | boolean | 是否 AI 生成 |

## 交互逻辑
1. 用户选择报告类型和日期范围。
2. 点击“生成报告”。
3. 前端调用 `POST /api/reports/generate`。
4. 后端汇总任务和预警数据并调用 AI。
5. 返回报告草稿后可编辑。
6. 保存后写入 `reports` 表。
7. 支持导出 Markdown（MVP 必做），PDF（可选）。

## 编辑要求
- 支持标题编辑
- 支持正文编辑
- 支持对 AI 生成内容进行人工修订
- 保存后保留版本更新时间

---

# 6.10 用户与权限页（管理员）

## 路由
- `/admin/users`

## 页面目标
维护用户、角色和成员画像。

## 页面布局
- 顶部：筛选与新增
- 中间：用户表格
- 右侧：用户详情 / 编辑面板

## UI 组件
- UserTable
- UserFormDrawer
- RoleSelect
- MemberProfileEditor

## 管理内容
- 新增用户
- 修改角色
- 修改启用状态
- 编辑成员画像标签
- 编辑负载信息

---

## 7. 后端 API 设计（字段级别说明）

---

# 7.1 统一返回格式

所有 API 建议统一返回：

```json
{
  "code": 0,
  "message": "success",
  "data": {},
  "request_id": "uuid"
}
```

### 错误返回格式
```json
{
  "code": 40001,
  "message": "validation error",
  "data": {
    "field": "title",
    "reason": "required"
  },
  "request_id": "uuid"
}
```

### 状态码约定
- `0`：成功
- `40001`：参数校验失败
- `40101`：未登录或 token 失效
- `40301`：无权限
- `40401`：资源不存在
- `50001`：服务异常
- `50002`：AI 调用失败

---

# 7.2 登录接口

## POST `/api/auth/login`

### 请求体
```json
{
  "username": "admin",
  "password": "123456",
  "remember": true
}
```

### 字段说明
- `username`：登录账号
- `password`：密码明文，后端校验后再比对 hash
- `remember`：是否记住登录

### 响应体
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "jwt_token",
    "user": {
      "id": 1,
      "name": "负责人A",
      "username": "admin",
      "role": "manager"
    }
  }
}
```

---

## GET `/api/auth/me`

### 响应体
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "name": "负责人A",
    "username": "admin",
    "role": "manager",
    "avatar": "",
    "permissions": ["requirement:create", "task:assign"]
  }
}
```

---

## POST `/api/auth/logout`

### 作用
前端清除 token，后端可选记录退出日志。

---

# 7.3 需求接口

## POST `/api/requirements`

### 请求体
```json
{
  "project_id": 1,
  "title": "开发团队任务协同助手",
  "background": "团队成员较多，任务分配和进度跟踪困难",
  "objective": "构建一个可自动拆解任务并跟踪进度的 Web 系统",
  "constraints": "第一阶段仅实现 MVP",
  "deliverables": [
    "Web 页面",
    "后台接口",
    "数据库设计",
    "AI 拆解能力"
  ],
  "priority": 3,
  "due_date": "2026-06-30",
  "notes": "先做管理后台"
}
```

### 响应体
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1001,
    "status": "draft"
  }
}
```

---

## GET `/api/requirements`

### 查询参数
- `page`
- `page_size`
- `keyword`
- `status`
- `project_id`

### 响应体
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [],
    "pagination": {
      "page": 1,
      "page_size": 10,
      "total": 0
    }
  }
}
```

---

## GET `/api/requirements/:id`

### 响应体
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1001,
    "title": "开发团队任务协同助手",
    "background": "...",
    "objective": "...",
    "constraints": "...",
    "deliverables": ["Web 页面", "后台接口"],
    "priority": 3,
    "due_date": "2026-06-30",
    "status": "draft",
    "ai_summary": "",
    "tasks": []
  }
}
```

---

## POST `/api/requirements/:id/split`

### 请求体
```json
{
  "mode": "auto",
  "model_name": "default",
  "custom_instructions": "请优先拆成前后端两类任务"
}
```

### 字段说明
- `mode`：`auto` / `manual_assist`
- `model_name`：模型名称，便于后续切换
- `custom_instructions`：额外约束

### 响应体
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "requirement_id": 1001,
    "split_status": "done",
    "ai_summary": "该需求可拆分为 7 个任务",
    "tasks": [
      {
        "temp_id": "t1",
        "title": "设计系统整体架构",
        "description": "明确前后端结构与模块划分",
        "priority": 1,
        "estimated_hours": 8,
        "risk_level": "medium",
        "acceptance_criteria": "输出架构图与模块说明",
        "dependencies": []
      }
    ],
    "questions": [
      "是否优先使用 React？",
      "是否已有数据库选型？"
    ]
  }
}
```

### 注意
- 这里返回的是“待确认拆解结果”，不一定立即落库为正式任务。
- 管理者确认后才生成正式 `tasks`。

---

# 7.4 任务分配接口

## POST `/api/tasks/assignment-suggest`

### 请求体
```json
{
  "requirement_id": 1001,
  "tasks": [
    {
      "task_id": 2001,
      "title": "设计系统整体架构",
      "description": "明确前后端结构与模块划分",
      "priority": 1,
      "estimated_hours": 8
    }
  ],
  "members": [
    {
      "user_id": 11,
      "name": "张三",
      "skill_tags": ["前端", "React"],
      "current_workload": 0.6,
      "available_hours_per_week": 20,
      "historical_success_rate": 0.92
    }
  ]
}
```

### 响应体
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "suggestions": [
      {
        "task_id": 2001,
        "recommended_owner_id": 11,
        "recommended_owner_name": "张三",
        "candidate_owner_ids": [11, 12],
        "score": 0.91,
        "reason": "具备 React 架构经验，当前负载较低",
        "risk_note": "任务涉及后端接口定义，需与后端协作"
      }
    ]
  }
}
```

---

## POST `/api/tasks/assign`

### 请求体
```json
{
  "requirement_id": 1001,
  "assignments": [
    {
      "task_id": 2001,
      "owner_id": 11,
      "collaborator_ids": [12],
      "due_date": "2026-06-10"
    }
  ]
}
```

### 响应体
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "assigned_count": 1,
    "task_ids": [2001]
  }
}
```

---

# 7.5 任务接口

## GET `/api/tasks`

### 查询参数
- `page`
- `page_size`
- `status`
- `owner_id`
- `requirement_id`
- `keyword`
- `project_id`
- `sort_by`
- `sort_order`

### 响应体
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 2001,
        "title": "设计系统整体架构",
        "status": "doing",
        "owner_id": 11,
        "owner_name": "张三",
        "progress_percent": 40,
        "due_date": "2026-06-10",
        "risk_level": "medium",
        "updated_at": "2026-05-27 10:20:00"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 10,
      "total": 1
    }
  }
}
```

---

## GET `/api/tasks/:id`

### 响应体
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 2001,
    "requirement_id": 1001,
    "title": "设计系统整体架构",
    "description": "明确前后端结构与模块划分",
    "status": "doing",
    "owner_id": 11,
    "owner_name": "张三",
    "collaborator_ids": [12],
    "estimated_hours": 8,
    "actual_hours": 2,
    "progress_percent": 40,
    "due_date": "2026-06-10",
    "start_date": "2026-05-27 09:00:00",
    "completed_at": null,
    "risk_level": "medium",
    "ai_reason": "技能匹配高",
    "logs": []
  }
}
```

---

## POST `/api/tasks/:id/status`

### 请求体
```json
{
  "status": "doing",
  "progress_percent": 50,
  "note": "已完成架构图，正在补充接口设计",
  "blocked_reason": "",
  "source_type": "manual"
}
```

### 字段说明
- `status`：任务状态
- `progress_percent`：0-100
- `note`：状态说明
- `blocked_reason`：阻塞原因，状态为 blocked 时必须填写
- `source_type`：manual / ai_suggested / imported

### 响应体
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "task_id": 2001,
    "status": "doing"
  }
}
```

---

# 7.6 看板接口

## GET `/api/dashboard/board`

### 查询参数
- `project_id`
- `requirement_id`
- `owner_id`
- `status`

### 响应体
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "summary": {
      "task_total": 20,
      "todo_count": 5,
      "doing_count": 8,
      "blocked_count": 2,
      "done_count": 4,
      "delayed_count": 1
    },
    "columns": [
      {
        "status": "todo",
        "title": "未开始",
        "tasks": []
      },
      {
        "status": "doing",
        "title": "进行中",
        "tasks": []
      }
    ],
    "alerts": [
      {
        "id": 9001,
        "title": "任务延期",
        "severity": "high",
        "task_id": 2001
      }
    ],
    "member_loads": [
      {
        "user_id": 11,
        "name": "张三",
        "load_score": 0.76
      }
    ]
  }
}
```

---

# 7.7 报告接口

## POST `/api/reports/generate`

### 请求体
```json
{
  "report_type": "weekly",
  "project_id": 1,
  "date_from": "2026-05-20",
  "date_to": "2026-05-27",
  "include_ai": true
}
```

### 响应体
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 3001,
    "title": "2026-05-20 ~ 2026-05-27 周报",
    "content": "### 本周总结...",
    "summary": "本周完成 8 项任务，2 项阻塞",
    "risk_summary": "1 项延期，2 项负责人负载偏高",
    "ai_generated": true
  }
}
```

---

## GET `/api/reports`

### 查询参数
- `page`
- `page_size`
- `report_type`
- `project_id`
- `date_from`
- `date_to`

---

## GET `/api/reports/:id`

### 响应体
返回单条报告的完整内容，供编辑和预览使用。

---

## PUT `/api/reports/:id`

### 请求体
```json
{
  "title": "2026-05-20 ~ 2026-05-27 周报（修订版）",
  "content": "更新后的报告正文",
  "summary": "更新后的摘要",
  "risk_summary": "更新后的风险总结"
}
```

---

# 7.8 用户和成员画像接口

## GET `/api/users`
用于管理员页面获取用户列表。

## POST `/api/users`
用于新建用户。

## PUT `/api/users/:id`
用于修改用户信息与角色。

## GET `/api/members/profile/:user_id`
获取成员画像。

## PUT `/api/members/profile/:user_id`
更新成员画像。

---

# 7.9 AI 调用日志接口（可选）

## GET `/api/ai/logs`
查看 AI 调用记录。

### 响应字段
- `biz_type`
- `model_name`
- `latency_ms`
- `token_usage`
- `created_at`
- `status`

---

## 8. 数据库字段设计（可直接建表的字段粒度）

---

# 8.1 users
| 字段名 | 类型 | 说明 |
|---|---|---|
| id | bigint PK | 主键 |
| org_id | bigint | 组织 ID |
| username | varchar(64) unique | 登录名 |
| password_hash | varchar(255) | 密码哈希 |
| name | varchar(64) | 姓名 |
| role | varchar(20) | admin / manager / member |
| email | varchar(128) | 邮箱 |
| phone | varchar(32) | 手机号 |
| avatar | varchar(255) | 头像地址 |
| status | varchar(20) | active / disabled |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

---

# 8.2 member_profiles
| 字段名 | 类型 | 说明 |
|---|---|---|
| id | bigint PK | 主键 |
| user_id | bigint unique | 用户 ID |
| skill_tags | json | 技能标签 |
| skill_level | int | 熟练度 1-5 |
| preferred_task_types | json | 偏好任务类型 |
| avoid_task_types | json | 不适合任务类型 |
| current_workload | decimal(5,2) | 当前负载 0~1 |
| available_hours_per_week | decimal(6,2) | 每周可用工时 |
| historical_success_rate | decimal(5,2) | 历史成功率 0~1 |
| remark | text | 备注 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

---

# 8.3 requirements
| 字段名 | 类型 | 说明 |
|---|---|---|
| id | bigint PK | 主键 |
| project_id | bigint | 项目 ID |
| title | varchar(255) | 需求标题 |
| background | text | 背景 |
| objective | text | 目标 |
| constraints | text | 约束 |
| deliverables | json | 交付物 |
| priority | int | 优先级 |
| due_date | date | 截止日期 |
| status | varchar(30) | draft / analyzing / split_done / assigned / in_progress / closed |
| created_by | bigint | 创建人 |
| ai_summary | text | AI 总结 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

---

# 8.4 tasks
| 字段名 | 类型 | 说明 |
|---|---|---|
| id | bigint PK | 主键 |
| requirement_id | bigint | 需求 ID |
| parent_task_id | bigint nullable | 父任务 ID |
| title | varchar(255) | 任务标题 |
| description | text | 任务描述 |
| priority | int | 优先级 |
| status | varchar(30) | todo / doing / blocked / done / delayed |
| owner_id | bigint nullable | 负责人 |
| collaborator_ids | json | 协作人列表 |
| estimated_hours | decimal(8,2) | 预计工时 |
| actual_hours | decimal(8,2) | 实际工时 |
| progress_percent | decimal(5,2) | 进度 |
| start_date | datetime nullable | 开始时间 |
| due_date | datetime nullable | 截止时间 |
| completed_at | datetime nullable | 完成时间 |
| risk_level | varchar(20) | low / medium / high |
| ai_reason | text | AI 推荐理由 |
| acceptance_criteria | text | 验收标准 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

---

# 8.5 task_status_logs
| 字段名 | 类型 | 说明 |
|---|---|---|
| id | bigint PK | 主键 |
| task_id | bigint | 任务 ID |
| status | varchar(30) | 状态 |
| progress_percent | decimal(5,2) | 进度 |
| note | text | 备注 |
| blocked_reason | text | 阻塞原因 |
| source_type | varchar(30) | manual / ai_suggested / imported |
| created_by | bigint | 创建人 |
| created_at | datetime | 创建时间 |

---

# 8.6 alerts
| 字段名 | 类型 | 说明 |
|---|---|---|
| id | bigint PK | 主键 |
| requirement_id | bigint nullable | 需求 ID |
| task_id | bigint nullable | 任务 ID |
| alert_type | varchar(30) | delay / blocked / no_update / overload / missing_dependency |
| severity | varchar(20) | low / medium / high / critical |
| title | varchar(255) | 标题 |
| description | text | 描述 |
| status | varchar(20) | open / resolved |
| suggestion | text | 建议 |
| created_at | datetime | 创建时间 |
| resolved_at | datetime nullable | 解决时间 |

---

# 8.7 reports
| 字段名 | 类型 | 说明 |
|---|---|---|
| id | bigint PK | 主键 |
| project_id | bigint nullable | 项目 ID |
| report_type | varchar(20) | daily / weekly / stage |
| date_from | date | 开始日期 |
| date_to | date | 结束日期 |
| title | varchar(255) | 标题 |
| summary | text | 摘要 |
| content | longtext | 正文 |
| risk_summary | text | 风险总结 |
| ai_generated | boolean | 是否 AI 生成 |
| created_by | bigint | 创建人 |
| created_at | datetime | 创建时间 |
| updated_at | datetime | 更新时间 |

---

# 8.8 ai_call_logs
| 字段名 | 类型 | 说明 |
|---|---|---|
| id | bigint PK | 主键 |
| biz_type | varchar(50) | 业务类型 |
| prompt_text | longtext | prompt 文本 |
| input_payload | json | 输入参数 |
| model_name | varchar(100) | 模型名称 |
| output_text | longtext | 模型输出文本 |
| output_payload | json | 模型输出结构化结果 |
| token_usage | json | token 使用情况 |
| latency_ms | int | 耗时 |
| status | varchar(20) | success / fail |
| error_message | text | 错误信息 |
| created_at | datetime | 创建时间 |

---

## 9. 前后端字段映射说明

### 9.1 需求表单 -> requirements
- 前端 `title` -> 后端 `title`
- 前端 `deliverables` -> 后端 `deliverables`（json）
- 前端 `due_date` -> 后端 `due_date`

### 9.2 AI 拆解结果 -> tasks
- AI 返回的 `tasks[]` 先作为临时结构
- 管理者确认后，转换为正式 `tasks` 入库
- 临时 ID 不要直接当正式主键使用

### 9.3 任务状态更新 -> task_status_logs
- 每次状态变化都写日志
- 最新状态同步到 `tasks.status`
- `progress_percent` 同步更新到 `tasks.progress_percent`

### 9.4 看板数据 -> dashboard board
- `tasks` 聚合后生成列数据
- 不要前端自己重新计算状态分组
- 预警和成员负载由后端统一返回

---

## 10. 后端服务分层建议

### 10.1 Controller 层
负责：
- 接收请求
- 参数校验
- 鉴权
- 调用 service

### 10.2 Service 层
负责：
- 业务逻辑
- 调用 AI
- 数据聚合
- 状态流转

### 10.3 Repository / ORM 层
负责：
- 数据库读写
- 分页查询
- 事务控制

### 10.4 AI Service 层
负责：
- 统一 prompt 构造
- 模型调用
- 结果解析
- 日志记录

---

## 11. AI 调用规范

### 11.1 AI 输出必须结构化
建议统一返回：
```json
{
  "summary": "",
  "questions": [],
  "tasks": [],
  "suggestions": [],
  "risk_notes": []
}
```

### 11.2 AI 拆解提示词要求
- 输入需求时必须包含背景、目标、交付物、截止日期
- 输出必须包含任务树
- 任务必须包含预计工时、依赖、验收标准

### 11.3 AI 分配提示词要求
- 输入必须包含任务特征与成员画像
- 输出必须包含推荐理由与风险说明
- 推荐结果必须可解释

### 11.4 AI 报告生成提示词要求
- 输入必须包含任务总数、完成数、延期数、阻塞数、负载情况
- 输出必须先总结，再展开风险与建议
- 生成后的内容要适合管理者直接阅读

---

## 12. 路由设计

```text
/login
/dashboard
/requirements
/requirements/:id
/requirements/:id/split
/tasks/assignment
/tasks/board
/tasks/:id
/tasks/my
/reports
/admin/users
```

---

## 13. 组件拆分建议

### 通用组件
- AppLayout
- SidebarMenu
- TopBar
- PageHeader
- ConfirmDialog
- EmptyState
- LoadingState
- ErrorState

### 页面组件
- LoginForm
- OverviewCards
- RequirementTable
- RequirementFormDrawer
- TaskTreeView
- TaskAssignmentTable
- KanbanBoard
- ReportEditor
- UserTable

---

## 14. 页面加载与状态处理要求

### 14.1 加载态
所有列表页和详情页必须提供 loading 状态，避免空白屏。

### 14.2 空态
无数据时必须显示操作引导，而不是直接显示空表格。

### 14.3 错误态
接口失败时要显示具体错误文案，并提供重试按钮。

### 14.4 权限态
无权限时应显示“无访问权限”，并引导返回首页。

---

## 15. 交互细节要求

### 15.1 需求创建
- 保存前校验标题、目标、交付物、截止时间
- 保存成功后提示并跳转详情页或列表页

### 15.2 AI 拆解
- 拆解过程显示 loading
- 返回结果后允许手动调整
- 只有确认后才会创建正式任务

### 15.3 任务分配
- 推荐结果默认展示最高分方案
- 支持手动改派
- 改派时记录原因

### 15.4 状态更新
- 阻塞状态必须填写原因
- 延期状态必须填写说明
- 每次更新要记录时间戳和操作者

### 15.5 报告生成
- 生成后先展示预览
- 允许编辑
- 保存后可再次导出

---

## 16. 最小验收标准

MVP 完成交付后，必须满足以下条件：

1. 用户能登录系统并进入对应角色首页。
2. 管理者能创建需求。
3. 系统能对需求进行 AI 拆解，并展示任务树。
4. 系统能给出任务负责人推荐。
5. 管理者能确认并下发任务。
6. 成员能更新任务状态。
7. 管理者能通过看板查看团队进度。
8. 系统能生成管理报告并保存。

---

## 17. 给 Kiro 的直接执行要求

请 Kiro 按以下顺序实现：

### Phase 1
1. 搭建前后端项目骨架
2. 实现登录/鉴权
3. 实现需求创建与列表
4. 实现 AI 拆解接口与任务树页面
5. 实现任务分配建议与下发
6. 实现任务状态更新
7. 实现看板页面
8. 实现报告生成与展示

### Phase 2
1. 美化 UI
2. 优化 AI prompt
3. 补充预警规则
4. 增加导出与版本管理
5. 接外部协同工具

---

## 18. 开发注意事项

1. 先保证流程闭环，再优化界面。
2. AI 输出不要直接覆盖数据库，必须经过确认。
3. 所有状态变化都要写日志。
4. 所有 AI 调用都要落日志，方便排查。
5. 接口字段名和前端字段名必须统一。
6. 列表接口必须支持分页、筛选、排序。
7. 任务、需求、报告都要保留可追踪的 created_at / updated_at。
8. 权限控制要在后端做，前端只做体验层隐藏。

---

## 19. 交付物清单

Kiro 需要最终生成：

- 前端可运行项目
- 后端可运行项目
- 数据库建表 SQL 或 migration
- AI 服务封装
- 接口文档
- README 启动说明
- 基础测试数据
- 任务拆解与分配示例数据

---

## 20. 总结

这个系统的 MVP 本质上是一个 **Web 管理后台**，核心路径非常清晰：

**登录/权限 → 需求创建 → AI 拆解 → 任务分配建议 → 任务下发 → 进度看板 → 报告生成**

请按照上面的页面交互和接口字段说明直接编码实现。  
AI 能力先做“拆解、推荐、汇总、报告”四件事，其他能力先不做复杂化。  
前端先保证可用，后端先保证字段清晰、状态可追踪、接口返回稳定。
