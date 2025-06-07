// 数据库实例导出文件 - 提供统一的数据库访问接口

import {
  clearDatabase,
  getDatabaseStatus,
  InterviewBankDatabase,
  initializeDatabase,
} from "./schema";

// ==================== 数据库实例 ====================

// 创建数据库实例
export const db = new InterviewBankDatabase();

// ==================== 数据库初始化 ====================

// 初始化数据库
export const initDB = initializeDatabase;

// 清空数据库
export const clearDB = clearDatabase;

// 获取数据库状态
export const getDBStatus = getDatabaseStatus;

// ==================== 数据库工具函数 ====================

export async function isDBReady(): Promise<boolean> {
  try {
    await db.open();
    return true;
  } catch (error) {
    console.error("数据库连接失败:", error);
    return false;
  }
}

// ==================== 默认导出 ====================

export default db;

// ==================== 重新导出类型 ====================

export type { DatabaseSchema } from "./schema";
export { DATABASE_CONFIG, TABLES } from "./schema";
