/**
 * ============================================
 * 路由配置
 * ============================================
 *
 * 功能说明：
 * - 页面路由配置
 * - 懒加载配置
 * - 路由守卫
 *
 * @author Emergency Dispatch Team
 */

import { lazy, Suspense } from 'react';
import { Navigate, RouteObject, useRoutes } from 'react-router-dom';
import { Spin } from 'antd';

// 懒加载页面组件
const Login = lazy(() => import('@pages/Login'));
const Dashboard = lazy(() => import('@pages/Dashboard'));
const ResourceMonitor = lazy(() => import('@pages/ResourceMonitor'));
const SpatialAnalysis = lazy(() => import('@pages/SpatialAnalysis'));
const TacticalPlotting = lazy(() => import('@pages/TacticalPlotting'));
const Playback = lazy(() => import('@pages/Playback'));

/**
 * 路由配置
 */
const routes: RouteObject[] = [
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/dashboard',
    element: <Dashboard />,
  },
  {
    path: '/resource',
    element: <ResourceMonitor />,
  },
  {
    path: '/spatial',
    element: <SpatialAnalysis />,
  },
  {
    path: '/plotting',
    element: <TacticalPlotting />,
  },
  {
    path: '/playback',
    element: <Playback />,
  },
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
 * 路由组件
 */
const AppRouter = () => {
  const routing = useRoutes(routes);
  return (
    <Suspense fallback={<LoadingFallback />}>
      {routing}
    </Suspense>
  );
};

export default AppRouter;
