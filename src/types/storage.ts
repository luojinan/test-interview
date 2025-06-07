// IndexedDB 存储相关类型定义

import type {
  Category,
  OriginalQuestionData,
  Question,
  UserEdit,
} from "./interview";

// ==================== 数据库记录类型 ====================

export interface CategoryRecord {
  id: string;
  name: string;
  description?: string;
  questionCount: number;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuestionRecord {
  id: string;
  categoryId: string;
  subject: string;
  answer: string;
  readCount: number;
  createTime: Date;
  updateTime: Date;
  isCollected: boolean;
  isEdited: boolean;
  editedAt?: Date;
  originalSubject?: string;
  originalAnswer?: string;
}

export interface UserEditRecord {
  id: string;
  questionId: string;
  editedSubject: string;
  editedAnswer: string;
  editedAt: Date;
  editType: "subject" | "answer" | "both";
}

export interface AppCacheRecord {
  key: string;
  data: any;
  version: string;
  lastUpdated: Date;
  expiresAt?: Date;
}

export interface UserPreferenceRecord {
  key: string;
  value: any;
  updatedAt: Date;
}

// ==================== 缓存策略类型 ====================

export interface CacheInfo {
  hasCache: boolean;
  version: string;
  lastUpdated: Date;
  isExpired: boolean;
}

export interface CacheCheckResult {
  hasCache: boolean;
  version: string;
  lastUpdated: Date;
  isExpired: boolean;
}

export interface CacheStrategy {
  checkCacheExists(): Promise<boolean>;
  checkCacheVersion(): Promise<CacheInfo>;
  getCachedData(): Promise<{
    categories: Category[];
    questions: Question[];
    totalCount: number;
  }>;
  setCachedData(data: any, version: string): Promise<void>;
  clearCache(): Promise<void>;
}

// ==================== Script加载类型 ====================

export interface ScriptConfig {
  categoryId: string;
  scriptUrl: string;
  globalVarName: string;
  categoryName: string;
  priority: number;
  essential: boolean;
  timeout?: number;
}

export interface ScriptLoadingConfig {
  dataSources: {
    [categoryId: string]: ScriptConfig;
  };
  loadingConfig: {
    concurrent: number;
    timeout: number;
    retryCount: number;
    retryDelay: number;
  };
}

export interface ScriptLoadResult {
  categoryId: string;
  categoryName: string;
  data: OriginalQuestionData[];
  questionsCount: number;
  loadTime?: number;
  error?: Error;
}

// ==================== 加载状态类型 ====================

export interface LoadingCategoryState {
  id: string;
  name: string;
  status: "pending" | "loading" | "success" | "error";
  progress: number;
  questionsCount: number;
  loadTime?: number;
  error?: string;
}

export interface LoadingState {
  phase: "checking" | "loading" | "processing" | "complete" | "error";
  totalCategories: number;
  loadedCategories: number;
  currentCategory?: {
    id: string;
    name: string;
    status: "pending" | "loading" | "success" | "error";
    progress: number;
    questionsCount?: number;
  };
  categories: LoadingCategoryState[];
  overallProgress: number;
  errorMessage?: string;
}

// ==================== 数据服务类型 ====================

export interface DataServiceConfig {
  cacheExpiryDays: number; // 缓存有效期天数，设置为30天
  maxRetryCount: number;
  loadTimeout: number;
  maxConcurrentLoads: number;
}

export interface DataTransformResult {
  categories: Category[];
  questions: Question[];
  transformedCount: number;
  errors: string[];
}

export interface DataLoadingFlow {
  steps: Array<{
    phase: string;
    description: string;
    action: () => Promise<any>;
    onProgress?: (progress: number) => void;
    onSuccess?: (result: any) => void;
    onError?: (error: Error) => void;
  }>;
}

// ==================== 数据库操作类型 ====================

export interface DatabaseOperations {
  // 分类操作
  getCategories(): Promise<Category[]>;
  saveCategories(categories: Category[]): Promise<void>;

  // 题目操作
  getQuestions(categoryId?: string): Promise<Question[]>;
  saveQuestions(questions: Question[]): Promise<void>;
  updateQuestion(questionId: string, updates: Partial<Question>): Promise<void>;

  // 用户编辑操作
  getUserEdits(): Promise<UserEdit[]>;
  saveUserEdit(edit: UserEdit): Promise<void>;
  deleteUserEdit(questionId: string): Promise<void>;

  // 缓存操作
  getCacheInfo(key: string): Promise<AppCacheRecord | undefined>;
  setCacheInfo(key: string, data: any, version: string): Promise<void>;
  clearExpiredCache(): Promise<void>;
}

// ==================== 数据库操作结果类型 ====================

export interface DatabaseOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  affectedRows?: number;
}

export interface BatchOperationConfig {
  batchSize: number;
  onProgress?: (completed: number, total: number) => void;
  onError?: (error: Error, item: any) => void;
}

export interface SyncStatus {
  isSync: boolean;
  lastSyncTime?: Date;
  pendingChanges: number;
  conflictItems: string[];
}

// ==================== 存储服务接口 ====================

export interface StorageService {
  // 基础CRUD操作
  create<T>(table: string, data: T): Promise<DatabaseOperationResult<T>>;
  read<T>(table: string, id: string): Promise<DatabaseOperationResult<T>>;
  update<T>(
    table: string,
    id: string,
    data: Partial<T>,
  ): Promise<DatabaseOperationResult<T>>;
  delete(table: string, id: string): Promise<DatabaseOperationResult>;

  // 批量操作
  createBatch<T>(
    table: string,
    data: T[],
    config?: BatchOperationConfig,
  ): Promise<DatabaseOperationResult<T[]>>;
  updateBatch<T>(
    table: string,
    updates: Array<{ id: string; data: Partial<T> }>,
    config?: BatchOperationConfig,
  ): Promise<DatabaseOperationResult>;

  // 查询操作
  findAll<T>(
    table: string,
    filter?: any,
  ): Promise<DatabaseOperationResult<T[]>>;
  findByCategory<T>(
    table: string,
    categoryId: string,
  ): Promise<DatabaseOperationResult<T[]>>;
  count(table: string, filter?: any): Promise<DatabaseOperationResult<number>>;

  // 缓存管理
  getCacheInfo(key: string): Promise<AppCacheRecord | null>;
  setCacheInfo(
    key: string,
    data: any,
    version: string,
    ttl?: number,
  ): Promise<void>;
  clearExpiredCache(): Promise<void>;
}

// ==================== 常量定义 ====================

export const STORAGE_CONSTANTS = {
  DB_NAME: "InterviewBankDB",
  DB_VERSION: 1,
  CACHE_EXPIRY_DAYS: 30, // 修改为30天
  DEFAULT_TIMEOUT: 10000,
  MAX_RETRY_COUNT: 3,
  MAX_CONCURRENT_LOADS: 3,
} as const;

export const CACHE_KEYS = {
  QUESTIONS_DATA: "questions_data",
  CATEGORIES_DATA: "categories_data",
  DATA_VERSION: "data_version",
} as const;

export const TABLE_NAMES = {
  CATEGORIES: "categories",
  QUESTIONS: "questions",
  USER_EDITS: "userEdits",
  APP_CACHE: "appCache",
  USER_PREFERENCES: "userPreferences",
} as const;
