/**
 * ============================================
 * 登录页面
 * ============================================
 *
 * 功能说明：
 * - 用户登录表单
 * - 登录状态管理
 * - 跳转处理
 * - 与userStore集成
 *
 * @author Emergency Dispatch Team
 */

import { useState } from 'react';
import { Form, Input, Button, Card, message as antdMessage, Divider } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { http } from '@utils/http';
import { useUserStore } from '@/store/userStore';
import type { User } from '@/types';

/**
 * 登录页面组件
 */
const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, setToken } = useUserStore();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const res = await http.post<{
        token: string;
        refreshToken: string;
        user: User;
      }>('/api/v1/auth/login', {
        username: values.username,
        password: values.password,
      });

      // 保存到userStore
      setToken(res.data.token);
      setUser(res.data.user);

      antdMessage.success('登录成功');

      // 跳转到之前的页面或首页
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (error) {
      // 静默处理错误
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card
        title="城市智慧应急协同调度平台"
        style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
      >
        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名!' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码!' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', color: '#888', marginTop: 16 }}>
          <p>默认账户：admin / admin123</p>
        </div>

        <Divider plain>还没有账号？</Divider>

        <div style={{ textAlign: 'center' }}>
          <Link to="/register">立即注册</Link>
        </div>
      </Card>
    </div>
  );
};

export default Login;
