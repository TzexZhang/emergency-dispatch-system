/**
 * ============================================
 * 数据库数据检查和补充脚本
 * ============================================
 *
 * 功能说明：
 * - 检查数据库中的资源、事件等数据量
 * - 如果数据不足，自动补充Demo数据
 *
 * 使用方法：
 * npx tsx scripts/check-and-seed.ts
 *
 * @author Emergency Dispatch Team
 */

import { v4 as uuidv4 } from 'uuid';
import mysql from 'mysql2/promise';
import { RowDataPacket } from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'emergency_dispatch',
  charset: process.env.DB_CHARSET || 'utf8mb4',
  timezone: process.env.DB_TIMEZONE || '+08:00',
  connectionLimit: 10,
  waitForConnections: true,
  enableKeepAlive: true,
});

const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  error: (msg: string, error?: any) => console.error(`[ERROR] ${msg}`, error || ''),
  success: (msg: string) => console.log(`[SUCCESS] \x1b[32m${msg}\x1b[0m`),
  warn: (msg: string) => console.log(`[WARN] \x1b[33m${msg}\x1b[0m`),
};

async function query<T = RowDataPacket[]>(sql: string, params?: any[]): Promise<T> {
  const connection = await pool.getConnection();
  try {
    const [results] = await connection.execute(sql, params);
    return results as T;
  } finally {
    connection.release();
  }
}

// 配置：每种数据类型的最小数量
const MIN_CONFIG = {
  resources: {
    ambulance: 250,      // 救护车
    fire_truck: 250,     // 消防车
    police_car: 250,     // 警车
    sensor: 250,         // 传感器
    person: 250,         // 人员
  },
  incidents: 300,        // 事件
};

// 北京市中心坐标
const BASE_CENTER = { lng: 116.404, lat: 39.915 };

/**
 * 检查并确保资源类型存在
 */
async function ensureResourceTypes() {
  logger.info('检查资源类型...');

  const types = [
    { id: '00000000-0000-0000-0000-000000000001', typeCode: 'ambulance', typeName: '救护车', category: 'vehicle', color: '#FF0000', sortOrder: 1 },
    { id: '00000000-0000-0000-0000-000000000002', typeCode: 'fire_truck', typeName: '消防车', category: 'vehicle', color: '#FF6600', sortOrder: 2 },
    { id: '00000000-0000-0000-0000-000000000003', typeCode: 'police_car', typeName: '警车', category: 'vehicle', color: '#0000FF', sortOrder: 3 },
    { id: '00000000-0000-0000-0000-000000000004', typeCode: 'sensor', typeName: '传感器', category: 'sensor', color: '#00FF00', sortOrder: 4 },
    { id: '00000000-0000-0000-0000-000000000005', typeCode: 'person', typeName: '人员', category: 'person', color: '#0066FF', sortOrder: 5 },
  ];

  for (const type of types) {
    await query(
      `INSERT INTO t_resource_type (id, type_code, type_name, category, color, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE type_name = VALUES(type_name)`,
      [type.id, type.typeCode, type.typeName, type.category, type.color, type.sortOrder]
    );
  }

  logger.success('资源类型检查完成');
  return types;
}

/**
 * 检查并确保部门存在
 */
