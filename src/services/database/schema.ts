import Dexie, { type EntityTable } from "dexie";
import type {
  AppCacheRecord,
  CategoryRecord,
  QuestionRecord,
  UserEditRecord,
  UserPreferenceRecord,
} from "@/types/storage";

// ==================== 数据库表结构定义 ====================

export interface DatabaseSchema {
  // 分类表
  categories: CategoryRecord;

  // 题目表
  questions: QuestionRecord;

  // 用户编辑记录表
  userEdits: UserEditRecord;

  // 应用缓存表
  appCache: AppCacheRecord;

  // 用户偏好设置表
  userPreferences: UserPreferenceRecord;
}

// ==================== 数据库版本定义 ====================

export const DATABASE_VERSIONS = {
  // 版本 1.0 - 初始版本
  v1: {
    version: 1,
    stores: {
      // 分类表索引定义
      categories: "id, name, questionCount, createdAt",

      // 题目表索引定义
      questions:
        "id, categoryId, subject, readCount, createTime, isCollected, isEdited",

      // 用户编辑记录表索引定义
      userEdits: "id, questionId, editedAt, editType",

      // 应用缓存表索引定义
      appCache: "key, version, lastUpdated, expiresAt",

      // 用户偏好设置表索引定义
      userPreferences: "key, updatedAt",
    },
    upgrade: (db: any) => {
      // V1版本的数据迁移逻辑
      console.log("数据库初始化为版本 1.0");
    },
  },
} as const;

// ==================== 数据库配置 ====================

export const DATABASE_CONFIG = {
  name: "InterviewBankDB",
  // 当前版本号
  currentVersion: DATABASE_VERSIONS.v1.version,
  // 存储配置
  stores: DATABASE_VERSIONS.v1.stores,
  // 升级方法
  upgrade: DATABASE_VERSIONS.v1.upgrade
} as const;

// ==================== 索引配置说明 ====================

/*
索引说明:
1. categories表:
   - 主键: id
   - 索引: name (按名称查询), questionCount (按题目数量排序), createdAt (按创建时间排序)

2. questions表:
   - 主键: id
   - 索引: categoryId (按分类查询), subject (题目搜索), readCount (按阅读量排序)
   - 索引: createTime (按时间排序), isCollected (收藏筛选), isEdited (编辑筛选)

3. userEdits表:
   - 主键: id
   - 索引: questionId (关联题目), editedAt (按编辑时间排序), editType (按编辑类型筛选)

4. appCache表:
   - 主键: key
   - 索引: version (版本查询), lastUpdated (更新时间), expiresAt (过期时间)

5. userPreferences表:
   - 主键: key  
   - 索引: updatedAt (更新时间)
*/

// ==================== 数据验证Schema ====================

export const VALIDATION_RULES = {
  categories: {
    required: ["id", "name", "questionCount", "createdAt", "updatedAt"],
    types: {
      id: "string",
      name: "string",
      description: "string",
      questionCount: "number",
      icon: "string",
      createdAt: "date",
      updatedAt: "date",
    },
  },

  questions: {
    required: [
      "id",
      "categoryId",
      "subject",
      "answer",
      "readCount",
      "createTime",
      "updateTime",
      "isCollected",
      "isEdited",
    ],
    types: {
      id: "string",
      categoryId: "string",
      subject: "string",
      answer: "string",
      readCount: "number",
      createTime: "date",
      updateTime: "date",
      isCollected: "boolean",
      isEdited: "boolean",
      editedAt: "date",
      originalSubject: "string",
      originalAnswer: "string",
    },
  },

  userEdits: {
    required: [
      "id",
      "questionId",
      "editedSubject",
      "editedAnswer",
      "editedAt",
      "editType",
    ],
    types: {
      id: "string",
      questionId: "string",
      editedSubject: "string",
      editedAnswer: "string",
      editedAt: "date",
      editType: "string",
    },
  },

  appCache: {
    required: ["key", "data", "version", "lastUpdated"],
    types: {
      key: "string",
      data: "any",
      version: "string",
      lastUpdated: "date",
      expiresAt: "date",
    },
  },

  userPreferences: {
    required: ["key", "value", "updatedAt"],
    types: {
      key: "string",
      value: "any",
      updatedAt: "date",
    },
  },
} as const;

// ==================== 表名常量 ====================

export const TABLES = {
  CATEGORIES: "categories",
  QUESTIONS: "questions",
  USER_EDITS: "userEdits",
  APP_CACHE: "appCache",
  USER_PREFERENCES: "userPreferences",
} as const;

export type TableName = keyof typeof TABLES;

// 数据库类定义
export class InterviewBankDatabase extends Dexie {
  // 表定义
  categories!: EntityTable<CategoryRecord, "id">;
  questions!: EntityTable<QuestionRecord, "id">;
  userEdits!: EntityTable<UserEditRecord, "id">;
  appCache!: EntityTable<AppCacheRecord, "key">;
  userPreferences!: EntityTable<UserPreferenceRecord, "key">;

  constructor() {
    super(DATABASE_CONFIG.name);

    // 定义数据库schema
    this.version(DATABASE_CONFIG.currentVersion).stores(DATABASE_CONFIG.stores);

    // 数据库升级钩子
    this.version(DATABASE_CONFIG.currentVersion).upgrade(
      DATABASE_CONFIG.upgrade,
    );
  }
}

// 数据库实例
export const db = new InterviewBankDatabase();

// 数据库初始化函数
export async function initializeDatabase(): Promise<boolean> {
  try {
    // 检查数据库是否可用
    await db.open();
    console.log("IndexedDB数据库初始化成功");
    return true;
  } catch (error) {
    console.error("IndexedDB数据库初始化失败:", error);
    return false;
  }
}

// 数据库清理函数
export async function clearDatabase(): Promise<void> {
  try {
    await db.delete();
    console.log("数据库已清理");
  } catch (error) {
    console.error("清理数据库失败:", error);
    throw error;
  }
}

// 获取数据库状态
export async function getDatabaseStatus() {
  try {
    const categoriesCount = await db.categories.count();
    const questionsCount = await db.questions.count();
    const userEditsCount = await db.userEdits.count();
    const cacheCount = await db.appCache.count();

    return {
      isOpen: db.isOpen(),
      version: DATABASE_CONFIG.currentVersion,
      tables: {
        categories: categoriesCount,
        questions: questionsCount,
        userEdits: userEditsCount,
        cache: cacheCount,
      },
    };
  } catch (error) {
    console.error("获取数据库状态失败:", error);
    return null;
  }
}
