import type { RouteObject } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import LoginPage from '@/pages/Login';
import UnauthorizedPage from '@/pages/Unauthorized';
import MyTasksPage from '@/pages/MyTasks';
import RequirementsPage from '@/pages/Requirements';
import TaskDetailPage from '@/pages/TaskDetail';
import AiSplitPage from '@/pages/AiSplit';
import TaskAssignmentPage from '@/pages/TaskAssignment';
import KanbanBoardPage from '@/pages/KanbanBoard';
import ReportsPage from '@/pages/Reports';
import DashboardPage from '@/pages/Dashboard';
import AdminUsersPage from '@/pages/AdminUsers';
import AuditLogsPage from '@/pages/AuditLogs';
import AuthGuard from '@/components/AuthGuard';

/**
 * Placeholder component for pages not yet implemented.
 */
function Placeholder({ title }: { title: string }) {
  return (
    <div style={{ padding: 24 }}>
      <h2>{title}</h2>
      <p>此页面尚未实现。</p>
    </div>
  );
}

/**
 * Redirects to the appropriate page based on user role.
 * If not logged in, redirects to login page.
 */
function RoleBasedRedirect() {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Try to determine role from stored user data or default to admin page
  try {
    // Decode JWT payload (base64url) to get role
    const base64 = token.split('.')[1];
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json);
    const role = payload.role;

    switch (role) {
      case 'admin':
        return <Navigate to="/admin/users" replace />;
      case 'manager':
        return <Navigate to="/dashboard" replace />;
      case 'member':
        return <Navigate to="/tasks/my" replace />;
      default:
        return <Navigate to="/dashboard" replace />;
    }
  } catch {
    // Token is invalid, clear it and go to login
    localStorage.removeItem('token');
    return <Navigate to="/login" replace />;
  }
}

export const routes: RouteObject[] = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/unauthorized',
    element: <UnauthorizedPage />,
  },
  // Protected routes - Admin
  {
    path: '/admin/users',
    element: (
      <AuthGuard roles={['admin']}>
        <AdminUsersPage />
      </AuthGuard>
    ),
  },
  {
    path: '/admin/audit-logs',
    element: (
      <AuthGuard roles={['admin']}>
        <AuditLogsPage />
      </AuthGuard>
    ),
  },
  // Protected routes - Manager
  {
    path: '/dashboard',
    element: (
      <AuthGuard roles={['admin', 'manager']}>
        <DashboardPage />
      </AuthGuard>
    ),
  },
  {
    path: '/requirements',
    element: (
      <AuthGuard roles={['admin', 'manager']}>
        <RequirementsPage />
      </AuthGuard>
    ),
  },
  {
    path: '/requirements/:id/split',
    element: (
      <AuthGuard roles={['admin', 'manager']}>
        <AiSplitPage />
      </AuthGuard>
    ),
  },
  {
    path: '/tasks',
    element: (
      <AuthGuard roles={['admin', 'manager']}>
        <Placeholder title="任务管理" />
      </AuthGuard>
    ),
  },
  {
    path: '/tasks/assignment',
    element: (
      <AuthGuard roles={['admin', 'manager']}>
        <TaskAssignmentPage />
      </AuthGuard>
    ),
  },
  {
    path: '/tasks/board',
    element: (
      <AuthGuard roles={['admin', 'manager']}>
        <KanbanBoardPage />
      </AuthGuard>
    ),
  },
  {
    path: '/tasks/my',
    element: (
      <AuthGuard roles={['admin', 'manager', 'member']}>
        <MyTasksPage />
      </AuthGuard>
    ),
  },
  {
    path: '/tasks/:id',
    element: (
      <AuthGuard roles={['admin', 'manager', 'member']}>
        <TaskDetailPage />
      </AuthGuard>
    ),
  },
  {
    path: '/reports',
    element: (
      <AuthGuard roles={['admin', 'manager']}>
        <ReportsPage />
      </AuthGuard>
    ),
  },
  // Default redirect - auto redirect based on role
  {
    path: '/',
    element: <RoleBasedRedirect />,
  },
];
