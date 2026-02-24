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

import { lazy } from 'react';
import { Navigate, RouteObject } from 'react-router-dom';

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
    path: '/',
    element: <Dashboard />,
    children: [
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
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
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
];

export default routes;
