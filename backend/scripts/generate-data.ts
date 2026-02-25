/**
 * ============================================
 * 批量数据生成脚本
 * ============================================
 *
 * 功能说明：
 * - 生成5000+条示例数据
 * - 支持批量插入到数据库
 * - 包括：资源、轨迹、事件、热力图等数据
 *
 * @author Emergency Dispatch Team
 */

import dotenv from 'dotenv';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import { help } from '@turf/turf';
import fs from 'fs';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env') });

// 数据库连接
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'emergency_dispatch',
  charset: 'utf8mb4',
  timezone: '+08:00',
  connectionLimit: 10,
});

async function query<T = any>(sql: string, params?: any[]): Promise<T> {
  const connection = await pool.getConnection();
  try {
    const [results] = await connection.execute(sql, params);
    return results as T;
  } finally {
    connection.release();
  }
}

// 生成随机数据的工具函数
const random = {
  int: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min,
  float: (min: number, max: number, decimals = 2) => parseFloat((Math.random() * (max - min) + min).toFixed(decimals)),
  coord: (center: { lng: number; lat: number }, radius = 0.01) => ({
    lng: center.lng + (Math.random() - 0.5) * radius,
    lat: center.lat + (Math.random() - 0.5) * radius,
  }),
  item: <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)],
  date: (start: Date, end: Date) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())),
  boolean: () => Math.random() < 0.5,
};

// Beijing area bounding box
const BEIJING_CENTER = { lng: 116.404, lat: 39.915 };

/**
 * 生成资源数据 (1000条)
 */
async function generateResources(count: number = 1000) {
  console.log(`\n生成 ${count} 条资源数据...`);

  // 获取资源类型
  const resourceTypes = await query<any[]>('SELECT id, type_code, category FROM t_resource_type');

  let resources = [];
  const batchSize = 100;

  for (let i = 0; i < count; i++) {
    const type = random.item(resourceTypes);
    const category = type.category;

    let resourceName = '';
    let resourceCode = '';

    if (category === 'vehicle') {
      const vehicleNum = String(random.int(1, 999)).padStart(3, '0');
      if (type.type_code === 'ambulance') {
        resourceName = `救护车-${vehicleNum}`;
        resourceCode = `AMB-${vehicleNum}`;
      } else if (type.type_code === 'fire_truck') {
        resourceName = `消防车-${vehicleNum}`;
        resourceCode = `FIRE-${vehicleNum}`;
      } else {
        resourceName = `警车-${vehicleNum}`;
        resourceCode = `POL-${vehicleNum}`;
      }
    } else if (category === 'person') {
      const names = ['张伟', '王芳', '李娜', '刘洋', '陈静', '杨强', '赵敏', '孙杰', '周勇', '吴婷'];
      resourceName = `${random.item(names)}-${random.int(1, 100)}`;
      resourceCode = `PER-${random.int(10000, 99999)}`;
    } else if (category === 'sensor') {
      resourceName = `传感器-${random.int(1000, 9999)}`;
      resourceCode = `SEN-${random.int(100000, 999999)}`;
    }

    const status = random.item(['online', 'online', 'online', 'offline', 'alarm']) as string;
    const coord = random.coord(BEIJING_CENTER, 0.1);

    resources.push({
      id: uuidv4(),
      resource_type_id: type.id,
      resource_name: resourceName,
      resource_code: resourceCode,
      resource_status: status,
      longitude: coord.lng,
      latitude: coord.lat,
      speed: status === 'online' ? random.float(0, 80) : 0,
      direction: random.float(0, 360),
      properties: JSON.stringify({
        manufacturer: random.item(['大疆', '科达', '海康', '大华', '宇视']),
        model: `MK-${random.int(1000, 9999)}`,
        purchaseDate: random.date(new Date('2020-01-01'), new Date()).toISOString().split('T')[0],
      }),
      department_id: null,
    });

    // 批量插入
    if (resources.length >= batchSize) {
      await batchInsertResources(resources);
      resources = [];
    }
  }

  // 插入剩余数据
  if (resources.length > 0) {
    await batchInsertResources(resources);
  }

  console.log(`✅ 资源数据生成完成: ${count} 条`);
}

