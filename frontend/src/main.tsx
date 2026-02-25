/**
 * ============================================
 * 城市智慧应急协同调度平台 - 前端入口
 * ============================================
 *
 * 功能说明：
 * - React应用入口
 *
 * @author Emergency Dispatch Team
 * @since 2026-02-24
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 渲染应用
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
