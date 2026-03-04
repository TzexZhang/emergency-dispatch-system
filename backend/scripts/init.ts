import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';
import { RowDataPacket } from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

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
  info: (msg: string) => console.log(`[${new Date().toISOString()}] [INFO] ${msg}`),
  error: (msg: string, error?: any) => console.error(`[${new Date().toISOString()}] [ERROR] ${msg}`, error || ''),
  success: (msg: string) => console.log(`[${new Date().toISOString()}] [SUCCESS] ${msg}`),
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

async function initDatabase() {
  const sqlPath = path.join(__dirname, 'database.sql');
  
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`SQL文件不存在: ${sqlPath}`);
  }
  
  logger.info('开始执行数据库初始化脚本...');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');
  
  await query('SET FOREIGN_KEY_CHECKS = 0');
  
  const lines = sqlContent.split('\n');
  let currentStatement = '';
  let inDelimiterBlock = false;
  let delimiter = ';';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.toLowerCase().startsWith('delimiter')) {
      inDelimiterBlock = true;
      delimiter = trimmedLine.split(' ')[1] || '$$';
      continue;
    }
    
    if (trimmedLine.toLowerCase().startsWith('drop table')) {
      try {
        await query(trimmedLine);
      } catch (error: any) {
        if (!error.message.includes('Unknown table')) {
          throw error;
        }
      }
      continue;
    }
    
    if (trimmedLine.startsWith('--') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('SET') || trimmedLine.startsWith('SHOW')) {
      continue;
    }
    
    if (trimmedLine.length === 0) {
      continue;
    }
    
    currentStatement += line + '\n';
    
    if (inDelimiterBlock) {
      if (trimmedLine.endsWith(delimiter)) {
        const procedureSql = currentStatement
          .replace(new RegExp(`DELIMITER ${delimiter}`, 'gi'), '')
          .replace(new RegExp(`DELIMITER ;`, 'gi'), '')
          .slice(0, -1);
        
        try {
          await query(procedureSql);
        } catch (error: any) {
          if (!error.message.includes('already exists') && !error.message.includes('Duplicate')) {
            throw error;
          }
        }
        
        currentStatement = '';
        inDelimiterBlock = false;
        delimiter = ';';
      }
    } else if (trimmedLine.endsWith(';')) {
      const statement = currentStatement.slice(0, -1);
      
      if (statement.toLowerCase().includes('create table') || 
          statement.toLowerCase().includes('create procedure') ||
          statement.toLowerCase().includes('insert into')) {
        try {
          await query(statement);
        } catch (error: any) {
          if (!error.message.includes('already exists') && !error.message.includes('Duplicate')) {
            throw error;
          }
        }
      }
      
      currentStatement = '';
    }
  }
  
  await query('SET FOREIGN_KEY_CHECKS = 1');
  logger.success('数据库表结构创建完成');
}