/**
 * 批量插入资源
 */
async function batchInsertResources(resources: any[]) {
  const values = resources.map(r => [
    r.id,
    r.resource_type_id,
    r.resource_name,
    r.resource_code,
    r.resource_status,
    r.longitude,
    r.latitude,
    r.speed,
    r.direction,
    r.properties,
    r.department_id,
  ]);

  await query(
    `INSERT IGNORE INTO t_resource (
      id, resource_type_id, resource_name, resource_code, resource_status,
      longitude, latitude, speed, direction, properties, department_id
    ) VALUES ${values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}`,
    values.flat()
  );
}

/**
 * 生成事件数据 (500条)
 */
async function generateIncidents(count: number = 500) {
  console.log(`\n生成 ${count} 条事件数据...`);

  const incidentTypes = ['fire', 'traffic', 'medical', 'public_security', 'natural_disaster'];
  const levels = ['minor', 'major', 'severe'];
  const statuses = ['pending', 'processing', 'resolved', 'closed'];

  let incidents = [];
  const batchSize = 50;

  for (let i = 0; i < count; i++) {
    const coord = random.coord(BEIJING_CENTER, 0.08);
    const level = random.item(levels);
    const type = random.item(incidentTypes);

    const titles = {
      fire: ['商铺火灾', '住宅起火', '车辆自燃', '电气故障引发火灾', '厨房火灾'],
      traffic: ['连环追尾', '车辆抛锚', '道路施工', '交通拥堵', '桥梁事故'],
      medical: ['突发疾病', '交通事故伤员', '食物中毒', '流感爆发', '急病求助'],
      public_security: ['治安事件', '盗窃案', '纠纷斗殴', '非法集会', '可疑人员'],
      natural_disaster: ['暴雨内涝', '大风天气', '高温预警', '空气污染', '地震预警'],
    };

    incidents.push({
      id: uuidv4(),
      incident_type: type,
      incident_level: level,
      title: `${random.item(titles[type])}-${random.int(1, 999)}`,
      description: `这是一起${type === 'fire' ? '火灾' : type === 'traffic' ? '交通' : type}事件，需要紧急处理`,
      longitude: coord.lng,
      latitude: coord.lat,
      address: `北京市朝阳区某某街道${random.int(1, 999)}号`,
      incident_status: random.item(statuses),
      reported_by: null,
      handler_id: null,
      reported_at: random.date(new Date('2024-01-01'), new Date()),
      resolved_at: null,
    });

    if (incidents.length >= batchSize) {
      await batchInsertIncidents(incidents);
      incidents = [];
    }
  }

  if (incidents.length > 0) {
    await batchInsertIncidents(incidents);
  }

  console.log(`✅ 事件数据生成完成: ${count} 条`);
}

async function batchInsertIncidents(incidents: any[]) {
  const values = incidents.map(i => [
    i.id,
    i.incident_type,
    i.incident_level,
    i.title,
    i.description,
    i.longitude,
    i.latitude,
    i.address,
    i.incident_status,
    i.reported_by,
    i.handler_id,
    i.reported_at,
    i.resolved_at,
  ]);

  await query(
    `INSERT INTO t_incident (
      id, incident_type, incident_level, title, description, longitude, latitude,
      address, incident_status, reported_by, handler_id, reported_at, resolved_at
    ) VALUES ${values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}`,
    values.flat()
  );
}

/**
 * 生成轨迹数据 (3000条)
 */
