/**
 * ============================================
 * 测试数据插入脚本
 * ============================================
 * 总计: 12,000+ 条记录
 * 执行方式: npx tsx scripts/insert-test-data.ts
 * ============================================
 */

// 必须在任何导入之前加载环境变量
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

interface Counts {
  resources: number;
  incidents: number;
  trajectories: number;
  heatmap: number;
  buildings: number;
  notifications: number;
  logs: number;
  tasks: number;
  plottings: number;
}

async function main() {
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

  try {
    console.log('╔════════════════════════════════════════╗');
    console.log('║      测试数据插入工具                   ║');
    console.log('╚════════════════════════════════════════╝\n');

    // 测试连接
    console.log('测试数据库连接...');
    await pool.query('SELECT 1');
    console.log('✅ 数据库连接成功！\n');

    // 检查基础数据是否存在
    console.log('检查基础数据...');
    const [types] = await pool.query('SELECT COUNT(*) as count FROM t_resource_type');
    const [depts] = await pool.query('SELECT COUNT(*) as count FROM t_department');
    const [users] = await pool.query('SELECT COUNT(*) as count FROM t_user');

    const typeCount = (types as any)[0].count;
    const deptCount = (depts as any)[0].count;
    const userCount = (users as any)[0].count;

    if (typeCount === 0 || deptCount === 0 || userCount === 0) {
      console.log('❌ 基础数据缺失！\n');
      console.log('检测到以下问题：');
      if (typeCount === 0) console.log('  - t_resource_type 表为空');
      if (deptCount === 0) console.log('  - t_department 表为空');
      if (userCount === 0) console.log('  - t_user 表为空（缺少管理员账户）');
      console.log('\n请先运行以下命令初始化基础数据：');
      console.log('  npm run db:migrate');
      console.log('  npm run db:seed\n');
      await pool.end();
      process.exit(1);
    }

    console.log(`✅ 基础数据检查通过 (资源类型: ${typeCount}, 部门: ${deptCount}, 用户: ${userCount})\n`);

    // 获取真实的用户ID
    const [adminUsers] = await pool.query('SELECT id FROM t_user WHERE role="admin" LIMIT 1');
    const adminUserId = (adminUsers as any)[0]?.id;
    if (!adminUserId) {
      console.log('❌ 找不到管理员用户！');
      await pool.end();
      process.exit(1);
    }
    console.log(`✅ 管理员ID: ${adminUserId}\n`);

    const startTime = Date.now();

    // 1. 插入资源数据 (1,000条)
    console.log('插入 1,000 条资源数据...');
    await insertResources(pool);
    console.log('✅ 资源数据插入完成\n');

    // 2. 插入事件数据 (500条)
    console.log('插入 500 条事件数据...');
    await insertIncidents(pool, adminUserId);
    console.log('✅ 事件数据插入完成\n');

    // 3. 插入轨迹数据 (5,000条)
    console.log('插入 5,000 条轨迹数据...');
    await insertTrajectories(pool);
    console.log('✅ 轨迹数据插入完成\n');

    // 4. 插入热力图数据 (2,000条)
    console.log('插入 2,000 条热力图数据...');
    await insertHeatmapData(pool);
    console.log('✅ 热力图数据插入完成\n');

    // 5. 插入敏感建筑数据 (200条)
    console.log('插入 200 条敏感建筑数据...');
    await insertBuildings(pool);
    console.log('✅ 敏感建筑数据插入完成\n');

    // 6. 插入通知数据 (1,000条)
    console.log('插入 1,000 条通知数据...');
    await insertNotifications(pool, adminUserId);
    console.log('✅ 通知数据插入完成\n');

    // 7. 插入系统日志数据 (1,500条)
    console.log('插入 1,500 条系统日志数据...');
    await insertLogs(pool, adminUserId);
    console.log('✅ 系统日志数据插入完成\n');

    // 8. 插入调度任务数据 (300条)
    console.log('插入 300 条调度任务数据...');
    await insertTasks(pool, adminUserId);
    console.log('✅ 调度任务数据插入完成\n');

    // 9. 插入标绘数据 (200条)
    console.log('插入 200 条标绘数据...');
    await insertPlottings(pool, adminUserId);
    console.log('✅ 标绘数据插入完成\n');

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    // 统计数据
    console.log('═══════════════════════════════════════');
    console.log('数据插入统计：');
    console.log('═══════════════════════════════════════');
    const counts = await getCounts(pool);
    console.log(`  资源数据:      ${counts.resources.toLocaleString()} 条`);
    console.log(`  事件数据:      ${counts.incidents.toLocaleString()} 条`);
    console.log(`  轨迹数据:      ${counts.trajectories.toLocaleString()} 条`);
    console.log(`  热力图数据:    ${counts.heatmap.toLocaleString()} 条`);
    console.log(`  敏感建筑:      ${counts.buildings.toLocaleString()} 条`);
    console.log(`  通知消息:      ${counts.notifications.toLocaleString()} 条`);
    console.log(`  系统日志:      ${counts.logs.toLocaleString()} 条`);
    console.log(`  调度任务:      ${counts.tasks.toLocaleString()} 条`);
    console.log(`  标绘数据:      ${counts.plottings.toLocaleString()} 条`);
    console.log('═══════════════════════════════════════');
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    console.log(`  总计:          ${total.toLocaleString()} 条`);
    console.log('═══════════════════════════════════════');
    console.log(`\n✅ 所有数据插入完成！耗时: ${elapsed} 秒\n`);

  } finally {
    await pool.end();
  }
}