async function ensureDepartments() {
  logger.info('检查部门数据...');

  const departments = [
    { id: 'dept-001', name: '市急救中心', parentId: null, level: 0, sortOrder: 1 },
    { id: 'dept-002', name: '市消防支队', parentId: null, level: 0, sortOrder: 2 },
    { id: 'dept-003', name: '市公安局', parentId: null, level: 0, sortOrder: 3 },
    { id: 'dept-004', name: '市应急管理局', parentId: null, level: 0, sortOrder: 4 },
  ];

  for (const dept of departments) {
    await query(
      `INSERT INTO t_department (id, name, parent_id, level, sort_order)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      [dept.id, dept.name, dept.parentId, dept.level, dept.sortOrder]
    );
  }

  logger.success('部门数据检查完成');
  return departments;
}

/**
 * 检查并确保管理员用户存在
 */
async function ensureAdminUser() {
  logger.info('检查管理员账户...');

  const bcrypt = await import('bcrypt');
  const password = await bcrypt.hash('admin123', 10);

  await query(
    `INSERT INTO t_user (id, username, password_hash, real_name, role, status, created_at)
     VALUES ('user-admin', 'admin', ?, '系统管理员', 'admin', 'active', NOW())
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    [password]
  );

  logger.success('管理员账户检查完成');
}

/**
 * 生成资源数据
 */
async function generateResources(typeCode: string, typeName: string, count: number, center: { lng: number; lat: number }) {
  const typeResult = await query<any[]>('SELECT id FROM t_resource_type WHERE type_code = ?', [typeCode]);
  if (typeResult.length === 0) {
    logger.error(`资源类型 ${typeCode} 不存在`);
    return 0;
  }
  const typeId = typeResult[0].id;

  const deptResult = await query<any[]>('SELECT id FROM t_department LIMIT 1');
  const deptId = deptResult.length > 0 ? deptResult[0].id : null;

  const resources: any[] = [];
  const statuses = ['online', 'online', 'online', 'offline', 'alarm', 'processing'];

  for (let i = 0; i < count; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const lng = center.lng + (Math.random() - 0.5) * 0.15;
    const lat = center.lat + (Math.random() - 0.5) * 0.15;

    resources.push([
      uuidv4(),
      typeId,
      `${typeName}-${i + 1}`,
      `${typeCode.toUpperCase().substring(0, 4)}-${String(i + 1).padStart(3, '0')}`,
      status,
      lng,
      lat,
      Math.random() * 80,
      Math.random() * 360,
      JSON.stringify({}),
      deptId,
      new Date(),
    ]);

    if (resources.length >= 100) {
      await insertResourceBatch(resources);
      resources.length = 0;
    }
  }

  if (resources.length > 0) {
    await insertResourceBatch(resources);
  }

  return count;
}

async function insertResourceBatch(resources: any[][]) {
  const placeholders = resources.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
  const params = resources.flat();

  await query(
    `INSERT INTO t_resource (id, resource_type_id, resource_name, resource_code, resource_status, longitude, latitude, speed, direction, properties, department_id, created_at)
     VALUES ${placeholders}`,
    params
  );
}

/**
 * 生成事件数据
 */
async function generateIncidents(count: number) {
  const userResult = await query<any[]>('SELECT id FROM t_user LIMIT 1');
  if (userResult.length === 0) {
    logger.warn('没有用户，跳过事件生成');
    return 0;
  }
  const userId = userResult[0].id;

  const incidents: any[] = [];
  const types = ['fire', 'medical', 'police', 'fire', 'medical'];
  const levels = ['severe', 'major', 'minor', 'minor', 'minor'];
  const statuses = ['pending', 'processing', 'closed', 'processing', 'pending'];

  const typeNames: Record<string, string[]> = {
    fire: ['火灾报警', '森林火情', '建筑火灾', '车辆起火'],
    medical: ['医疗急救', '突发疾病', '交通事故伤', '意外伤害'],
    police: ['治安事件', '交通事故', '刑事案件', '群体事件'],
  };

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const level = levels[Math.floor(Math.random() * levels.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const lng = BASE_CENTER.lng + (Math.random() - 0.5) * 0.3;
    const lat = BASE_CENTER.lat + (Math.random() - 0.5) * 0.3;
    const typeName = typeNames[type][Math.floor(Math.random() * typeNames[type].length)];
    const reportedAt = new Date(Date.now() - Math.floor(Math.random() * 720 * 60 * 60 * 1000));

    incidents.push([
      uuidv4(),
      type,
      level,
      `${typeName}-${i + 1}`,
      `这是一条${typeName}的测试描述信息，位于北京市区域。`,
      lng,
      lat,
      status,
      userId,
      reportedAt,
      reportedAt,
    ]);

    if (incidents.length >= 100) {
      await insertIncidentBatch(incidents);
      incidents.length = 0;
    }
  }

  if (incidents.length > 0) {
    await insertIncidentBatch(incidents);
  }

  return count;
}

async function insertIncidentBatch(incidents: any[][]) {
  const placeholders = incidents.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
  const params = incidents.flat();

  await query(
    `INSERT INTO t_incident (id, incident_type, incident_level, title, description, longitude, latitude, incident_status, reported_by, reported_at, created_at)
     VALUES ${placeholders}`,
    params
  );
}

/**
 * 主函数
 */
async function main() {
  console.log('\n========================================');
  console.log('  数据库数据检查和补充工具');
  console.log('========================================\n');

  try {
    // 1. 确保基础数据存在
    await ensureResourceTypes();
    await ensureDepartments();
    await ensureAdminUser();

    // 2. 检查当前资源数量
    logger.info('\n检查资源数据...');
    const resourceStats = await query<any[]>(`
      SELECT rt.type_code, COUNT(r.id) as count
      FROM t_resource_type rt
      LEFT JOIN t_resource r ON rt.id = r.resource_type_id AND r.deleted_at IS NULL
      GROUP BY rt.type_code
    `);

    const currentCounts: Record<string, number> = {};
    for (const stat of resourceStats) {
      currentCounts[stat.type_code] = stat.count;
    }

    console.log('\n当前资源数量:');
    for (const [type, count] of Object.entries(currentCounts)) {
      const min = MIN_CONFIG.resources[type as keyof typeof MIN_CONFIG.resources] || 0;
      const status = count >= min ? '✓' : '✗ 需补充';
      console.log(`  ${type}: ${count} (最小要求: ${min}) ${status}`);
    }

    // 3. 补充缺失的资源
    for (const [typeCode, minCount] of Object.entries(MIN_CONFIG.resources)) {
      const current = currentCounts[typeCode] || 0;
      if (current < minCount) {
        const needCount = minCount - current;
        logger.info(`\n补充 ${typeCode} 数据 (${needCount} 条)...`);

        const typeName = {
          ambulance: '救护车',
          fire_truck: '消防车',
          police_car: '警车',
          sensor: '传感器',
          person: '人员',
        }[typeCode] || typeCode;

        const center = {
          ambulance: { lng: 116.42, lat: 39.92 },
          fire_truck: { lng: 116.38, lat: 39.90 },
          police_car: { lng: 116.45, lat: 39.93 },
          sensor: { lng: 116.40, lat: 39.91 },
          person: { lng: 116.41, lat: 39.94 },
        }[typeCode] || BASE_CENTER;

        await generateResources(typeCode, typeName, needCount, center);
        logger.success(`${typeCode} 数据补充完成`);
      }
    }

    // 4. 检查事件数量
    logger.info('\n检查事件数据...');
    const incidentResult = await query<any[]>('SELECT COUNT(*) as count FROM t_incident WHERE deleted_at IS NULL');
    const currentIncidents = incidentResult[0]?.count || 0;

    console.log(`\n当前事件数量: ${currentIncidents} (最小要求: ${MIN_CONFIG.incidents})`);

    if (currentIncidents < MIN_CONFIG.incidents) {
      const needCount = MIN_CONFIG.incidents - currentIncidents;
      logger.info(`\n补充事件数据 (${needCount} 条)...`);
      await generateIncidents(needCount);
      logger.success('事件数据补充完成');
    }

    // 5. 输出最终统计
    console.log('\n========================================');
    console.log('  最终数据统计');
    console.log('========================================\n');

    const finalResourceStats = await query<any[]>(`
      SELECT rt.type_name, COUNT(r.id) as count,
             SUM(CASE WHEN r.resource_status = 'online' THEN 1 ELSE 0 END) as online,
             SUM(CASE WHEN r.resource_status = 'offline' THEN 1 ELSE 0 END) as offline,
             SUM(CASE WHEN r.resource_status = 'alarm' THEN 1 ELSE 0 END) as alarm
      FROM t_resource_type rt
      LEFT JOIN t_resource r ON rt.id = r.resource_type_id AND r.deleted_at IS NULL
      GROUP BY rt.type_name
    `);

    console.log('资源统计:');
    let totalResources = 0, totalOnline = 0, totalOffline = 0, totalAlarm = 0;
    for (const stat of finalResourceStats) {
      console.log(`  ${stat.type_name}: ${stat.count} (在线: ${stat.online}, 离线: ${stat.offline}, 告警: ${stat.alarm})`);
      totalResources += stat.count;
      totalOnline += stat.online;
      totalOffline += stat.offline;
      totalAlarm += stat.alarm;
    }
    console.log(`  ----------------------------`);
    console.log(`  总计: ${totalResources} (在线: ${totalOnline}, 离线: ${totalOffline}, 告警: ${totalAlarm})`);

    const finalIncidentStats = await query<any[]>(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN incident_status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN incident_status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN incident_status = 'closed' THEN 1 ELSE 0 END) as closed,
        SUM(CASE WHEN incident_level = 'severe' THEN 1 ELSE 0 END) as severe,
        SUM(CASE WHEN incident_level = 'major' THEN 1 ELSE 0 END) as major,
        SUM(CASE WHEN incident_level = 'minor' THEN 1 ELSE 0 END) as minor
      FROM t_incident WHERE deleted_at IS NULL
    `);

    const inc = finalIncidentStats[0];
    console.log('\n事件统计:');
    console.log(`  总数: ${inc.total}`);
    console.log(`  状态: 待处理 ${inc.pending}, 处理中 ${inc.processing}, 已关闭 ${inc.closed}`);
    console.log(`  等级: 严重 ${inc.severe}, 重大 ${inc.major}, 一般 ${inc.minor}`);

    const typeStats = await query<any[]>(`
      SELECT incident_type, COUNT(*) as count
      FROM t_incident WHERE deleted_at IS NULL
      GROUP BY incident_type
    `);
    console.log(`  类型:`);
    for (const t of typeStats) {
      console.log(`    ${t.incident_type}: ${t.count}`);
    }

    console.log('\n========================================');
    logger.success('数据检查和补充完成！');
    console.log('========================================\n');

  } catch (error) {
    logger.error('执行失败:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
