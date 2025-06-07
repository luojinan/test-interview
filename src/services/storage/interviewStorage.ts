import { db } from '@/services/database';
import type {
  DatabaseOperationResult,
  BatchOperationConfig,
  StorageService,
  AppCacheRecord,
  CategoryRecord,
  QuestionRecord,
  UserEditRecord,
  UserPreferenceRecord
} from '@/types/storage';

// IndexedDB存储服务 - 实现具体的数据库操作

export class InterviewStorageService implements StorageService {

  // 基础CRUD操作

  /**
   * 创建记录
   */
  async create<T>(table: string, data: T): Promise<DatabaseOperationResult<T>> {
    try {
      const tableInstance = this.getTable(table);
      if (!tableInstance) {
        return { success: false, error: `表 ${table} 不存在` };
      }

      const id = await tableInstance.add(data);
      const createdRecord = await tableInstance.get(id);

      return {
        success: true,
        data: createdRecord as T
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`创建记录失败 [${table}]:`, error);
      return {
        success: false,
        error: `创建记录失败: ${errorMessage}`
      };
    }
  }

  /**
   * 读取记录
   */
  async read<T>(table: string, id: string): Promise<DatabaseOperationResult<T>> {
    try {
      const tableInstance = this.getTable(table);
      if (!tableInstance) {
        return { success: false, error: `表 ${table} 不存在` };
      }

      const record = await tableInstance.get(id);
      if (!record) {
        return {
          success: false,
          error: `记录不存在: ${id}`
        };
      }

      return {
        success: true,
        data: record as T
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`读取记录失败 [${table}:${id}]:`, error);
      return {
        success: false,
        error: `读取记录失败: ${errorMessage}`
      };
    }
  }

  /**
   * 更新记录
   */
  async update<T>(table: string, id: string, data: Partial<T>): Promise<DatabaseOperationResult<T>> {
    try {
      const tableInstance = this.getTable(table);
      if (!tableInstance) {
        return { success: false, error: `表 ${table} 不存在` };
      }

      await tableInstance.update(id, data);
      const updatedRecord = await tableInstance.get(id);

      if (!updatedRecord) {
        return {
          success: false,
          error: `记录不存在或更新失败: ${id}`
        };
      }

      return {
        success: true,
        data: updatedRecord as T,
        affectedRows: 1
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`更新记录失败 [${table}:${id}]:`, error);
      return {
        success: false,
        error: `更新记录失败: ${errorMessage}`
      };
    }
  }

  /**
   * 删除记录
   */
  async delete(table: string, id: string): Promise<DatabaseOperationResult> {
    try {
      const tableInstance = this.getTable(table);
      if (!tableInstance) {
        return { success: false, error: `表 ${table} 不存在` };
      }

      await tableInstance.delete(id);
      return {
        success: true,
        affectedRows: 1
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`删除记录失败 [${table}:${id}]:`, error);
      return {
        success: false,
        error: `删除记录失败: ${errorMessage}`
      };
    }
  }

  // 批量操作

  /**
   * 批量创建记录
   */
  async createBatch<T>(
    table: string,
    data: T[],
    config?: BatchOperationConfig
  ): Promise<DatabaseOperationResult<T[]>> {
    try {
      const tableInstance = this.getTable(table);
      if (!tableInstance) {
        return { success: false, error: `表 ${table} 不存在` };
      }

      const createdRecords: T[] = [];
      const batchSize = config?.batchSize || 100;
      let processedCount = 0;

      // 分批处理插入
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);

        try {
          await tableInstance.bulkPut(batch);
          createdRecords.push(...batch);
          processedCount += batch.length;
        } catch (error) {
          // 如果批量插入失败，尝试逐个插入
          for (const item of batch) {
            try {
              await tableInstance.put(item);
              createdRecords.push(item);
              processedCount++;
            } catch (itemError) {
              config?.onError?.(itemError as Error, item);
            }
          }
        }

        config?.onProgress?.(processedCount, data.length);
      }

