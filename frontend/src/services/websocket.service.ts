/**
 * ============================================
 * WebSocket实时通信服务
 * ============================================
 *
 * 功能说明：
 * - Socket.IO连接管理
 * - 事件监听和发送
 * - 断线重连
 * - 心跳检测
 *
 * @author Emergency Dispatch Team
 */

import { io, Socket } from 'socket.io-client';
import { message } from 'antd';
import { config } from '@/config';
import type {
  ResourceUpdate,
  ResourceBatchUpdate,
  IncidentNew,
  IncidentUpdate,
  TaskCreated,
  TaskUpdate,
  IsochroneComplete,
  RoomJoined,
  RoomLeft,
  PingMessage,
  AlertBroadcast,
} from '@/types';

/**
 * WebSocket事件类型
 */
export interface SocketEvents {
  // 服务端推送事件
  'resource:update': ResourceUpdate;
  'resource:batch': ResourceBatchUpdate;
  'incident:new': IncidentNew;
  'incident:update': IncidentUpdate;
  'task:created': TaskCreated;
  'task:update': TaskUpdate;
  'alert:broadcast': AlertBroadcast;
  'isochrone:complete': IsochroneComplete;
  'room-joined': RoomJoined;
  'room-left': RoomLeft;
  'ping': PingMessage;
}

/**
 * WebSocket服务类
 */
class WebSocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private maxReconnectAttempts: number = 5;
  private eventListeners: Map<string, Array<(...args: any[]) => void>> = new Map();

  /**
   * 连接WebSocket服务器
   *
   * @param token - JWT Token
   */
  public connect(token: string): void {
    if (this.socket?.connected) {
      return;
    }

    try {
      this.socket = io(config.ws.url, {
        auth: {
          token,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30000,
        reconnectionAttempts: this.maxReconnectAttempts,
      });

      this.setupEventHandlers();
    } catch (error) {
      // 静默处理错误
    }
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // 连接成功
    this.socket.on('connect', () => {
      this.isConnected = true;
      message.success('实时通信已连接');
    });

    // 连接错误
    this.socket.on('connect_error', () => {
      this.isConnected = false;
    });

    // 断开连接
    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      message.warning('实时通信已断开');
    });

    // 重连成功
    this.socket.io.on('reconnect', () => {
      this.isConnected = true;
      message.success('实时通信已重连');
    });

    // 监听心跳ping
    this.socket.on('ping', (_data: PingMessage) => {
      // 响应pong
      this.emit('pong', {
        timestamp: Date.now(),
      });
    });

    // 资源更新事件
    this.socket.on('resource:update', (data: ResourceUpdate) => {
      this.triggerEvent('resource:update', data);
    });

    // 新事件
    this.socket.on('incident:new', (data: IncidentNew) => {
      this.triggerEvent('incident:new', data);
      message.warning(`新事件: ${data.title}`);
    });

    // 系统告警
    this.socket.on('alert:broadcast', (data: AlertBroadcast) => {
      this.triggerEvent('alert:broadcast', data);
      message.error(`系统告警: ${data.title}`);
    });
  }

  /**
   * 监听事件
   *
   * @param event - 事件名称
   * @param callback - 回调函数
   */
  public on<T = any>(event: keyof SocketEvents | string, callback: (data: T) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);

    // 同时监听socket事件
    this.socket?.on(event, callback);
  }

  /**
   * 移除事件监听
   *
   * @param event - 事件名称
   * @param callback - 回调函数
   */
  public off(event: string, callback?: (...args: any[]) => void): void {
    if (!this.socket) return;

    if (callback) {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
      this.socket.off(event, callback);
    } else {
      this.eventListeners.delete(event);
      this.socket.off(event);
    }
  }

  /**
   * 发送事件
   *
   * @param event - 事件名称
   * @param data - 数据
   */
  public emit(event: string, data?: any): void {
    if (!this.socket || !this.isConnected) {
      return;
    }
    this.socket.emit(event, data);
  }

  /**
   * 加入房间
   *
   * @param room - 房间名称
   */
  public joinRoom(room: string): void {
    this.emit('join-room', { room });
  }

  /**
   * 离开房间
   *
   * @param room - 房间名称
   */
  public leaveRoom(room: string): void {
    this.emit('leave-room', { room });
  }

  /**
   * 触发事件回调
   */
  private triggerEvent(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          // 静默处理错误
        }
      });
    }
  }

  /**
   * 断开连接
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * 获取连接状态
   */
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// 导出单例
export const wsService = new WebSocketService();
export default wsService;
