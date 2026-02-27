/**
 * ============================================
 * 用户注册页面
 * ============================================
 *
 * 功能说明：
 * - 用户注册表单
 * - 表单验证
 * - 注册成功后跳转登录
 *
 * @author Emergency Dispatch Team
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  message,
  Divider,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  IdcardOutlined,
} from '@ant-design/icons';
import { http } from '@utils/http';

interface RegisterFormData {
  username: string;
  password: string;
  confirmPassword: string;
  realName?: string;
  phone?: string;
  email?: string;
  role?: string;
}

/**
 * 注册页面组件
 */
const Register: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  /**
   * 处理注册提交
   */
  const handleSubmit = async (values: RegisterFormData) => {
    setLoading(true);
    try {
      await http.post('/api/v1/auth/register', {
        username: values.username,
        password: values.password,
        realName: values.realName,
        phone: values.phone,
        email: values.email,
        role: values.role || 'operator',
      });

      message.success('注册成功，请登录');
      navigate('/login');
    } catch (error: any) {
      message.error(error?.message || '注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 返回登录页
   */
  const handleBackToLogin = () => {
    navigate('/login');
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
        padding: 24,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 500,
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
        }}
        title={
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🚨</div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>用户注册</div>
          </div>
        }
      >
        <Form
          form={form}
          name="register"
          onFinish={handleSubmit}
          autoComplete="off"
          layout="vertical"
        >
          {/* 用户名 */}
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, max: 20, message: '用户名长度为3-20个字符' },
              {
                pattern: /^[a-zA-Z0-9_]+$/,
                message: '用户名只能包含字母、数字和下划线',
              },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名（3-20个字符）"
              size="large"
            />
          </Form.Item>

          {/* 密码 */}
          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码（至少6个字符）"
              size="large"
            />
          </Form.Item>

          {/* 确认密码 */}
          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="确认密码"
              size="large"
            />
          </Form.Item>

          {/* 真实姓名 */}
          <Form.Item name="realName">
            <Input
              prefix={<IdcardOutlined />}
              placeholder="真实姓名（可选）"
              size="large"
            />
          </Form.Item>

          {/* 手机号 */}
          <Form.Item
            name="phone"
            rules={[
              {
                pattern: /^1[3-9]\d{9}$/,
                message: '请输入正确的手机号',
              },
            ]}
          >
            <Input
              prefix={<PhoneOutlined />}
              placeholder="手机号（可选）"
              size="large"
            />
          </Form.Item>

          {/* 邮箱 */}
          <Form.Item
            name="email"
            rules={[
              {
                type: 'email',
                message: '请输入正确的邮箱地址',
              },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="邮箱（可选）"
              size="large"
            />
          </Form.Item>

          {/* 角色 */}
          <Form.Item
            name="role"
            initialValue="operator"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select
              placeholder="请选择角色"
              size="large"
              options={[
                { label: '操作员', value: 'operator' },
                { label: '调度员', value: 'dispatcher' },
                { label: '查看者', value: 'viewer' },
              ]}
            />
          </Form.Item>

          {/* 注册按钮 */}
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
            >
              注册
            </Button>
          </Form.Item>

          <Divider plain>已有账号？</Divider>

          <Button block size="large" onClick={handleBackToLogin}>
            返回登录
          </Button>
        </Form>
      </Card>
    </div>
  );
};

export default Register;
