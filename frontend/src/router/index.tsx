/**
 * ============================================
 * 路由配置
 * ============================================
 *
 * 功能说明：
 * - 页面路由配置
 * - 懒加载配置
 * - 路由守卫（认证检查）
 * - 主布局包裹
 *
 * @author Emergency Dispatch Team
 */

import { lazy, Suspense } from 'react';
import { Navigate, RouteObject, useRoutes, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { isAuthenticated } from '@/store/userStore';
import MainLayout from '@/layouts/MainLayout';

// 懒加载页面组件
const Login = lazy(() => import('@pages/Login'));
const Register = lazy(() => import('@pages/Register'));
const Dashboard = lazy(() => import('@pages/Dashboard'));
const Profile = lazy(() => import('@pages/Profile'));

// 管理页面
const IncidentManagement = lazy(() => import('@pages/Incident/Management'));
const DispatchManagement = lazy(() => import('@pages/Dispatch/Management'));
const PlottingManagement = lazy(() => import('@pages/Plotting/Management'));
const PlaybackManagement = lazy(() => import('@pages/Playback/Management'));
const ResourceManagement = lazy(() => import('@pages/Resource/Management'));

// 旧页面（保留兼容）
const ResourceMonitor = lazy(() => import('@pages/ResourceMonitor'));
const SpatialAnalysis = lazy(() => import('@pages/SpatialAnalysis'));
const TacticalPlotting = lazy(() => import('@pages/TacticalPlotting'));
const Playback = lazy(() => import('@pages/Playback'));

/**
 * 公共路由（不需要认证）
 */
const publicRoutes: RouteObject[] = [
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
];

/**
 * 受保护路由（需要认证）
 */
const protectedRoutes: RouteObject[] = [
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'profile',
        element: <Profile />,
      },
      // 资源监控
      {
        path: 'resource/monitor',
        element: <ResourceMonitor />,
      },
      {
        path: 'resource/management',
        element: <ResourceManagement />,
      },
      // 事件管理
      {
        path: 'incident/management',
        element: <IncidentManagement />,
      },
      // 调度任务
      {
        path: 'dispatch/management',
        element: <DispatchManagement />,
      },
      // 战术标绘
      {
        path: 'plotting/management',
        element: <PlottingManagement />,
      },
      // 轨迹回放
      {
        path: 'playback/management',
        element: <PlaybackManagement />,
      },
      // 旧路由兼容
      {
        path: 'resource',
        element: <ResourceMonitor />,
      },
      {
        path: 'spatial',
        element: <SpatialAnalysis />,
      },
      {
        path: 'plotting',
        element: <TacticalPlotting />,
      },
      {
        path: 'playback',
        element: <Playback />,
      },
    ],
  },
];

/**
 * 所有路由配置
 */
const routes: RouteObject[] = [
  ...publicRoutes,
  ...protectedRoutes,
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
];

/**
 * 加载中组件
 */
const LoadingFallback = () => (
  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', gap: 16 }}>
    <Spin size="large" />
    <div style={{ color: '#888' }}>加载中...</div>
  </div>
);

/**
 * 路由守卫组件
 */
const RouteGuard = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const authenticated = isAuthenticated();

  // 公共路由直接放行
  const publicPaths = ['/login', '/register'];
  if (publicPaths.includes(location.pathname)) {
    // 已登录用户访问登录/注册页，重定向到首页
    if (authenticated) {
      return <Navigate to="/dashboard" replace />;
    }
    return <>{children}</>;
  }

  // 受保护路由需要认证
  if (!authenticated) {
    // 保存当前路径，登录后可以跳转回来
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

/**
 * 路由组件
 */
const AppRouter = () => {
  const routing = useRoutes(routes);

  return (
    <RouteGuard>
      <Suspense fallback={<LoadingFallback />}>
        {routing}
      </Suspense>
    </RouteGuard>
  );
};

export default AppRouter;
