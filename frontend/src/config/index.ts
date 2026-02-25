/**
 * ============================================
 * 前端配置
 * ============================================
 *
 * @author Emergency Dispatch Team
 */

/**
 * 应用配置
 */
export const config = {
  app: {
    name: '城市智慧应急协同调度平台',
    version: '1.0.0',
    title: 'Emergency Dispatch System',
  },

  // API配置
  api: {
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
    timeout: 30000,
  },

  // WebSocket配置
  ws: {
    url: import.meta.env.VITE_WS_URL || 'http://localhost:8000',
    path: '/socket.io/',
    autoConnect: true,
    reconnection: true,
  },

  // 地图配置
  map: {
    defaultCenter: [116.404, 39.915] as [number, number],
    defaultZoom: 12,
    minZoom: 3,
    maxZoom: 18,
    osmTileUrl: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  },

  // UI配置
  ui: {
    tablePageSize: 20,
    messageDuration: 3,
  },
};

export default config;
