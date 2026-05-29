// API barrel export
export { default as apiClient } from './client';
export type { ApiResponse } from './client';
export { authApi } from './auth';
export type { UserProfile, LoginParams, LoginResponseData } from './auth';
export { aiApi } from './ai';
export type { AiJobData, AiJobStatus } from './ai';
export { tasksApi, taskApi } from './tasks';
export type {
  Task,
  TaskData,
  TaskDetail,
  TaskStatus,
  TaskQuery,
  StatusLog,
  UpdateTaskStatusDto,
  PaginatedList,
  MemberProfile,
  AssignmentSuggestion,
  AssignTasksRequest,
  AssignTasksResponse,
} from './tasks';
export { dashboardApi } from './dashboard';
export type {
  BoardTaskItem,
  BoardData,
  BoardQuery,
  OverviewCardsData,
  TaskStatusDistributionItem,
  MemberWorkloadItem,
  ActiveAlertItem,
  DashboardData,
} from './dashboard';
export { reportsApi } from './reports';
export type {
  Report,
  ReportType,
  ReportQuery,
  GenerateReportDto,
  UpdateReportDto,
  PaginatedReportList,
} from './reports';
export { usersApi } from './users';
export type {
  UserData,
  UserRole,
  UserStatus,
  UserQuery,
  CreateUserParams,
  UpdateUserParams,
  MemberProfileData,
  PaginatedUserList,
} from './users';
export { notificationsApi } from './notifications';
export type {
  Notification,
  NotificationQuery,
  PaginatedNotificationList,
} from './notifications';