async function generateTrajectories(count: number = 3000) {
  console.log(`\n生成 ${count} 条轨迹数据...`);

  // 获取资源ID
  const resources = await query<any[]>('SELECT id FROM t_resource LIMIT 100');
  if (resources.length === 0) {
    console.log('⚠️  没有资源数据，跳过轨迹生成');
    return;
  }

  let trajectories = [];
  const batchSize = 200;

  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  for (let i = 0; i < count; i++) {
    const resource = random.item(resources);
    const baseTime = now - random.int(0, 7) * oneDay;

    // 每个资源生成多条轨迹点
    const pointsPerResource = random.int(10, 50);
    for (let j = 0; j < pointsPerResource; j++) {
      const timeOffset = random.int(0, 3600000); // 1小时内
      const coord = random.coord(BEIJING_CENTER, 0.02);

      trajectories.push({
        id: uuidv4(),
        resource_id: resource.id,
        task_id: null,
        longitude: coord.lng,
        latitude: coord.lat,
        altitude: random.float(0, 100, 1),
        speed: random.float(0, 100, 1),
        direction: random.float(0, 360, 1),
        accuracy: random.float(1, 20, 1),
        recorded_at: new Date(baseTime + timeOffset),
        received_at: new Date(),
      });
    }

    if (trajectories.length >= batchSize) {
      await batchInsertTrajectories(trajectories);
      trajectories = [];
    }
  }

  if (trajectories.length > 0) {
    await batchInsertTrajectories(trajectories);
  }

  console.log(`✅ 轨迹数据生成完成: ${count} 条`);
}

async function batchInsertTrajectories(trajectories: any[]) {
  const values = trajectories.map(t => [
    t.id,
    t.resource_id,
    t.task_id,
    t.longitude,
    t.latitude,
    t.altitude,
    t.speed,
    t.direction,
    t.accuracy,
    t.recorded_at,
    t.received_at,
  ]);

  await query(
    `INSERT INTO t_trajectory (
      id, resource_id, task_id, longitude, latitude, altitude, speed,
      direction, accuracy, recorded_at, received_at
    ) VALUES ${values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}`,
    values.flat()
  );
}

/**
 * 生成热力图数据 (1000条)
 */
async function generateHeatmapData(count: number = 1000) {
  console.log(`\n生成 ${count} 条热力图数据...`);

  const dataTypes = ['alarm', 'incident', 'resource', 'density'];
  let heatmapData = [];
  const batchSize = 100;

  for (let i = 0; i < count; i++) {
    const coord = random.coord(BEIJING_CENTER, 0.05);

    heatmapData.push({
      id: uuidv4(),
      data_type: random.item(dataTypes),
      longitude: coord.lng,
      latitude: coord.lat,
      intensity: random.int(1, 100),
      weight: random.float(0.5, 2.0, 2),
      event_time: random.date(new Date('2024-01-01'), new Date()),
      metadata: JSON.stringify({
        source: random.item(['manual', 'automatic', 'sensor', 'user_report']),
        confidence: random.float(0.6, 1.0, 2),
      }),
    });

    if (heatmapData.length >= batchSize) {
      await batchInsertHeatmap(heatmapData);
      heatmapData = [];
    }
  }

  if (heatmapData.length > 0) {
    await batchInsertHeatmap(heatmapData);
  }

  console.log(`✅ 热力图数据生成完成: ${count} 条`);
}

async function batchInsertHeatmap(data: any[]) {
  const values = data.map(d => [
    d.id,
    d.data_type,
    d.longitude,
    d.latitude,
    d.intensity,
    d.weight,
    d.event_time,
  ]);

  await query(
    `INSERT INTO t_heatmap_data (
      id, data_type, longitude, latitude, intensity, weight, event_time
    ) VALUES ${values.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ')}`,
    values.flat()
  );
}

/**
 * 生成敏感建筑数据 (200条)
 */
