/**
 * ============================================
 * 全局类型定义
 * ============================================
 *
 * @author Emergency Dispatch Team
 */

// ==================
// 用户类型
// ==================
export interface User {
  userId: string;
  username: string;
  realName: string;
  phone?: string;
  email?: string;
  avatar?: string;
  role: UserRole;
  departmentId?: string;
  departmentName?: string;
  status: UserStatus;
  lastLoginAt?: string;
}

export type UserRole = 'admin' | 'operator' | 'dispatcher' | 'viewer';
export type UserStatus = 'active' | 'inactive' | 'locked';

// ==================
// 资源类型
// ==================
export interface Resource {
  id: string;
  resourceTypeId: string;
  resourceName: string;
  resourceCode?: string;
  resourceStatus: ResourceStatus;
  longitude: number;
  latitude: number;
  altitude?: number;
  speed?: number;
  direction?: number;
  properties?: Record<string, any>;
  departmentId?: string;
  departmentName?: string;
  typeName?: string;
  iconUrl?: string;
  color?: string;
  contactPerson?: string;
  contactPhone?: string;
  updatedAt?: string;
}

export type ResourceStatus = 'online' | 'offline' | 'alarm' | 'processing';

export interface ResourceType {
  id: string;
  typeCode: string;
  typeName: string;
  category: string;
  iconUrl?: string;
  color?: string;
  sortOrder: number;
}

// ==================
// 事件类型
// ==================
export interface Incident {
  id: string;
  incidentType: IncidentType;
  incidentLevel: IncidentLevel;
  title: string;
  description?: string;
  longitude: number;
  latitude: number;
  address?: string;
  incidentStatus: IncidentStatus;
  reportedBy?: string;
  handlerId?: string;
  reportedAt: string;
  resolvedAt?: string;
}

export type IncidentType = 'fire' | 'traffic' | 'medical' | 'public_security' | 'natural_disaster';
export type IncidentLevel = 'minor' | 'major' | 'severe';
export type IncidentStatus = 'pending' | 'processing' | 'resolved' | 'closed';

export interface IncidentListItem extends Omit<Incident, 'incidentType' | 'incidentLevel' | 'incidentStatus' | 'reportedBy' | 'handlerId' | 'reportedAt' | 'resolvedAt'> {
  type: IncidentType;
  level: IncidentLevel;
  status: IncidentStatus;
  location?: string;
  reporterName?: string;
  assigneeName?: string;
  reportedAt: string;
  occurredAt?: string;
  closedAt?: string;
  createdAt: string;
}

// ==================
// 空间分析类型
// ==================
export interface IsochroneParams {
  lng: number;
  lat: number;
  minutes: number[];
  profile?: 'car' | 'pedestrian' | 'bicycle';
}

export interface IsochroneResult {
  minute: number;
  polygon: number[][][];
  properties: {
    area: number;
  };
}

export interface BufferParams {
  lng: number;
  lat: number;
  radius: number;
  rings?: number;
  unit?: 'meters' | 'kilometers';
}

// ==================
// 调度任务类型
// ==================
export interface DispatchTask {
  id: string;
  taskType: string;
  taskStatus: TaskStatus;
  priority: number;
  resourceId: string;
  incidentId: string;
  routeGeojson?: any;
  distance?: number;
  estimatedDuration?: number;
  estimatedArrival?: string;
  actualArrival?: string;
  dispatcherId: string;
  description?: string;
  createdAt: string;
  completedAt?: string;
}

export type TaskStatus = 'pending' | 'executing' | 'completed' | 'cancelled';

export interface DispatchTaskListItem {
  id: string;
  incidentId?: string;
  incidentTitle?: string;
  taskType: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  resourceId?: string;
  resourceName?: string;
  assignedTo?: string;
  assigneeName?: string;
  creatorName?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  createdAt: string;
}

// ==================
// 轨迹类型
// ==================
export interface TrajectoryPoint {
  longitude: number;
  latitude: number;
  altitude?: number;
  speed?: number;
  direction?: number;
  recordedAt: string;
}

export interface Trajectory {
  resourceId: string;
  points: TrajectoryPoint[];
  startTime: string;
  endTime: string;
}

// ==================
// WebSocket消息类型
// ==================
export interface ResourceUpdate {
  id: string;
  status: string;
  lng: number;
  lat: number;
  properties?: any;
  timestamp: string;
}

export interface ResourceBatchUpdate {
  updates: ResourceUpdate[];
  count: number;
  timestamp: string;
}

export interface IncidentNew {
  id: string;
  type: string;
  level: string;
  title: string;
  lng: number;
  lat: number;
  timestamp: string;
}

export interface IncidentUpdate {
  id: string;
  status: string;
  timestamp: string;
}

export interface TaskCreated {
  id: string;
  resourceId: string;
  incidentId: string;
  timestamp: string;
}

export interface TaskUpdate {
  id: string;
  status: string;
  timestamp: string;
}

export interface IsochroneComplete {
  id: string;
  results: any[];
  timestamp: string;
}

export interface RoomJoined {
  room: string;
  timestamp: string;
}

export interface RoomLeft {
  room: string;
  timestamp: string;
}

export interface PingMessage {
  timestamp: number;
}

export interface AlertBroadcast {
  type: string;
  level: string;
  title: string;
  content: string;
  timestamp: string;
}

// ==================
// API响应类型
// ==================
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data?: T;
}

export interface PaginationResponse<T = any> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}