async function initBaseData() {
  logger.info('初始化基础数据...');
  
  const resourceTypes = [
    {
      id: '00000000-0000-0000-0000-000000000001',
      typeCode: 'ambulance',
      typeName: '救护车',
      category: 'vehicle',
      iconUrl: '/icons/ambulance.png',
      color: '#FF0000',
      sortOrder: 1,
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      typeCode: 'fire_truck',
      typeName: '消防车',
      category: 'vehicle',
      iconUrl: '/icons/fire-truck.png',
      color: '#FF6600',
      sortOrder: 2,
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      typeCode: 'police_car',
      typeName: '警车',
      category: 'vehicle',
      iconUrl: '/icons/police-car.png',
      color: '#0000FF',
      sortOrder: 3,
    },
    {
      id: '00000000-0000-0000-0000-000000000004',
      typeCode: 'sensor',
      typeName: '传感器',
      category: 'sensor',
      iconUrl: '/icons/sensor.png',
      color: '#00FF00',
      sortOrder: 4,
    },
    {
      id: '00000000-0000-0000-0000-000000000005',
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
  
  logger.success('资源类型初始化完成');
  
  const adminId = '00000000-0000-0000-0000-000000000001';
  const password = await bcrypt.hash('admin123', 10);
  
  await query(
    `INSERT INTO t_user (id, username, password_hash, real_name, role, status)
     VALUES (?, ?, ?, '系统管理员', 'admin', 'active')
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    [adminId, 'admin', password]
  );
  
  logger.success('管理员账户创建完成');
}

async function generateBulkData(ambulanceCount: number, fireTruckCount: number, policeCarCount: number, sensorCount: number, personCount: number) {
  logger.info(`开始生成批量数据...`);
  logger.info(`  救护车: ${ambulanceCount} 条`);
  logger.info(`  消防车: ${fireTruckCount} 条`);
  logger.info(`  警车: ${policeCarCount} 条`);
  logger.info(`  传感器: ${sensorCount} 条`);
  logger.info(`  人员: ${personCount} 条`);
  
  const types = await query<ResourceType[]>(`SELECT id, type_code FROM t_resource_type`);
  const ambulanceType = types.find(t => t.type_code === 'ambulance')!;
  const fireTruckType = types.find(t => t.type_code === 'fire_truck')!;
  const policeCarType = types.find(t => t.type_code === 'police_car')!;
  const sensorType = types.find(t => t.type_code === 'sensor')!;
  const personType = types.find(t => t.type_code === 'person')!;
  
  const BASE_CENTER = { lng: 116.404, lat: 39.915 };
  const BATCH_SIZE = 50;
  
  let totalInserted = 0;
  
  async function insertResources(resourceType: ResourceType, count: number, startIndex: number, center: { lng: number; lat: number }, hasVehicleInfo: boolean) {
    const resources: any[] = [];
    
    for (let i = 0; i < count; i++) {
      const rand = Math.random() * 100;
      let resourceStatus = 'online';
      if (rand < 60) resourceStatus = 'online';
      else if (rand < 80) resourceStatus = 'offline';
      else if (rand < 90) resourceStatus = 'alarm';
      else resourceStatus = 'processing';
      
      const lng = center.lng + (Math.random() - 0.5) * 0.1;
      const lat = center.lat + (Math.random() - 0.5) * 0.1;
      
      let properties: any = {};
      
      if (resourceType.type_code === 'ambulance') {
        properties = {
          model: 'Mercedes Sprinter',
          manufacturer: '梅赛德斯-奔驰',
          purchase_date: '2024-01-15',
          capacity: 2
        };
      } else if (resourceType.type_code === 'fire_truck') {
        properties = {
          model: 'MAN TGS 33.400',
          manufacturer: '曼恩',
          purchase_date: '2024-03-20',
          tank_capacity: 12000
        };
      } else if (resourceType.type_code === 'police_car') {
        properties = {
          model: 'Volkswagen Passat',
          manufacturer: '大众',
          purchase_date: '2024-02-10',
          color: 'white'
        };
      } else if (resourceType.type_code === 'sensor') {
        properties = {
          sensor_type: 'temperature',
          accuracy: 0.1,
          battery_level: 85
        };
      } else if (resourceType.type_code === 'person') {
        properties = {
          skill: 'emergency_medical',
          experience_years: 5,
          certification: 'EMT-Basic'
        };
      }
      
      const resourceName = resourceType.type_code === 'person' 
        ? `救援人员-${startIndex + i}` 
        : `${resourceType.type_code.replace('_', '-')}-${startIndex + i}`;
      
      resources.push({
        id: uuidv4(),
        resource_type_id: resourceType.id,
        resource_name: resourceName,
        resource_code: `${resourceType.type_code.substring(0, 4).toUpperCase()}-${startIndex + i}`,
        resource_status: resourceStatus,
        longitude: lng,
        latitude: lat,
        properties: JSON.stringify(properties)
      });
      
      if (resources.length >= BATCH_SIZE) {
        await insertBatch(resources);
        totalInserted += resources.length;
        logger.info(`已插入 ${totalInserted} 条数据...`);
        resources.length = 0;
      }
    }
    
    if (resources.length > 0) {
      await insertBatch(resources);
      totalInserted += resources.length;
    }
  }
  
  async function insertBatch(resources: any[]) {
    const values = resources.map(r => [
      r.id, r.resource_type_id, r.resource_name, r.resource_code,
      r.resource_status, r.longitude, r.latitude, r.properties
    ]);
    
    const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const params = values.flat();
    
    await query(
      `INSERT INTO t_resource (id, resource_type_id, resource_name, resource_code, resource_status, longitude, latitude, properties)
       VALUES ${placeholders}`,
      params
    );
  }
  
  const ambulanceIndex = 1;
  const fireTruckIndex = ambulanceIndex + ambulanceCount;
  const policeCarIndex = fireTruckIndex + fireTruckCount;
  const sensorIndex = policeCarIndex + policeCarCount;
  const personIndex = sensorIndex + sensorCount;
  
  logger.info(`开始生成救护车数据 (${ambulanceCount}条)...`);
  await insertResources(ambulanceType, ambulanceCount, ambulanceIndex, BASE_CENTER, true);
  
  logger.info(`开始生成消防车数据 (${fireTruckCount}条)...`);
  await insertResources(fireTruckType, fireTruckCount, fireTruckIndex, { lng: 116.45, lat: 39.95 }, true);
  
  logger.info(`开始生成警车数据 (${policeCarCount}条)...`);
  await insertResources(policeCarType, policeCarCount, policeCarIndex, { lng: 116.35, lat: 39.90 }, true);
  
  logger.info(`开始生成传感器数据 (${sensorCount}条)...`);
  await insertResources(sensorType, sensorCount, sensorIndex, { lng: 116.42, lat: 39.92 }, false);
  
  logger.info(`开始生成人员数据 (${personCount}条)...`);
  await insertResources(personType, personCount, personIndex, { lng: 116.38, lat: 39.93 }, false);
  
  logger.success(`批量数据生成完成！总计插入 ${totalInserted} 条资源数据`);
  
  const result = await query<{ count: number }[]>('SELECT COUNT(*) as count FROM t_resource');
  logger.info(`数据库中当前资源总数: ${result[0].count}`);
}

interface ResourceType {
  id: string;
  type_code: string;
}

async function generateIncidentData(count: number) {
  logger.info(`开始生成事件数据 (${count}条)...`);
  
  const users = await query<{ id: string }[]>('SELECT id FROM t_user WHERE status = "active"');
  if (users.length === 0) {
    logger.warn('没有可用的用户，跳过事件数据生成');
    return;
  }
  
  const incidentTypes = ['fire', 'medical', 'police'];
  const incidentLevels = ['severe', 'major', 'minor'];
  const incidentStatuses = ['pending', 'processing', 'closed'];
  
  const BASE_CENTER = { lng: 116.404, lat: 39.915 };
  const BATCH_SIZE = 50;
  
  let totalInserted = 0;
  const incidents: any[] = [];
  
  for (let i = 0; i < count; i++) {
    const incidentType = incidentTypes[Math.floor(Math.random() * incidentTypes.length)];
    const incidentLevel = incidentLevels[Math.floor(Math.random() * incidentLevels.length)];
    const incidentStatus = incidentStatuses[Math.floor(Math.random() * incidentStatuses.length)];
    
    let title = '';
    if (incidentType === 'fire') {
      title = `火灾报警-${i}`;
    } else if (incidentType === 'medical') {
      title = `医疗急救-${i}`;
    } else {
      title = `治安事件-${i}`;
    }
    
    const lng = BASE_CENTER.lng + (Math.random() - 0.5) * 0.4;
    const lat = BASE_CENTER.lat + (Math.random() - 0.5) * 0.4;
    const reporter = users[Math.floor(Math.random() * users.length)];
    
    const reportedAt = new Date(Date.now() - Math.floor(Math.random() * 720 * 60 * 60 * 1000));
    
    incidents.push({
      id: uuidv4(),
      incident_type: incidentType,
      incident_level: incidentLevel,
      title: title,
      description: `测试事件描述-${i}`,
      longitude: lng,
      latitude: lat,
      address: `测试地址-${i}`,
      incident_status: incidentStatus,
      reported_by: reporter.id,
      reported_at: reportedAt,
      created_at: reportedAt
    });
    
    if (incidents.length >= BATCH_SIZE) {
      await insertIncidentBatch(incidents);
      totalInserted += incidents.length;
      logger.info(`已插入 ${totalInserted} 条事件数据...`);
      incidents.length = 0;
    }
  }
  
  if (incidents.length > 0) {
    await insertIncidentBatch(incidents);
    totalInserted += incidents.length;
  }
  
  logger.success(`事件数据生成完成！总计插入 ${totalInserted} 条事件数据`);
  
  const result = await query<{ count: number }[]>('SELECT COUNT(*) as count FROM t_incident');
  logger.info(`数据库中当前事件总数: ${result[0].count}`);
}

async function insertIncidentBatch(incidents: any[]) {
  const values = incidents.map(i => [
    i.id, i.incident_type, i.incident_level, i.title, i.description,
    i.longitude, i.latitude, i.address, i.incident_status,
    i.reported_by, i.reported_at, i.created_at
  ]);
  
  const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
  const params = values.flat();
  
  await query(
    `INSERT INTO t_incident (id, incident_type, incident_level, title, description, longitude, latitude, address, incident_status, reported_by, reported_at, created_at)
     VALUES ${placeholders}`,
    params
  );
}

async function main() {
  try {
    await initDatabase();
    await initBaseData();
    
    const args = process.argv.slice(2);
    const mode = args[0] || 'init';
    
    if (mode === 'bulk' || mode === 'init') {
      const ambulanceCount = parseInt(args[1]) || 200;
      const fireTruckCount = parseInt(args[2]) || 150;
      const policeCarCount = parseInt(args[3]) || 150;
      const sensorCount = parseInt(args[4]) || 300;
      const personCount = parseInt(args[5]) || 200;
      const incidentCount = parseInt(args[6]) || 500;
      
      console.log(`\n生成配置：`);
      console.log(`  救护车: ${ambulanceCount} 条`);
      console.log(`  消防车: ${fireTruckCount} 条`);
      console.log(`  警车: ${policeCarCount} 条`);
      console.log(`  传感器: ${sensorCount} 条`);
      console.log(`  人员: ${personCount} 条`);
      console.log(`  事件: ${incidentCount} 条`);
      console.log(`  总计: ${ambulanceCount + fireTruckCount + policeCarCount + sensorCount + personCount} 条资源，${incidentCount} 条事件\n`);
      
      await generateBulkData(ambulanceCount, fireTruckCount, policeCarCount, sensorCount, personCount);
      await generateIncidentData(incidentCount);
    } else if (mode === 'incidents') {
      const incidentCount = parseInt(args[1]) || 500;
      console.log(`\n生成事件数据: ${incidentCount} 条\n`);
      await generateIncidentData(incidentCount);
    }
    
    logger.success('数据库初始化完成！');
    await pool.end();
  } catch (error) {
    logger.error('数据库初始化失败:', error);
    await pool.end();
    process.exit(1);
  }
}

main();
