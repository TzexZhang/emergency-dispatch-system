/**
 * ============================================
 * 数据库连接测试脚本
 * ============================================
 *
 * 功能说明：
 * - 测试数据库连接
 * - 检查数据库是否存在
 * - 提供配置建议
 *
 * @author Emergency Dispatch Team
 */

import mysql from 'mysql2/promise';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function testConnection(host: string, port: number, user: string, password: string): Promise<boolean> {
  try {
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
    });
    await connection.ping();
    await connection.end();
    return true;
  } catch (error: any) {
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('❌ 认证失败：用户名或密码错误');
      console.log('   提示：请检查MySQL root用户密码');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ 连接被拒绝：MySQL服务可能未启动');
      console.log('   提示：请启动MySQL服务');
    } else {
      console.error('❌ 连接失败：', error.message);
    }
    return false;
  }
}

async function checkDatabaseExists(host: string, port: number, user: string, password: string, dbName: string): Promise<boolean> {
  try {
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
    });

    const [rows] = await connection.query('SHOW DATABASES LIKE ?', [dbName]);
    await connection.end();

    return (rows as any[]).length > 0;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('\n🔍 数据库连接检查工具\n');

  const host = await question('MySQL主机地址 (默认: localhost): ') || 'localhost';
  const port = parseInt(await question('MySQL端口 (默认: 3306): ') || '3306', 10);
  const user = await question('MySQL用户名 (默认: root): ') || 'root';
  const password = await question('MySQL密码 (如果无密码直接回车): ');

  console.log('\n📡 测试连接...\n');

  const connected = await testConnection(host, port, user, password);

  if (connected) {
    console.log('✅ 连接成功！\n');

    const dbExists = await checkDatabaseExists(host, port, user, password, 'emergency_dispatch');

    if (dbExists) {
      console.log('✅ 数据库 emergency_dispatch 已存在\n');
    } else {
      console.log('⚠️  数据库 emergency_dispatch 不存在\n');
      const createDb = await question('是否创建数据库? (y/n): ');

      if (createDb.toLowerCase() === 'y') {
        try {
          const connection = await mysql.createConnection({
            host,
            port,
            user,
            password,
          });

          await connection.query(
            'CREATE DATABASE emergency_dispatch CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
          );
          await connection.end();

          console.log('✅ 数据库创建成功！\n');
        } catch (error: any) {
          console.error('❌ 创建数据库失败：', error.message);
        }
      }
    }

    console.log('📝 请更新 .env 文件配置：\n');
    console.log(`DB_HOST=${host}`);
    console.log(`DB_PORT=${port}`);
    console.log(`DB_NAME=emergency_dispatch`);
    console.log(`DB_USER=${user}`);
    console.log(`DB_PASSWORD=${password}\n`);

    console.log('✅ 配置完成后，运行以下命令初始化数据库：');
    console.log('   npm run db:migrate');
    console.log('   npm run db:seed\n');
  }

  rl.close();
}

main();
