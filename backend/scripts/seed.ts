/**
 * ============================================
 * 数据库初始化脚本
 * ============================================
 *
 * 功能说明：
 * - 导入基础数据
 * - 创建默认管理员
 * - 初始化资源类型
 *
 * @author Emergency Dispatch Team
 */

import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../src/utils/db';
import { logger } from '../src/utils/logger';

/**
 * 主函数
 */
async function main() {
  try {
    logger.info('开始初始化数据...');

    await insertResourceTypes();
    await insertAdminUser();
    await insertSampleData();

    logger.info('数据初始化完成！');
  } catch (error) {
    logger.error('数据初始化失败:', error);
    process.exit(1);
  }
}

/**
 * 插入资源类型
 */
async function insertResourceTypes() {
  const resourceTypes = [
    {
      id: uuidv4(),
      typeCode: 'ambulance',
      typeName: '救护车',
      category: 'vehicle',
      iconUrl: '/icons/ambulance.png',
      color: '#FF0000',
      sortOrder: 1,
    },
    {
      id: uuidv4(),
      typeCode: 'fire_truck',
      typeName: '消防车',
      category: 'vehicle',
      iconUrl: '/icons/fire-truck.png',
      color: '#FF6600',
      sortOrder: 2,
    },
    {
      id: uuidv4(),
      typeCode: 'police_car',
      typeName: '警车',
      category: 'vehicle',
      iconUrl: '/icons/police-car.png',
      color: '#0000FF',
      sortOrder: 3,
    },
    {
      id: uuidv4(),
      typeCode: 'sensor',
      typeName: '传感器',
      category: 'sensor',
      iconUrl: '/icons/sensor.png',
      color: '#00FF00',
      sortOrder: 4,
    },
    {
      id: uuidv4(),
      typeCode: 'person',
      typeName: '人员',
      category: 'person',
      iconUrl: '/icons/person.png',
      color: '#0066FF',
      sortOrder: 5,
    },
  ];

  for (const type of resourceTypes) {
    await query(
      `INSERT INTO t_resource_type (id, type_code, type_name, category, icon_url, color, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE type_name = VALUES(type_name)`,
      [
        type.id,
        type.typeCode,
        type.typeName,
        type.category,
        type.iconUrl,
        type.color,
        type.sortOrder,
      ]
    );
  }

  logger.info('资源类型初始化完成');
}

/**
 * 插入默认管理员
 */
async function insertAdminUser() {
  const adminId = uuidv4();
  const username = 'admin';
  const password = await bcrypt.hash('admin123', 10);

  await query(
    `INSERT INTO t_user (id, username, password_hash, real_name, role, status)
     VALUES (?, ?, ?, '系统管理员', 'admin', 'active')
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    [adminId, username, password]
  );

  logger.info('管理员账户创建完成');
}

/**
 * 插入示例数据
 */
async function insertSampleData() {
  // 示例资源
  const sampleResources = [
    {
      id: uuidv4(),
      resourceTypeId: (await query<any[]>('SELECT id FROM t_resource_type WHERE type_code = "ambulance"'))[0].id,
      resourceName: '救护车-001',
      resourceCode: 'AMB-001',
      resourceStatus: 'online',
      longitude: 116.404,
      latitude: 39.915,
      speed: 0,
      departmentId: null,
    },
    {
      id: uuidv4(),
      resourceTypeId: (await query<any[]>('SELECT id FROM t_resource_type WHERE type_code = "fire_truck"'))[0].id,
      resourceName: '消防车-001',
      resourceCode: 'FIRE-001',
      resourceStatus: 'online',
      longitude: 116.414,
      latitude: 39.925,
      speed: 0,
      departmentId: null,
    },
  ];

  for (const resource of sampleResources) {
    await query(
      `INSERT INTO t_resource (id, resource_type_id, resource_name, resource_code, resource_status, longitude, latitude, speed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE resource_name = VALUES(resource_name)`,
      [
        resource.id,
        resource.resourceTypeId,
        resource.resourceName,
        resource.resourceCode,
        resource.resourceStatus,
        resource.longitude,
        resource.latitude,
        resource.speed,
      ]
    );
  }

  logger.info('示例数据插入完成');
}

// 运行
main();
