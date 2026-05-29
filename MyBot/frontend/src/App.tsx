import { Component, ErrorInfo, ReactNode } from 'react';
import { ConfigProvider, App as AntApp } from 'antd';
import { useRoutes } from 'react-router-dom';
import { routes } from './routes';

/**
 * Error boundary to catch React rendering errors and display them
 * instead of showing a white screen.
 */
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('React Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, fontFamily: 'monospace' }}>
          <h1 style={{ color: 'red' }}>页面出错了</h1>
          <p style={{ fontSize: 16 }}>{this.state.error?.message}</p>
          <pre style={{ background: '#f5f5f5', padding: 16, overflow: 'auto', fontSize: 12 }}>
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.href = '/login';
            }}
            style={{ marginTop: 16, padding: '8px 16px', fontSize: 14 }}
          >
            清除数据并重新登录
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const element = useRoutes(routes);
  return <>{element}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <ConfigProvider>
        <AntApp>
          <AppContent />
        </AntApp>
      </ConfigProvider>
    </ErrorBoundary>
  );
}

export default App;