async function insertResources(pool: mysql.Pool) {
  const types = await pool.query('SELECT id FROM t_resource_type');
  const resourceTypes = types[0] as any[];
  const depts = await pool.query('SELECT id FROM t_department');
  const departments = depts[0] as any[];

  const resources = [];
  const batchSize = 100;

  // 救护车 (300条)
  for (let i = 1; i <= 300; i++) {
    const type = resourceTypes.find((t: any) => t.id.includes('ambulance')) || resourceTypes[0];
    const dept = departments.find((d: any) => d.id.includes('medical') || d.id.includes('001')) || departments[0];
    resources.push({
      id: uuidv4(),
      resource_type_id: type.id,
      resource_name: `救护车-${String(i).padStart(3, '0')}`,
      resource_code: `AMB-${String(i).padStart(3, '0')}`,
      resource_status: ['online', 'offline', 'alarm', 'processing'][Math.floor(Math.random() * 4)],
      longitude: 116.404 + (Math.random() - 0.5) * 0.2,
      latitude: 39.915 + (Math.random() - 0.5) * 0.2,
      speed: Math.random() * 80,
      direction: Math.random() * 360,
      properties: JSON.stringify({ manufacturer: '宇通', model: 'ZK5040XJH' }),
      department_id: dept.id,
    });
    if (resources.length >= batchSize) {
      await batchInsert(pool, 't_resource', resources);
      resources.length = 0;
    }
  }

  // 消防车 (300条)
  for (let i = 1; i <= 300; i++) {
    const type = resourceTypes.find((t: any) => t.id.includes('fire')) || resourceTypes[1] || resourceTypes[0];
    const dept = departments.find((d: any) => d.id.includes('fire') || d.id.includes('003')) || departments[0];
    resources.push({
      id: uuidv4(),
      resource_type_id: type.id,
      resource_name: `消防车-${String(i).padStart(3, '0')}`,
      resource_code: `FIRE-${String(i).padStart(3, '0')}`,
      resource_status: ['online', 'offline', 'alarm', 'processing'][Math.floor(Math.random() * 4)],
      longitude: 116.404 + (Math.random() - 0.5) * 0.2,
      latitude: 39.915 + (Math.random() - 0.5) * 0.2,
      speed: Math.random() * 80,
      direction: Math.random() * 360,
      properties: JSON.stringify({ manufacturer: '奔驰', model: 'Atego' }),
      department_id: dept.id,
    });
    if (resources.length >= batchSize) {
      await batchInsert(pool, 't_resource', resources);
      resources.length = 0;
    }
  }

  // 警车 (300条)
  for (let i = 1; i <= 300; i++) {
    const type = resourceTypes.find((t: any) => t.id.includes('police')) || resourceTypes[2] || resourceTypes[0];
    const dept = departments.find((d: any) => d.id.includes('traffic') || d.id.includes('004')) || departments[0];
    resources.push({
      id: uuidv4(),
      resource_type_id: type.id,
      resource_name: `警车-${String(i).padStart(3, '0')}`,
      resource_code: `POL-${String(i).padStart(3, '0')}`,
      resource_status: ['online', 'offline', 'alarm', 'processing'][Math.floor(Math.random() * 4)],
      longitude: 116.404 + (Math.random() - 0.5) * 0.2,
      latitude: 39.915 + (Math.random() - 0.5) * 0.2,
      speed: Math.random() * 80,
      direction: Math.random() * 360,
      properties: JSON.stringify({ manufacturer: '大众', model: '帕萨特' }),
      department_id: dept.id,
    });
    if (resources.length >= batchSize) {
      await batchInsert(pool, 't_resource', resources);
      resources.length = 0;
    }
  }

  // 传感器 (100条)
  for (let i = 1; i <= 100; i++) {
    const type = resourceTypes.find((t: any) => t.id.includes('sensor')) || resourceTypes[3] || resourceTypes[0];
    resources.push({
      id: uuidv4(),
      resource_type_id: type.id,
      resource_name: `传感器-${String(i).padStart(4, '0')}`,
      resource_code: `SEN-${String(100000 + i).padStart(6, '0')}`,
      resource_status: ['online', 'offline', 'alarm'][Math.floor(Math.random() * 3)],
      longitude: 116.404 + (Math.random() - 0.5) * 0.2,
      latitude: 39.915 + (Math.random() - 0.5) * 0.2,
      speed: 0,
      direction: 0,
      properties: JSON.stringify({ sensorType: '温度', location: '室内' }),
      department_id: null,
    });
  }

  if (resources.length > 0) {
    await batchInsert(pool, 't_resource', resources);
  }
}

