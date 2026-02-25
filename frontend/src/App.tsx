/**
 * ============================================
 * 根组件 - App
 * ============================================
 *
 * 功能说明：
 * - 路由配置
 * - 全局样式
 * - Provider配置
 *
 * @author Emergency Dispatch Team
 */

import { ConfigProvider, App as AntdApp } from 'antd';
import { BrowserRouter } from 'react-router-dom';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import AppRouter from './router';

// 设置dayjs中文
dayjs.locale('zh-cn');

/**
 * 应用根组件
 */
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ConfigProvider
        locale={zhCN}
        theme={{
          token: {
            colorPrimary: '#1890ff',
            borderRadius: 4,
          },
        }}
      >
        <AntdApp>
          <AppRouter />
        </AntdApp>
      </ConfigProvider>
    </BrowserRouter>
  );
};

export default App;
