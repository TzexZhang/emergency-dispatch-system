/**
 * ============================================
 * 城市智慧应急协同调度平台 - 后端服务入口
 * ============================================
 *
 * 功能概述：
 * - Express HTTP服务器
 * - WebSocket实时通信服务
 * - 中间件配置（CORS、Helmet、压缩、日志等）
 * - 路由注册
 * - 错误处理
 *
 * @author Emergency Dispatch Team
 * @since 2026-02-24
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config();

// 导入配置
import { config } from '@utils/config';

// 导入中间件
import { authMiddleware } from '@middlewares/auth.middleware';
import { errorHandler } from '@middlewares/error.middleware';
import { rateLimiter } from '@middlewares/rateLimit.middleware';

// 导入路由
import authRoutes from '@routes/auth.routes';
import resourceRoutes from '@routes/resource.routes';
import incidentRoutes from '@routes/incident.routes';
import spatialRoutes from '@routes/spatial.routes';
import dispatchRoutes from '@routes/dispatch.routes';
import playbackRoutes from '@routes/playback.routes';

// 导入WebSocket服务
import { WebSocketGateway } from '@websocket/gateway';

// 导入日志工具
import { logger } from '@utils/logger';

/**
 * 创建并配置Express应用
 */
class App {
  public app: Application;
  public httpServer: any;
  public io: SocketIOServer;
  public wsGateway: WebSocketGateway;

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);

    // 初始化Socket.IO
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: config.ws.corsOrigin,
        credentials: true,
      },
      pingTimeout: config.ws.pingTimeout,
      pingInterval: config.ws.pingInterval,
      transports: ['websocket', 'polling'],
    });

    // 初始化WebSocket网关
    this.wsGateway = new WebSocketGateway(this.io);

    // 初始化中间件
    this.initializeMiddlewares();

    // 初始化路由
    this.initializeRoutes();

    // 初始化错误处理
    this.initializeErrorHandling();
  }

  /**
   * 初始化中间件
   */
  private initializeMiddlewares(): void {
    // 安全头设置
    this.app.use(helmet());

    // CORS配置
    this.app.use(
      cors({
        origin: config.app.frontendUrl,
        credentials: true,
      })
    );

    // 请求体解析
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 响应压缩
    this.app.use(compression());

    // 请求日志（开发环境使用dev格式，生产环境使用combined格式）
    if (config.app.env === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(
        morgan('combined', {
          stream: {
            write: (message: string) => {
              logger.info(message.trim());
            },
          },
        })
      );
    }

    // 静态文件服务（上传文件）
    this.app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

    // API请求限流
    this.app.use('/api/', rateLimiter);

    // 健康检查端点（无需认证）
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.app.env,
      });
    });
  }

  /**
   * 初始化路由
   */
  private initializeRoutes(): void {
    // API路由
    this.app.use('/api/v1/auth', authRoutes);
    this.app.use('/api/v1/resources', authMiddleware, resourceRoutes);
    this.app.use('/api/v1/incidents', authMiddleware, incidentRoutes);
    this.app.use('/api/v1/spatial', authMiddleware, spatialRoutes);
    this.app.use('/api/v1/dispatch', authMiddleware, dispatchRoutes);
    this.app.use('/api/v1/playback', authMiddleware, playbackRoutes);

    // 404处理
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        code: 404,
        message: '请求的资源不存在',
        path: req.path,
      });
    });
  }

  /**
   * 初始化错误处理
   */
  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  /**
   * 启动服务器
   */
  public listen(): void {
    const PORT = config.app.port;

    this.httpServer.listen(PORT, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   城市智慧应急协同调度平台 - 后端服务                      ║
║   Emergency Dispatch System - Backend Service            ║
║                                                           ║
║   环境: ${config.app.env.padEnd(46)}║
║   端口: ${String(PORT).padEnd(46)}║
║   时间: ${new Date().toLocaleString('zh-CN').padEnd(42)}║
║                                                           ║
║   HTTP服务: http://localhost:${PORT}                      ║
║   WebSocket: ws://localhost:${PORT}                       ║
║   API文档: http://localhost:${PORT}/api/v1/docs           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });

    // 优雅关闭
    process.on('SIGTERM', () => {
      logger.info('收到SIGTERM信号，准备关闭服务器...');
      this.httpServer.close(() => {
        logger.info('服务器已关闭');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('收到SIGINT信号，准备关闭服务器...');
      this.httpServer.close(() => {
        logger.info('服务器已关闭');
        process.exit(0);
      });
    });
  }
}

// 启动应用
const app = new App();
app.listen();

export default app;