async function insertIncidents(pool: mysql.Pool, adminUserId: string) {
  const incidents = [];
  const batchSize = 100;
  const types = ['火灾', '交通事故', '医疗急救', '自然灾害', '公共卫生', '社会安全'];
  const levels = ['minor', 'major', 'severe'];
  const statuses = ['pending', 'processing', 'resolved'];

  for (let i = 1; i <= 500; i++) {
    incidents.push({
      id: uuidv4(),
      incident_type: types[Math.floor(Math.random() * types.length)],
      incident_level: levels[Math.floor(Math.random() * levels.length)],
      title: `${types[Math.floor(Math.random() * types.length)]}-${['一般', '较大', '重大'][Math.floor(Math.random() * 3)]}事件-${String(i).padStart(4, '0')}`,
      description: '这是一起测试事件，需要紧急处理。',
      longitude: 116.404 + (Math.random() - 0.5) * 0.15,
      latitude: 39.915 + (Math.random() - 0.5) * 0.15,
      incident_status: statuses[Math.floor(Math.random() * statuses.length)],
      reported_by: adminUserId,
      handler_id: null,
      reported_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      resolved_at: null,
    });

    if (incidents.length >= batchSize) {
      await batchInsert(pool, 't_incident', incidents);
      incidents.length = 0;
    }
  }

  if (incidents.length > 0) {
    await batchInsert(pool, 't_incident', incidents);
  }
}

async function insertTrajectories(pool: mysql.Pool) {
  const [resources] = await pool.query('SELECT id FROM t_resource LIMIT 100');
  const resourceList = resources as any[];
  const trajectories = [];
  const batchSize = 200;

  for (let i = 1; i <= 5000; i++) {
    const resource = resourceList[Math.floor(Math.random() * resourceList.length)];
    trajectories.push({
      id: uuidv4(),
      resource_id: resource.id,
      task_id: null,
      longitude: 116.404 + (Math.random() - 0.5) * 0.1,
      latitude: 39.915 + (Math.random() - 0.5) * 0.1,
      speed: Math.random() * 100,
      direction: Math.random() * 360,
      altitude: Math.random() * 200,
      recorded_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      received_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    });

    if (trajectories.length >= batchSize) {
      await batchInsert(pool, 't_trajectory', trajectories);
      trajectories.length = 0;
    }
  }

  if (trajectories.length > 0) {
    await batchInsert(pool, 't_trajectory', trajectories);
  }
}

async function insertHeatmapData(pool: mysql.Pool) {
  const dataTypes = ['alarm', 'incident', 'resource', 'density'];
  const data = [];
  const batchSize = 200;

  for (let i = 1; i <= 2000; i++) {
    data.push({
      id: uuidv4(),
      data_type: dataTypes[Math.floor(Math.random() * dataTypes.length)],
      longitude: 116.404 + (Math.random() - 0.5) * 0.12,
      latitude: 39.915 + (Math.random() - 0.5) * 0.12,
      intensity: Math.floor(Math.random() * 100) + 1,
      weight: parseFloat((0.5 + Math.random() * 1.5).toFixed(2)),
      event_time: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    });

    if (data.length >= batchSize) {
      await batchInsert(pool, 't_heatmap_data', data);
      data.length = 0;
    }
  }

  if (data.length > 0) {
    await batchInsert(pool, 't_heatmap_data', data);
  }
}