async function generateSensitiveBuildings(count: number = 200) {
  console.log(`\n生成 ${count} 条敏感建筑数据...`);

  const buildingTypes = [
    { code: 'school', name: '学校' },
    { code: 'hospital', name: '医院' },
    { code: 'station', name: '地铁站' },
    { code: 'mall', name: '商场' },
    { code: 'government', name: '政府机关' },
  ];

  let buildings = [];
  const batchSize = 50;

  for (let i = 0; i < count; i++) {
    const type = random.item(buildingTypes);
    const coord = random.coord(BEIJING_CENTER, 0.06);

    const schoolNames = ['第一中学', '第二小学', '实验小学', '育才学校', '朝阳学校'];
    const hospitalNames = ['协和医院', '朝阳医院', '人民医院', '中医院', '妇幼保健院'];
    const stationNames = ['国贸站', '望京站', '三里屯站', '朝阳门站', '东直门站'];
    const mallNames = ['万达广场', '大悦城', 'SKP', '侨福芳草地', '三里屯太古里'];

    let name = '';
    if (type.code === 'school') name = random.item(schoolNames);
    else if (type.code === 'hospital') name = random.item(hospitalNames);
    else if (type.code === 'station') name = random.item(stationNames);
    else if (type.code === 'mall') name = random.item(mallNames);
    else name = `${random.item(['区政府', '街道办', '派出所', '消防站'])}-${random.int(1, 99)}`;

    buildings.push({
      id: uuidv4(),
      building_type: type.code,
      building_name: name,
      longitude: coord.lng,
      latitude: coord.lat,
      address: `北京市朝阳区某某街道${random.int(1, 999)}号`,
      capacity: random.int(100, 5000),
      area: random.float(500, 50000, 2),
      properties: JSON.stringify({
        floors: random.int(1, 30),
        hasParking: random.boolean(),
        hasElevator: random.boolean(),
      }),
    });

    if (buildings.length >= batchSize) {
      await batchInsertBuildings(buildings);
      buildings = [];
    }
  }

  if (buildings.length > 0) {
    await batchInsertBuildings(buildings);
  }

  console.log(`✅ 敏感建筑数据生成完成: ${count} 条`);
}

async function batchInsertBuildings(buildings: any[]) {
  const values = buildings.map(b => [
    b.id,
    b.building_type,
    b.building_name,
    b.longitude,
    b.latitude,
    b.address,
    b.capacity,
    b.area,
    b.properties,
  ]);

  await query(
    `INSERT INTO t_sensitive_building (
      id, building_type, building_name, longitude, latitude, address, capacity, area, properties
    ) VALUES ${values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}`,
    values.flat()
  );
}

/**
 * 生成通知数据 (1000条)
 */
async function generateNotifications(count: number = 1000) {
  console.log(`\n生成 ${count} 条通知数据...`);

  // 获取用户ID
  const users = await query<any[]>('SELECT id FROM t_user LIMIT 50');
  if (users.length === 0) {
    console.log('⚠️  没有用户数据，跳过通知生成');
    return;
  }

  const types = ['incident', 'alert', 'system', 'task'];
  const titles = {
    incident: ['新事件上报', '事件状态更新', '事件升级提醒'],
    alert: ['资源离线警告', '区域密度过高', '设备故障'],
    system: ['系统维护通知', '数据备份完成', '系统升级'],
    task: ['新调度任务', '任务状态更新', '任务完成'],
  };

  let notifications = [];
  const batchSize = 100;

  for (let i = 0; i < count; i++) {
    const type = random.item(types);

    notifications.push({
      id: uuidv4(),
      receiver_id: random.item(users).id,
      sender_id: null,
      notification_type: type,
      title: random.item(titles[type]),
      content: `这是一条${type}相关的通知消息`,
      related_id: uuidv4(),
      read_status: 'unread',
      sent_at: random.date(new Date('2024-01-01'), new Date()),
      read_at: null,
    });

    if (notifications.length >= batchSize) {
      await batchInsertNotifications(notifications);
      notifications = [];
    }
  }

  if (notifications.length > 0) {
    await batchInsertNotifications(notifications);
  }

  console.log(`✅ 通知数据生成完成: ${count} 条`);
}

async function batchInsertNotifications(notifications: any[]) {
  const values = notifications.map(n => [
    n.id,
    n.receiver_id,
    n.sender_id,
    n.notification_type,
    n.title,
    n.content,
    n.related_id,
    n.read_status,
    n.sent_at,
    n.read_at,
  ]);

  await query(
    `INSERT INTO t_notification (
      id, receiver_id, sender_id, notification_type, title, content,
      related_id, read_status, sent_at, read_at
    ) VALUES ${values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}`,
    values.flat()
  );
}

/**
 * 生成系统日志 (500条)
 */
