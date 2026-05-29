import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

/**
 * Unauthorized page shown when a user tries to access a route
 * they don't have permission for.
 */
export default function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <Result
      status="403"
      title="403"
      subTitle="抱歉，您没有权限访问此页面。"
      extra={
        <Button type="primary" onClick={() => navigate(-1)}>
          返回
        </Button>
      }
    />
  );
}