async function insertBuildings(pool: mysql.Pool) {
  const buildingTypes = ['school', 'hospital', 'station', 'mall'];
  const buildings = [];
  const batchSize = 100;

  for (let i = 1; i <= 200; i++) {
    buildings.push({
      id: uuidv4(),
      building_type: buildingTypes[Math.floor(Math.random() * buildingTypes.length)],
      building_name: `测试建筑-${String(i).padStart(3, '0')}`,
      longitude: 116.404 + (Math.random() - 0.5) * 0.15,
      latitude: 39.915 + (Math.random() - 0.5) * 0.15,
      address: `北京市朝阳区测试路${100 + Math.floor(Math.random() * 900)}号`,
      capacity: 500 + Math.floor(Math.random() * 5000),
      area: parseFloat((1000 + Math.random() * 50000).toFixed(2)),
      properties: JSON.stringify({ floors: Math.floor(3 + Math.random() * 30) }),
    });

    if (buildings.length >= batchSize) {
      await batchInsert(pool, 't_sensitive_building', buildings);
      buildings.length = 0;
    }
  }

  if (buildings.length > 0) {
    await batchInsert(pool, 't_sensitive_building', buildings);
  }
}

async function insertNotifications(pool: mysql.Pool, adminUserId: string) {
  const notifTypes = ['incident', 'alert', 'system', 'task'];
  const notifications = [];
  const batchSize = 100;

  for (let i = 1; i <= 1000; i++) {
    const type = notifTypes[Math.floor(Math.random() * notifTypes.length)];
    notifications.push({
      id: uuidv4(),
      receiver_id: adminUserId,
      sender_id: null,
      notification_type: type,
      title: `${type === 'incident' ? '事件' : type === 'alert' ? '警告' : type === 'system' ? '系统' : '任务'}通知-${String(i).padStart(3, '0')}`,
      content: `这是一条${type}相关的测试通知`,
      related_id: uuidv4(),
      read_status: Math.random() > 0.5 ? 'read' : 'unread',
      sent_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      read_at: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
    });

    if (notifications.length >= batchSize) {
      await batchInsert(pool, 't_notification', notifications);
      notifications.length = 0;
    }
  }

  if (notifications.length > 0) {
    await batchInsert(pool, 't_notification', notifications);
  }
}

async function insertLogs(pool: mysql.Pool, adminUserId: string) {
  const actions = ['login', 'create', 'update', 'delete', 'query'];
  const modules = ['auth', 'resource', 'incident', 'dispatch', 'user'];
  const logs = [];
  const batchSize = 150;

  for (let i = 1; i <= 1500; i++) {
    logs.push({
      id: uuidv4(),
      user_id: adminUserId,
      username: 'admin',
      action: actions[Math.floor(Math.random() * actions.length)],
      module: modules[Math.floor(Math.random() * modules.length)],
      method: `${['GET', 'POST', 'PUT'][Math.floor(Math.random() * 3)]} /api/v1/${modules[Math.floor(Math.random() * modules.length)]}`,
      params: '{}',
      ip_address: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      status: Math.random() > 0.2 ? 'success' : 'failure',
      error_message: Math.random() > 0.8 ? 'Connection timeout' : null,
      execution_time: Math.floor(10 + Math.random() * 500),
    });

    if (logs.length >= batchSize) {
      await batchInsert(pool, 't_system_log', logs);
      logs.length = 0;
    }
  }

  if (logs.length > 0) {
    await batchInsert(pool, 't_system_log', logs);
  }
}

