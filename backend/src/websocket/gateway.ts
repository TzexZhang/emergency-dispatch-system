/**
 * ============================================
 * WebSocket网关 - 实时通信服务
 * ============================================
 *
 * 功能说明：
 * - Socket.IO连接管理
 * - JWT认证
 * - 房间管理（按部门、区域分组）
 * - 消息广播和推送
 * - 断线重连处理
 * - 心跳检测
 *
 * @author Emergency Dispatch Team
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '@utils/logger';
import { config } from '@utils/config';

/**
 * Socket数据接口（附加到socket.data上）
 */
interface SocketData {
  userId: string;
  userName: string;
  userRole: string;
  departmentId?: string;
}

/**
 * 用户Socket映射
 * Map<userId, Set<socketId>>
 */
type UserSocketsMap = Map<string, Set<string>>;

/**
 * WebSocket网关类
 */
export class WebSocketGateway {
  private io: SocketIOServer;
  private userSockets: UserSocketsMap = new Map();

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupMiddleware();
    this.setupEventHandlers();
    this.startHeartbeatCheck();
  }

  /**
   * 设置中间件
   */
  private setupMiddleware(): void {
    // JWT认证中间件
    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token;

        if (!token) {
          return next(new Error('Authentication failed: No token provided'));
        }

        // 验证JWT Token
        const decoded = jwt.verify(token, config.jwt.secret) as any;

        // 附加用户信息到socket
        socket.data = {
          userId: decoded.userId,
          userName: decoded.userName,
          userRole: decoded.role,
          departmentId: decoded.departmentId,
        } as SocketData;

        logger.info(`用户认证成功: ${socket.data.userName} (${socket.id})`);
        next();
      } catch (err: any) {
        logger.error(`WebSocket认证失败: ${err.message}`);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      const userId = (socket.data as SocketData).userId;
      const userName = (socket.data as SocketData).userName;

      logger.info(`用户连接: ${userName} (${userId}) - Socket ID: ${socket.id}`);

      // 记录用户Socket连接
      this.recordUserSocket(userId, socket.id);

      // 加入默认房间
      socket.join(`user:${userId}`);

      // 加入部门房间（如果有部门信息）
      const departmentId = (socket.data as SocketData).departmentId;
      if (departmentId) {
        socket.join(`department:${departmentId}`);
        logger.info(`用户 ${userName} 加入部门房间: ${departmentId}`);
      }

      // ==================== 客户端事件监听 ====================

      /**
       * 加入房间
       * Event: join-room
       * Payload: { room: string }
       */
      socket.on('join-room', (data: { room: string }) => {
        socket.join(data.room);
        logger.info(`用户 ${userName} 加入房间: ${data.room}`);

        // 确认加入成功
        socket.emit('room-joined', {
          room: data.room,
          message: `已加入房间: ${data.room}`,
        });
      });

      /**
       * 离开房间
       * Event: leave-room
       * Payload: { room: string }
       */
      socket.on('leave-room', (data: { room: string }) => {
        socket.leave(data.room);
        logger.info(`用户 ${userName} 离开房间: ${data.room}`);

        socket.emit('room-left', {
          room: data.room,
          message: `已离开房间: ${data.room}`,
        });
      });

      /**
       * 发送消息到房间
       * Event: room-message
       * Payload: { room: string, event: string, payload: any }
       */
      socket.on('room-message', (data: { room: string; event: string; payload: any }) => {
        socket.to(data.room).emit(data.event, {
          ...data.payload,
          senderId: userId,
          senderName: userName,
          timestamp: new Date().toISOString(),
        });
        logger.debug(`房间消息: ${data.room} - ${data.event}`);
      });

      /**
       * 心跳响应
       */
      socket.on('pong', () => {
        // 更新用户最后活跃时间
        // 可以在这里维护一个用户活跃时间映射
      });

      // ==================== 连接断开处理 ====================

      socket.on('disconnect', (reason) => {
        logger.info(`用户断开连接: ${userName} (${userId}) - 原因: ${reason}`);

        // 移除Socket记录
        this.removeUserSocket(userId, socket.id);

        // 如果用户所有连接都断开，清理相关数据
        const userSockets = this.userSockets.get(userId);
        if (!userSockets || userSockets.size === 0) {
          this.userSockets.delete(userId);
          logger.info(`用户 ${userName} 所有连接已断开`);
        }
      });

      socket.on('error', (error) => {
        logger.error(`Socket错误 [${userName}]: ${error}`);
      });
    });
  }

  /**
   * 记录用户Socket连接
   */
  private recordUserSocket(userId: string, socketId: string): void {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
  }

  /**
   * 移除用户Socket记录
   */
  private removeUserSocket(userId: string, socketId: string): void {
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  /**
   * ==================== 公共方法（供业务层调用） ====================
   */

  /**
   * 广播资源更新（推送给所有在线用户）
   *
   * @param data - 资源更新数据
   *
   * @example
   * ```typescript
   * wsGateway.broadcastResourceUpdate({
   *   id: 'xxx',
   *   status: 'online',
   *   lng: 116.404,
   *   lat: 39.915
   * });
   * ```
   */
  public broadcastResourceUpdate(data: {
    id: string;
    status: string;
    lng: number;
    lat: number;
    properties?: any;
  }): void {
    this.io.emit('resource:update', {
      ...data,
      timestamp: new Date().toISOString(),
    });
    logger.debug(`广播资源更新: ${data.id}`);
  }

  /**
   * 批量广播资源更新
   *
   * @param updates - 资源更新数组
   */
  public broadcastResourceBatch(updates: Array<{
    id: string;
    status: string;
    lng: number;
    lat: number;
  }>): void {
    this.io.emit('resource:batch', {
      updates,
      count: updates.length,
      timestamp: new Date().toISOString(),
    });
    logger.debug(`批量广播资源更新: ${updates.length}条`);
  }

  /**
   * 发送消息给特定用户
   *
   * @param userId - 用户ID
   * @param event - 事件名称
   * @param data - 消息数据
   *
   * @example
   * ```typescript
   * wsGateway.sendToUser('user-123', 'notification', {
   *   title: '新事件',
   *   content: 'xxx'
   * });
   * ```
   */
  public sendToUser(userId: string, event: string, data: any): void {
    const sockets = this.userSockets.get(userId);
    if (sockets && sockets.size > 0) {
      sockets.forEach(socketId => {
        this.io.to(socketId).emit(event, data);
      });
      logger.debug(`发送消息给用户 ${userId}: ${event}`);
    } else {
      logger.warn(`用户 ${userId} 无在线连接`);
    }
  }

  /**
   * 发送消息到房间
   *
   * @param room - 房间名称
   * @param event - 事件名称
   * @param data - 消息数据
   *
   * @example
   * ```typescript
   * // 发送到部门房间
   * wsGateway.sendToRoom('department:dept-001', 'incident:new', incidentData);
   * ```
   */
  public sendToRoom(room: string, event: string, data: any): void {
    this.io.to(room).emit(event, data);
    logger.debug(`发送消息到房间 ${room}: ${event}`);
  }

  /**
   * 广播新事件
   *
   * @param incidentData - 事件数据
   */
  public broadcastNewIncident(incidentData: {
    id: string;
    type: string;
    level: string;
    title: string;
    lng: number;
    lat: number;
  }): void {
    this.io.emit('incident:new', {
      ...incidentData,
      timestamp: new Date().toISOString(),
    });
    logger.info(`广播新事件: ${incidentData.id} - ${incidentData.title}`);
  }

  /**
   * 广播系统告警
   *
   * @param alertData - 告警数据
   */
  public broadcastAlert(alertData: {
    type: string;
    level: string;
    title: string;
    content: string;
  }): void {
    this.io.emit('alert:broadcast', {
      ...alertData,
      timestamp: new Date().toISOString(),
    });
    logger.info(`广播系统告警: ${alertData.type} - ${alertData.title}`);
  }

  /**
   * ==================== 心跳检测 ====================
   */

  /**
   * 启动心跳检查
   * 定期发送ping，检测无响应的连接并断开
   */
  private startHeartbeatCheck(): void {
    setInterval(() => {
      // 获取所有连接的Socket
      const sockets = this.io.sockets.sockets;

      sockets.forEach((socket: Socket) => {
        // 发送心跳ping
        socket.emit('ping', {
          timestamp: Date.now(),
        });
      });

      logger.debug(`心跳检查: 当前在线用户数 ${this.userSockets.size}`);
    }, config.ws.pingInterval);
  }

  /**
   * 获取在线用户统计
   */
  public getOnlineStats(): {
    totalUsers: number;
    totalConnections: number;
    userSockets: Array<{ userId: string; connectionCount: number }>;
  } {
    let totalConnections = 0;
    const userSockets: Array<{ userId: string; connectionCount: number }> = [];

    this.userSockets.forEach((sockets, userId) => {
      totalConnections += sockets.size;
      userSockets.push({
        userId,
        connectionCount: sockets.size,
      });
    });

    return {
      totalUsers: this.userSockets.size,
      totalConnections,
      userSockets,
    };
  }
}

export default WebSocketGateway;
