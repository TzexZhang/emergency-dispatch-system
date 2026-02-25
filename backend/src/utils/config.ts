/**
 * ============================================
 * 配置管理工具
 * ============================================
 *
 * 功能说明：
 * - 统一管理应用配置
 * - 从环境变量读取配置
 * - 提供类型安全的配置访问
 * - 配置验证和默认值
 *
 * @author Emergency Dispatch Team
 */

/**
 * 应用配置接口
 */
interface AppConfig {
  env: string;
  port: number;
  url: string;
  name: string;
  frontendUrl: string;
}

/**
 * 数据库配置接口
 */
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  charset: string;
  timezone: string;
}

/**
 * Redis配置接口
 */
interface RedisConfig {
  host: string;
  port: number;
  password: string;
  db: number;
}

/**
 * JWT配置接口
 */
interface JWTConfig {
  secret: string;
  expiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

/**
 * WebSocket配置接口
 */
interface WebSocketConfig {
  corsOrigin: string;
  pingTimeout: number;
  pingInterval: number;
  heartbeatInterval: number;
  heartbeatTimeout: number;
}

/**
 * 外部服务配置接口
 */
interface ExternalServicesConfig {
  osm: {
    tileUrl: string;
  };
  tianditu: {
    key: string;
    vectorUrl: string;
    imageUrl: string;
  };
  graphhopper: {
    url: string;
    defaultProfile: string;
  };
  nominatim: {
    url: string;
  };
}

/**
 * 日志配置接口
 */
interface LoggingConfig {
  level: string;
  filePath: string;
  maxSize: string;
  maxFiles: string;
}

/**
 * 地图配置接口
 */
interface MapConfig {
  defaultCenter: {
    lng: number;
    lat: number;
  };
  defaultZoom: number;
  minZoom: number;
  maxZoom: number;
  defaultCrs: string;
}

/**
 * 主配置接口
 */
interface Config {
  app: AppConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  jwt: JWTConfig;
  ws: WebSocketConfig;
  externalServices: ExternalServicesConfig;
  logging: LoggingConfig;
  map: MapConfig;
}

/**
 * 从环境变量读取配置
 */
const config: Config = {
  // ================== 应用配置 ==================
  app: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '8000', 10),
    url: process.env.APP_URL || 'http://localhost:8000',
    name: process.env.APP_NAME || '城市智慧应急协同调度平台',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  },

  // ================== 数据库配置 ==================
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    database: process.env.DB_NAME || 'emergency_dispatch',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    charset: process.env.DB_CHARSET || 'utf8mb4',
    timezone: process.env.DB_TIMEZONE || '+08:00',
  },

  // ================== Redis配置 ==================
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },

  // ================== JWT配置 ==================
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your_refresh_token_secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // ================== WebSocket配置 ==================
  ws: {
    corsOrigin: process.env.WS_CORS_ORIGIN || 'http://localhost:3000',
    pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '5000', 10),
    pingInterval: parseInt(process.env.WS_PING_INTERVAL || '30000', 10),
    heartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL || '25000', 10),
    heartbeatTimeout: parseInt(process.env.WS_HEARTBEAT_TIMEOUT || '60000', 10),
  },

  // ================== 外部服务配置 ==================
  externalServices: {
    osm: {
      tileUrl:
        process.env.OSM_TILE_URL || 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    },
    tianditu: {
      key: process.env.TIANDITU_KEY || '',
      vectorUrl: process.env.TIANDITU_VECTOR_URL || '',
      imageUrl: process.env.TIANDITU_IMAGE_URL || '',
    },
    graphhopper: {
      url: process.env.GRAPPHOPPER_URL || 'http://localhost:8989',
      defaultProfile: process.env.GRAPPHOPPER_DEFAULT_PROFILE || 'car',
    },
    nominatim: {
      url: process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org',
    },
  },

  // ================== 日志配置 ==================
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs',
    maxSize: process.env.LOG_MAX_SIZE || '20m',
    maxFiles: process.env.LOG_MAX_FILES || '14d',
  },

  // ================== 地图配置 ==================
  map: {
    defaultCenter: {
      lng: parseFloat(process.env.MAP_DEFAULT_CENTER_LNG || '116.404'),
      lat: parseFloat(process.env.MAP_DEFAULT_CENTER_LAT || '39.915'),
    },
    defaultZoom: parseInt(process.env.MAP_DEFAULT_ZOOM || '12', 10),
    minZoom: parseInt(process.env.MAP_MIN_ZOOM || '3', 10),
    maxZoom: parseInt(process.env.MAP_MAX_ZOOM || '18', 10),
    defaultCrs: process.env.MAP_DEFAULT_CRS || 'EPSG:3857',
  },
};

export { config };
export default config;