async function insertTasks(pool: mysql.Pool, adminUserId: string) {
  const taskTypes = ['dispatch', 'escort', 'support'];
  const statuses = ['pending', 'executing', 'completed', 'cancelled'];
  const [resources] = await pool.query('SELECT id FROM t_resource LIMIT 100');
  const [incidents] = await pool.query('SELECT id FROM t_incident LIMIT 100');
  const resourceList = resources as any[];
  const incidentList = incidents as any[];
  const tasks = [];
  const batchSize = 100;

  for (let i = 1; i <= 300; i++) {
    tasks.push({
      id: uuidv4(),
      task_type: taskTypes[Math.floor(Math.random() * taskTypes.length)],
      task_status: statuses[Math.floor(Math.random() * statuses.length)],
      priority: Math.floor(Math.random() * 10),
      resource_id: resourceList[Math.floor(Math.random() * resourceList.length)].id,
      incident_id: incidentList[Math.floor(Math.random() * incidentList.length)].id,
      distance: parseFloat((500 + Math.random() * 15000).toFixed(2)),
      estimated_duration: Math.floor(300 + Math.random() * 3600),
      dispatcher_id: adminUserId,
      notes: `调度任务备注 - ${String(i).padStart(4, '0')}`,
      completed_at: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
    });

    if (tasks.length >= batchSize) {
      await batchInsert(pool, 't_dispatch_task', tasks);
      tasks.length = 0;
    }
  }

  if (tasks.length > 0) {
    await batchInsert(pool, 't_dispatch_task', tasks);
  }
}

async function insertPlottings(pool: mysql.Pool, adminUserId: string) {
  const plottingTypes = ['route', 'arrow', 'polygon', 'circle', 'point'];
  const [incidents] = await pool.query('SELECT id FROM t_incident LIMIT 50');
  const incidentList = incidents as any[];
  const plottings = [];
  const batchSize = 100;

  for (let i = 1; i <= 200; i++) {
    const type = plottingTypes[Math.floor(Math.random() * plottingTypes.length)];
    plottings.push({
      id: uuidv4(),
      plotting_type: type,
      plotting_name: `${type === 'route' ? '路线' : type === 'arrow' ? '箭头' : type === 'polygon' ? '区域' : type === 'circle' ? '圆圈' : '点'}-${String(i).padStart(3, '0')}`,
      geometry: JSON.stringify({
        type: 'Point',
        coordinates: [116.404 + (Math.random() - 0.5) * 0.05, 39.915 + (Math.random() - 0.5) * 0.05],
      }),
      properties: JSON.stringify({ label: `标绘-${i}` }),
      style: JSON.stringify({ strokeColor: '#FF0000', strokeWidth: 2 }),
      creator_id: adminUserId,
      incident_id: incidentList[Math.floor(Math.random() * incidentList.length)]?.id || null,
    });

    if (plottings.length >= batchSize) {
      await batchInsert(pool, 't_plotting', plottings);
      plottings.length = 0;
    }
  }

  if (plottings.length > 0) {
    await batchInsert(pool, 't_plotting', plottings);
  }
}

async function batchInsert(pool: mysql.Pool, table: string, data: any[]) {
  if (data.length === 0) return;

  const keys = Object.keys(data[0]);
  const columns = keys.join(', ');
  const placeholders = keys.map(() => '?').join(', ');

  const values = data.map(item => keys.map(key => item[key]));

  const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;

  for (const value of values) {
    await pool.execute(sql, value);
  }
}

async function getCounts(pool: mysql.Pool): Promise<Counts> {
  const [resources] = await pool.query('SELECT COUNT(*) as count FROM t_resource');
  const [incidents] = await pool.query('SELECT COUNT(*) as count FROM t_incident');
  const [trajectories] = await pool.query('SELECT COUNT(*) as count FROM t_trajectory');
  const [heatmap] = await pool.query('SELECT COUNT(*) as count FROM t_heatmap_data');
  const [buildings] = await pool.query('SELECT COUNT(*) as count FROM t_sensitive_building');
  const [notifications] = await pool.query('SELECT COUNT(*) as count FROM t_notification');
  const [logs] = await pool.query('SELECT COUNT(*) as count FROM t_system_log');
  const [tasks] = await pool.query('SELECT COUNT(*) as count FROM t_dispatch_task');
  const [plottings] = await pool.query('SELECT COUNT(*) as count FROM t_plotting');

  return {
    resources: (resources as any)[0].count,
    incidents: (incidents as any)[0].count,
    trajectories: (trajectories as any)[0].count,
    heatmap: (heatmap as any)[0].count,
    buildings: (buildings as any)[0].count,
    notifications: (notifications as any)[0].count,
    logs: (logs as any)[0].count,
    tasks: (tasks as any)[0].count,
    plottings: (plottings as any)[0].count,
  };
}

main().catch(console.error);
