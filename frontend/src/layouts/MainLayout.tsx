/**
 * ============================================
 * 主布局组件
 * ============================================
 *
 * 功能说明：
 * - 侧边栏导航菜单
 * - 顶部Header（页面标题 + 用户信息下拉菜单）
 * - 内容区域（Outlet渲染子路由）
 * - 用户头像、用户名显示
 * - 退出登录功能
 *
 * @author Emergency Dispatch Team
 */

import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Layout, Menu, Dropdown, Avatar, Space, theme, Button } from "antd";
import {
  DashboardOutlined,
  EnvironmentOutlined,
  AlertOutlined,
  CarOutlined,
  RadarChartOutlined,
  HistoryOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { useUserStore } from "@/store/userStore";
import type { MenuProps } from "antd";
import "./MainLayout.less";

const { Header, Sider, Content } = Layout;

/**
 * 主布局组件
 */
const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useUserStore();
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  /**
   * 菜单项配置
   */
  const menuItems: MenuProps["items"] = [
    {
      key: "/dashboard",
      icon: <DashboardOutlined />,
      label: "指挥大屏",
    },
    {
      key: "/resource",
      icon: <EnvironmentOutlined />,
      label: "资源监控",
      children: [
        {
          key: "/resource/monitor",
          label: "实时监控",
        },
        {
          key: "/resource/management",
          label: "资源管理",
        },
      ],
    },
    {
      key: "/incident",
      icon: <AlertOutlined />,
      label: "事件管理",
      children: [
        {
          key: "/incident/management",
          label: "事件列表",
        },
        {
          key: "/incident/map",
          label: "事件地图",
        },
      ],
    },
    {
      key: "/dispatch",
      icon: <CarOutlined />,
      label: "调度任务",
      children: [
        {
          key: "/dispatch/management",
          label: "任务管理",
        },
      ],
    },
    {
      key: "/plotting",
      icon: <RadarChartOutlined />,
      label: "战术标绘",
      children: [
        {
          key: "/plotting/management",
          label: "标绘管理",
        },
      ],
    },
    {
      key: "/playback",
      icon: <HistoryOutlined />,
      label: "轨迹回放",
      children: [
        {
          key: "/playback/management",
          label: "轨迹查询",
        },
      ],
    },
  ];

  /**
   * 用户下拉菜单
   */
  const userMenuItems: MenuProps["items"] = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "个人信息",
      onClick: () => navigate("/profile"),
    },
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: "系统设置",
      onClick: () => navigate("/settings"),
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "退出登录",
      onClick: handleLogout,
      danger: true,
    },
  ];

  /**
   * 处理菜单点击
   */
  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    navigate(key);
  };

  /**
   * 处理退出登录
   */
  function handleLogout() {
    logout();
    navigate("/login");
  }

  /**
   * 获取当前选中的菜单项
   */
  const getSelectedKeys = () => {
    const path = location.pathname;
    for (const item of menuItems) {
      if (!item) continue;
      if (item?.key === path) {
        return [path];
      }
      if ("children" in item && item.children) {
        const child = item.children.find((c: any) => c.key === path);
        if (child) {
          return [child.key as string];
        }
      }
    }
    return [];
  };

  /**
   * 获取当前展开的菜单项
   */
  const getOpenKeys = () => {
    const path = location.pathname;
    const openKeys: string[] = [];
    for (const item of menuItems) {
      if (!item) continue;
      if ("children" in item && item.children) {
        const hasMatch = item.children.some((c: any) => path.startsWith(c.key));
        if (hasMatch) {
          openKeys.push(item.key as string);
        }
      }
    }
    return openKeys;
  };

  /**
   * 获取用户头像
   */
  const getUserAvatar = () => {
    if (user?.avatar) {
      const avatarUrl = user.avatar.startsWith("http")
        ? user.avatar
        : `${import.meta.env.VITE_API_BASE_URL}${user.avatar}`;
      return avatarUrl;
    }
    return undefined;
  };

  return (
    <Layout className="main-layout">
      {/* 侧边栏 */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        className="layout-sider"
        width={220}
      >
        <div className="logo">
          <div className="logo-icon">🚨</div>
          {!collapsed && <div className="logo-text">应急调度平台</div>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={getOpenKeys()}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>

      {/* 主体内容 */}
      <Layout>
        {/* 顶部Header */}
        <Header
          style={{
            padding: "0 24px",
            background: colorBgContainer,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* 左侧：折叠按钮 */}
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: "16px",
              width: 48,
              height: 48,
            }}
          />

          {/* 右侧：用户信息 */}
          <Space size="middle">
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: "pointer" }}>
                <Avatar
                  src={getUserAvatar()}
                  icon={<UserOutlined />}
                  size="default"
                />
                <span className="user-name">
                  {user?.realName || user?.username}
                </span>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        {/* 内容区域 */}
        <Content
          style={{
            margin: "16px",
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflow: "auto",
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