async function generateSystemLogs(count: number = 500) {
  console.log(`\n生成 ${count} 条系统日志...`);

  const actions = ['login', 'logout', 'create', 'update', 'delete'];
  const modules = ['auth', 'resource', 'incident', 'dispatch', 'user'];
  const statuses = ['success', 'failure'];

  let logs = [];
  const batchSize = 100;

  for (let i = 0; i < count; i++) {
    const status = random.item(statuses);

    logs.push({
      id: uuidv4(),
      user_id: null,
      username: random.item(['admin', 'operator', 'dispatcher', 'viewer']),
      action: random.item(actions),
      module: random.item(modules),
      method: `POST /api/v1/${random.item(modules)}/${random.item(actions)}`,
      params: JSON.stringify({ test: 'data' }),
      ip_address: `192.168.${random.int(1, 255)}.${random.int(1, 255)}`,
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      status: status,
      error_message: status === 'failure' ? 'Connection timeout' : null,
      execution_time: random.int(10, 500),
    });

    if (logs.length >= batchSize) {
      await batchInsertLogs(logs);
      logs = [];
    }
  }

  if (logs.length > 0) {
    await batchInsertLogs(logs);
  }

  console.log(`✅ 系统日志生成完成: ${count} 条`);
}

async function batchInsertLogs(logs: any[]) {
  const values = logs.map(l => [
    l.id,
    l.user_id,
    l.username,
    l.action,
    l.module,
    l.method,
    l.params,
    l.ip_address,
    l.user_agent,
    l.status,
    l.error_message,
    l.execution_time,
  ]);

  await query(
    `INSERT INTO t_system_log (
      id, user_id, username, action, module, method, params,
      ip_address, user_agent, status, error_message, execution_time
    ) VALUES ${values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}`,
    values.flat()
  );
}

/**
 * 生成调度任务 (200条)
 */
async function generateDispatchTasks(count: number = 200) {
  console.log(`\n生成 ${count} 条调度任务...`);

  // 获取资源和事件
  const resources = await query<any[]>('SELECT id FROM t_resource LIMIT 100');
  const incidents = await query<any[]>('SELECT id FROM t_incident LIMIT 50');
  const users = await query<any[]>('SELECT id FROM t_user WHERE role IN ("admin", "dispatcher") LIMIT 10');

  if (resources.length === 0 || incidents.length === 0) {
    console.log('⚠️  缺少资源或事件数据，跳过调度任务生成');
    return;
  }

  let tasks = [];
  const batchSize = 50;

  for (let i = 0; i < count; i++) {
    tasks.push({
      id: uuidv4(),
      task_type: random.item(['rescue', 'transport', 'support']),
      task_status: random.item(['pending', 'executing', 'completed', 'cancelled']),
      priority: random.int(0, 10),
      resource_id: random.item(resources).id,
      incident_id: random.item(incidents).id,
      route_geojson: null,
      distance: random.float(100, 50000, 2),
      estimated_duration: random.int(300, 3600),
      estimated_arrival: null,
      actual_arrival: null,
      dispatcher_id: random.item(users).id,
      description: `紧急调度任务 - ${random.int(1, 999)}`,
      remark: null,
    });

    if (tasks.length >= batchSize) {
      await batchInsertTasks(tasks);
      tasks = [];
    }
  }

  if (tasks.length > 0) {
    await batchInsertTasks(tasks);
  }

  console.log(`✅ 调度任务生成完成: ${count} 条`);
}

async function batchInsertTasks(tasks: any[]) {
  const values = tasks.map(t => [
    t.id,
    t.task_type,
    t.task_status,
    t.priority,
    t.resource_id,
    t.incident_id,
    t.route_geojson,
    t.distance,
    t.estimated_duration,
    t.estimated_arrival,
    t.actual_arrival,
    t.dispatcher_id,
    t.description,
    t.remark,
  ]);

  await query(
    `INSERT INTO t_dispatch_task (
      id, task_type, task_status, priority, resource_id, incident_id,
      route_geojson, distance, estimated_duration, estimated_arrival,
      actual_arrival, dispatcher_id, description, remark
    ) VALUES ${values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ')}`,
    values.flat()
  );
}

/**
 * 生成标绘数据 (100条)
 */
