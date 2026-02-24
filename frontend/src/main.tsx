/**
 * ============================================
 * 城市智慧应急协同调度平台 - 前端入口
 * ============================================
 *
 * 功能说明：
 * - React应用入口
 * - 路由配置
 * - 全局样式
 * - Provider配置
 *
 * @author Emergency Dispatch Team
 * @since 2026-02-24
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, App } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import './index.css';
import AppRouter from './router';

// 设置dayjs中文
dayjs.locale('zh-cn');

/**
 * Ant Design全局配置
 */
const antdConfig = {
  locale: zhCN,
  theme: {
    token: {
      colorPrimary: '#1890ff',
      borderRadius: 4,
    },
  },
};

/**
 * 应用根组件
 */
const Root: React.FC = () => {
  return (
    <BrowserRouter>
      <ConfigProvider {...antdConfig}>
        <App>
          <AppRouter />
        </App>
      </ConfigProvider>
    </BrowserRouter>
  );
};

// 渲染应用
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
