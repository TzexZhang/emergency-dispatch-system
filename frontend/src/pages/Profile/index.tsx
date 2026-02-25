/**
 * ============================================
 * 个人信息页面
 * ============================================
 *
 * 功能说明：
 * - 头像显示与上传
 * - 用户名（只读）
 * - 真实姓名、手机、邮箱编辑
 * - 角色（只读）
 * - 保存按钮
 *
 * @author Emergency Dispatch Team
 */

import { useState, useRef, useEffect } from 'react';
import { Card, Form, Input, Button, Avatar, message as antdMessage, Upload, Descriptions, Row, Col } from 'antd';
import {
  UserOutlined,
  UploadOutlined,
  LockOutlined,
} from '@ant-design/icons';
import type { UploadChangeParam, UploadFile } from 'antd/es/upload/interface';
import { useUserStore } from '@/store/userStore';
import { http } from '@utils/http';
import type { User } from '@/types';

const ROLE_MAP: Record<string, string> = {
  admin: '管理员',
  operator: '操作员',
  dispatcher: '调度员',
  viewer: '查看者',
};

/**
 * 个人信息页面组件
 */
const Profile: React.FC = () => {
  const { user, updateUser, updateUserAvatar } = useUserStore();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 初始化表单数据
   */
  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        username: user.username,
        realName: user.realName,
        phone: user.phone || '',
        email: user.email || '',
        role: ROLE_MAP[user.role] || user.role,
      });
    }
  }, [user, form]);

  /**
   * 处理头像上传
   */
  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      antdMessage.error('只支持 JPG、PNG、GIF、WebP 格式的图片');
      return;
    }

    // 验证文件大小（2MB）
    if (file.size > 2 * 1024 * 1024) {
      antdMessage.error('图片大小不能超过 2MB');
      return;
    }

    setAvatarLoading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await http.post<{ avatarUrl: string }>('/api/v1/auth/upload-avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res?.data?.avatarUrl) {
        updateUserAvatar(res.data.avatarUrl);
        antdMessage.success('头像上传成功');
      }
    } catch (error: any) {
      antdMessage.error(error?.message || '头像上传失败');
    } finally {
      setAvatarLoading(false);
      // 重置input，允许重复上传同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /**
   * 触发文件选择
   */
  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  /**
   * 处理保存个人信息
   */
  const handleSave = async (values: any) => {
    setLoading(true);
    try {
      await http.put('/api/v1/auth/profile', {
        realName: values.realName,
        phone: values.phone || undefined,
        email: values.email || undefined,
      });

      // 更新本地用户信息
      updateUser({
        realName: values.realName,
        phone: values.phone,
        email: values.email,
      });

      message.success('保存成功');
    } catch (error: any) {
      antdMessage.error(error?.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 获取用户头像URL
   */
  const getAvatarUrl = () => {
    if (user?.avatar) {
      return user.avatar.startsWith('http')
        ? user.avatar
        : `${import.meta.env.VITE_API_URL}${user.avatar}`;
    }
    return undefined;
  };

  if (!user) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        请先登录
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={[24, 24]}>
        {/* 左侧：头像卡片 */}
        <Col xs={24} md={8}>
          <Card title="头像">
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <Avatar
                src={getAvatarUrl()}
                icon={<UserOutlined />}
                size={128}
                style={{ marginBottom: 16 }}
              />
              <div style={{ marginBottom: 16 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleAvatarChange}
                />
                <Button
                  icon={<UploadOutlined />}
                  onClick={triggerFileSelect}
                  loading={avatarLoading}
                >
                  上传头像
                </Button>
              </div>
              <div style={{ color: '#888', fontSize: 12 }}>
                支持 JPG、PNG、GIF、WebP 格式
                <br />
                文件大小不超过 2MB
              </div>
            </div>
          </Card>

          {/* 账号信息卡片 */}
          <Card title="账号信息" style={{ marginTop: 16 }}>
            <Descriptions column={1} bordered>
              <Descriptions.Item label="用户名">{user.username}</Descriptions.Item>
              <Descriptions.Item label="角色">{ROLE_MAP[user.role] || user.role}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <span style={{ color: '#52c41a' }}>正常</span>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* 右侧：个人信息表单 */}
        <Col xs={24} md={16}>
          <Card title="个人信息">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSave}
            >
              <Form.Item
                label="用户名"
                name="username"
              >
                <Input disabled />
              </Form.Item>

              <Form.Item
                label="角色"
                name="role"
              >
                <Input disabled />
              </Form.Item>

              <Form.Item
                label="真实姓名"
                name="realName"
                rules={[
                  { required: true, message: '请输入真实姓名' },
                ]}
              >
                <Input placeholder="请输入真实姓名" />
              </Form.Item>

              <Form.Item
                label="手机号"
                name="phone"
                rules={[
                  {
                    pattern: /^1[3-9]\d{9}$/,
                    message: '请输入正确的手机号',
                  },
                ]}
              >
                <Input placeholder="请输入手机号" />
              </Form.Item>

              <Form.Item
                label="邮箱"
                name="email"
                rules={[
                  {
                    type: 'email',
                    message: '请输入正确的邮箱地址',
                  },
                ]}
              >
                <Input placeholder="请输入邮箱" />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={loading}>
                  保存
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Profile;
