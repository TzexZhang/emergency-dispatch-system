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

import { ConfigProvider, App } from 'antd';
import { BrowserRouter } from 'react-router-dom';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { useEffect } from 'react';
import { useRoutes } from 'react-router-dom';
import { ConfigProviderTheme } from 'antd/es/config-provider/context';

// 导入路由
import routes from './router';

// 设置dayjs中文
dayjs.locale('zh-cn');

/**
 * 应用根组件
 */
const App: React.FC = () => {
  // 路由渲染
  const routing = useRoutes(routes);

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
        <App>{routing}</App>
      </ConfigProvider>
    </BrowserRouter>
  );
};

export default App;
