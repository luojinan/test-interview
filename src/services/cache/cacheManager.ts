// 缓存管理器 - 处理数据缓存的版本控制和有效性检查

import { db } from '@/services/database/index'
import type { Category, Question } from '@/types/interview'
import type { AppCacheRecord, CacheCheckResult } from '@/types/storage'
import { STORAGE_CONSTANTS } from '@/types/storage'

// ==================== 缓存管理器类 ====================

export class CacheManager {
  private readonly CACHE_KEYS = {
    DATA_VERSION: 'data_version',
    CATEGORIES: 'categories',
    QUESTIONS: 'questions',
    LAST_UPDATE: 'last_update'
  }

  // ==================== 缓存版本检查 ====================

  async checkCacheVersion(): Promise<CacheCheckResult> {
    try {
      const versionRecord = await db.appCache.get(this.CACHE_KEYS.DATA_VERSION)
      const lastUpdateRecord = await db.appCache.get(this.CACHE_KEYS.LAST_UPDATE)

      if (!versionRecord || !lastUpdateRecord) {
        return {
          hasCache: false,
          version: '',
          lastUpdated: new Date(0),
          isExpired: true
        }
      }

      const lastUpdated = new Date(lastUpdateRecord.data)
      const expiryDate = new Date(lastUpdated.getTime() + (STORAGE_CONSTANTS.CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000))
      const isExpired = new Date() > expiryDate

      return {
        hasCache: true,
        version: versionRecord.data,
        lastUpdated,
        isExpired
      }
    } catch (error) {
      console.error('检查缓存版本失败:', error)
      return {
        hasCache: false,
        version: '',
        lastUpdated: new Date(0),
        isExpired: true
      }
    }
  }

  // ==================== 缓存数据获取 ====================

  async getCachedData(): Promise<{
    categories: Category[]
    questions: Question[]
  }> {
    try {
      const [categoriesRecord, questionsRecord] = await Promise.all([
        db.appCache.get(this.CACHE_KEYS.CATEGORIES),
        db.appCache.get(this.CACHE_KEYS.QUESTIONS)
      ])

      if (!categoriesRecord || !questionsRecord) {
        throw new Error('缓存数据不完整')
      }

      return {
        categories: categoriesRecord.data || [],
        questions: questionsRecord.data || []
      }
    } catch (error) {
      console.error('获取缓存数据失败:', error)
      throw error
    }
  }

  // ==================== 缓存数据设置 ====================

  async setCachedData(data: {
    categories: Category[]
    questions: Question[]
  }, version: string): Promise<void> {
    try {
      const now = new Date()
      const expiresAt = new Date(now.getTime() + (STORAGE_CONSTANTS.CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000))

      const cacheRecords: AppCacheRecord[] = [
        {
          key: this.CACHE_KEYS.DATA_VERSION,
          data: version,
          version,
          lastUpdated: now,
          expiresAt
        },
        {
          key: this.CACHE_KEYS.CATEGORIES,
          data: data.categories,
          version,
          lastUpdated: now,
          expiresAt
        },
        {
          key: this.CACHE_KEYS.QUESTIONS,
          data: data.questions,
          version,
          lastUpdated: now,
          expiresAt
        },
        {
          key: this.CACHE_KEYS.LAST_UPDATE,
          data: now.toISOString(),
          version,
          lastUpdated: now,
          expiresAt
        }
      ]

      // 清除旧缓存
      await this.clearCache()

      // 保存新缓存
      await db.appCache.bulkAdd(cacheRecords)

      console.log(`缓存已更新: 版本 ${version}, ${data.categories.length} 个分类, ${data.questions.length} 道题目`)
    } catch (error) {
      console.error('设置缓存数据失败:', error)
      throw error
    }
  }

  // ==================== 缓存清理 ====================

  async clearCache(): Promise<void> {
    try {
      await db.appCache.clear()
      console.log('缓存已清理')
    } catch (error) {
      console.error('清理缓存失败:', error)
      throw error
    }
  }

  async clearExpiredCache(): Promise<number> {
    try {
      const now = new Date()
      const allCacheRecords = await db.appCache.toArray()

      const expiredKeys: string[] = []

      for (const record of allCacheRecords) {
        if (record.expiresAt && record.expiresAt < now) {
          expiredKeys.push(record.key)
        }
      }

      if (expiredKeys.length > 0) {
        await db.appCache.bulkDelete(expiredKeys)
        console.log(`已清理 ${expiredKeys.length} 个过期缓存项`)
      }

      return expiredKeys.length
    } catch (error) {
      console.error('清理过期缓存失败:', error)
      return 0
    }
  }
}

// ==================== 缓存管理器实例 ====================

const cacheManager = new CacheManager()

// ==================== 默认导出 ====================

export default cacheManager