      return {
        success: true,
        data: createdRecords,
        affectedRows: createdRecords.length
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`批量创建记录失败 [${table}]:`, error);
      return {
        success: false,
        error: `批量创建记录失败: ${errorMessage}`
      };
    }
  }

  /**
   * 批量更新记录
   */
  async updateBatch<T>(
    table: string,
    updates: Array<{ id: string, data: Partial<T> }>,
    config?: BatchOperationConfig
  ): Promise<DatabaseOperationResult> {
    try {
      const tableInstance = this.getTable(table);
      if (!tableInstance) {
        return { success: false, error: `表 ${table} 不存在` };
      }

      let totalAffected = 0;
      let processedCount = 0;
      const batchSize = config?.batchSize || 50;

      // 分批处理更新
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);

        await db.transaction('rw', tableInstance, async () => {
          for (const update of batch) {
            try {
              await tableInstance.update(update.id, update.data);
              totalAffected++;
              processedCount++;
            } catch (error) {
              config?.onError?.(error as Error, update);
            }
          }
        });

        config?.onProgress?.(processedCount, updates.length);
      }

      return {
        success: true,
        affectedRows: totalAffected
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`批量更新记录失败 [${table}]:`, error);
      return {
        success: false,
        error: `批量更新记录失败: ${errorMessage}`
      };
    }
  }

  // 查询操作

  /**
   * 查找所有记录
   */
  async findAll<T>(table: string, filter?: any): Promise<DatabaseOperationResult<T[]>> {
    try {
      const tableInstance = this.getTable(table);
      if (!tableInstance) {
        return { success: false, error: `表 ${table} 不存在` };
      }

      let records: any[];

      // 应用过滤条件
      if (filter && filter.categoryId) {
        records = await tableInstance.where('categoryId').equals(filter.categoryId).toArray();
      } else {
        records = await tableInstance.toArray();
      }

      // 应用额外的过滤条件
      if (filter) {
        if (filter.isCollected !== undefined) {
          records = records.filter((item: any) => item.isCollected === filter.isCollected);
        }
        if (filter.isEdited !== undefined) {
          records = records.filter((item: any) => item.isEdited === filter.isEdited);
        }
      }

      return {
        success: true,
        data: records as T[]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`查找记录失败 [${table}]:`, error);
      return {
        success: false,
        error: `查找记录失败: ${errorMessage}`
      };
    }
  }

  /**
   * 按分类查找记录
   */
  async findByCategory<T>(table: string, categoryId: string): Promise<DatabaseOperationResult<T[]>> {
    try {
      const tableInstance = this.getTable(table);
      if (!tableInstance) {
        return { success: false, error: `表 ${table} 不存在` };
      }

      const records = await tableInstance
        .where('categoryId')
        .equals(categoryId)
        .toArray();

      return {
        success: true,
        data: records as T[]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`按分类查找记录失败 [${table}:${categoryId}]:`, error);
      return {
        success: false,
        error: `按分类查找记录失败: ${errorMessage}`
      };
    }
  }

  /**
   * 统计记录数量
   */
  async count(table: string, filter?: any): Promise<DatabaseOperationResult<number>> {
    try {
      const tableInstance = this.getTable(table);
      if (!tableInstance) {
        return { success: false, error: `表 ${table} 不存在` };
      }

      let count: number;

      // 应用过滤条件
      if (filter && filter.categoryId) {
        count = await tableInstance.where('categoryId').equals(filter.categoryId).count();
      } else {
        count = await tableInstance.count();
      }

      return {
        success: true,
        data: count
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`统计记录失败 [${table}]:`, error);
      return {
        success: false,
        error: `统计记录失败: ${errorMessage}`
      };
    }
  }

  // 缓存管理

  /**
   * 获取缓存信息
   */
  async getCacheInfo(key: string): Promise<AppCacheRecord | null> {
    try {
      const record = await db.appCache.get(key);
      return record || null;
    } catch (error) {
      console.error(`获取缓存信息失败 [${key}]:`, error);
      return null;
    }
  }

  /**
   * 设置缓存信息
   */
  async setCacheInfo(key: string, data: any, version: string, ttl?: number): Promise<void> {
    try {
      const now = new Date();
      const cacheRecord: AppCacheRecord = {
        key,
        data,
        version,
        lastUpdated: now,
        expiresAt: ttl ? new Date(now.getTime() + ttl * 1000) : undefined
      };

      await db.appCache.put(cacheRecord);
    } catch (error) {
      console.error(`设置缓存信息失败 [${key}]:`, error);
      throw error;
    }
  }

  /**
   * 清理过期缓存
   */
  async clearExpiredCache(): Promise<void> {
    try {
      const now = new Date();
      await db.appCache
        .where('expiresAt')
        .below(now)
        .delete();
    } catch (error) {
      console.error('清理过期缓存失败:', error);
      throw error;
    }
  }

  // 私有方法

  /**
   * 获取表实例
   */
  private getTable(tableName: string) {
    switch (tableName) {
      case 'categories':
        return db.categories;
      case 'questions':
        return db.questions;
      case 'userEdits':
        return db.userEdits;
      case 'appCache':
        return db.appCache;
      case 'userPreferences':
        return db.userPreferences;
      default:
        return null;
    }
  }
}

// 导出存储服务实例
export const interviewStorage = new InterviewStorageService(); 