async function generatePlottings(count: number = 100) {
  console.log(`\n生成 ${count} 条标绘数据...`);

  const plottingTypes = ['route', 'arrow', 'polygon', 'circle', 'point'];
  const users = await query<any[]>('SELECT id FROM t_user LIMIT 10');
  const incidents = await query<any[]>('SELECT id FROM t_incident LIMIT 50');

  if (users.length === 0) {
    console.log('⚠️  没有用户数据，跳过标绘生成');
    return;
  }

  let plottings = [];
  const batchSize = 50;

  for (let i = 0; i < count; i++) {
    const type = random.item(plottingTypes);
    const coord = random.coord(BIJING_CENTER, 0.03);

    let geometry: any = {};
    if (type === 'point') {
      geometry = {
        type: 'Point',
        coordinates: [coord.lng, coord.lat],
      };
    } else if (type === 'circle') {
      geometry = {
        type: 'Polygon',
        coordinates: [[
          [coord.lng, coord.lat],
          [coord.lng + 0.01, coord.lat],
          [coord.lng + 0.01, coord.lat + 0.01],
          [coord.lng, coord.lat + 0.01],
          [coord.lng, coord.lat],
        ]],
      };
    } else if (type === 'route') {
      const start = random.coord(BEIJING_CENTER, 0.02);
      const end = random.coord(BEIJING_CENTER, 0.02);
      geometry = {
        type: 'LineString',
        coordinates: [
          [start.lng, start.lat],
          [start.lng + 0.001, start.lat + 0.001],
          [end.lng - 0.001, end.lat - 0.001],
          [end.lng, end.lat],
        ],
      };
    } else {
      geometry = {
        type: type,
        coordinates: [],
      };
    }

    plottings.push({
      id: uuidv4(),
      plotting_type: type,
      plotting_name: `${type}-${random.int(1, 999)}`,
      geometry: JSON.stringify(geometry),
      properties: JSON.stringify({
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
        width: random.int(1, 10),
      }),
      creator_id: random.item(users).id,
      incident_id: random.item(incidents).id || null,
    });

    if (plottings.length >= batchSize) {
      await batchInsertPlottings(plottings);
      plottings = [];
    }
  }

  if (plottings.length > 0) {
    await batchInsertPlottings(plottings);
  }

  console.log(`✅ 标绘数据生成完成: ${count} 条`);
}

async function batchInsertPlottings(plottings: any[]) {
  const values = plottings.map(p => [
    p.id,
    p.plotting_type,
    p.plotting_name,
    p.geometry,
    p.properties,
    p.creator_id,
    p.incident_id,
  ]);

  await query(
    `INSERT INTO t_plotting (
      id, plotting_type, plotting_name, geometry, properties, creator_id, incident_id
    ) VALUES ${values.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ')}`,
    values.flat()
  );
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║       批量数据生成工具                              ║');
    console.log('╚════════════════════════════════════════════════════╝\n');

    console.log('数据库配置:');
    console.log(`  主机: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    console.log(`  数据库: ${process.env.DB_NAME}`);
    console.log(`  用户: ${process.env.DB_USER}\n`);

    // 测试连接
    await query('SELECT 1');
    console.log('✅ 数据库连接成功！\n');

    const startTime = Date.now();

    // 生成各类数据
    await generateResources(1000);
    await generateIncidents(500);
    await generateTrajectories(3000);
    await generateHeatmapData(1000);
    await generateSensitiveBuildings(200);
    await generateNotifications(1000);
    await generateSystemLogs(500);
    await generateDispatchTasks(200);
    await generatePlottings(100);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    const totalCount = 1000 + 500 + 3000 + 1000 + 200 + 1000 + 500 + 200 + 100;

    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║                  数据生成完成！                        ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
    console.log(`总数据量: ${totalCount} 条`);
    console.log(`耗时: ${elapsed} 秒`);
    console.log(`平均速度: ${(totalCount / parseFloat(elapsed)).toFixed(0)} 条/秒\n`);

    // 统计各表数据量
    console.log('数据统计:');
    const tables = [
      't_resource', 't_incident', 't_trajectory', 't_heatmap_data',
      't_sensitive_building', 't_notification', 't_system_log',
      't_dispatch_task', 't_plotting',
    ];

    for (const table of tables) {
      const result = await query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`  ${table}: ${result[0].count} 条`);
    }

    console.log('\n✅ 所有数据生成完成！');
    await pool.end();
  } catch (error) {
    console.error('❌ 数据生成失败:', error);
    await pool.end();
    process.exit(1);
  }
}

main();
