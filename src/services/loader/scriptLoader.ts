// Script 动态加载器 - 支持并发、超时、重试、进度回调

import type { OriginalQuestionData } from '@/types/interview'
import type {
  LoadingCategoryState,
  LoadingState,
  ScriptConfig,
  ScriptLoadingConfig,
  ScriptLoadResult,
} from "@/types/storage";
import { STORAGE_CONSTANTS } from "@/types/storage";

// ==================== Script加载器类 ====================

export class ScriptLoader {
  private readonly config: ScriptLoadingConfig;
  private loadingQueue: ScriptConfig[] = [];
  private activeLoads: Map<string, Promise<ScriptLoadResult>> = new Map();
  private loadResults: Map<string, ScriptLoadResult> = new Map();

  constructor(config?: Partial<ScriptLoadingConfig>) {
    this.config = {
      dataSources: config?.dataSources || {},
      loadingConfig: {
        concurrent:
          config?.loadingConfig?.concurrent ||
          STORAGE_CONSTANTS.MAX_CONCURRENT_LOADS,
        timeout:
          config?.loadingConfig?.timeout || STORAGE_CONSTANTS.DEFAULT_TIMEOUT,
        retryCount:
          config?.loadingConfig?.retryCount ||
          STORAGE_CONSTANTS.MAX_RETRY_COUNT,
        retryDelay: config?.loadingConfig?.retryDelay || 1000,
      },
    };
  }

  // ==================== 单个脚本加载 ====================

  async loadScript(config: ScriptConfig): Promise<ScriptLoadResult> {
    const startTime = Date.now();
    let retryCount = 0;

    while (retryCount <= this.config.loadingConfig.retryCount) {
      try {
        const result = await this.attemptScriptLoad(config);
        result.loadTime = Date.now() - startTime;
        return result;
      } catch (error) {
        retryCount++;

        if (retryCount > this.config.loadingConfig.retryCount) {
          return {
            categoryId: config.categoryId,
            categoryName: config.categoryName,
            data: [],
            questionsCount: 0,
            loadTime: Date.now() - startTime,
            error: error instanceof Error ? error : new Error(String(error)),
          };
        }

        // 等待重试延迟
        await this.delay(this.config.loadingConfig.retryDelay * retryCount);
        console.warn(`重试加载 ${config.categoryName} (第${retryCount}次重试)`);
      }
    }

    // 这行代码实际上不会执行到，但为了TypeScript类型检查
    throw new Error("加载失败");
  }

  private ossDataUrl =
    "https://kingan-md-img.oss-cn-guangzhou.aliyuncs.com";

  private async attemptScriptLoad(
    config: ScriptConfig,
  ): Promise<ScriptLoadResult> {
    const url = this.ossDataUrl + config.scriptUrl;
    const timeout = config.timeout || this.config.loadingConfig.timeout;

    try {
      // 创建 AbortController 用于超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      if (!data) {
        throw new Error(`数据为空: ${config.categoryName}`);
      }

      if (!Array.isArray(data)) {
        throw new Error(`数据格式错误: ${config.categoryName} 不是数组`);
      }

      return {
        categoryId: config.categoryId,
        categoryName: config.categoryName,
        data: data as OriginalQuestionData[],
        questionsCount: data.length,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`加载超时: ${config.categoryName} (${timeout}ms)`);
      }

      throw new Error(
        `数据加载失败: ${config.categoryName} (${url}) - ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // ==================== 并发加载管理 ====================

  async loadMultipleScripts(
    configs: ScriptConfig[],
    onProgress?: (progress: LoadingState) => void,
  ): Promise<ScriptLoadResult[]> {
    const results: ScriptLoadResult[] = [];
    const totalScripts = configs.length;
    let completedCount = 0;

    // 按优先级排序
    const sortedConfigs = [...configs].sort((a, b) => a.priority - b.priority);

    // 初始化加载状态
    const loadingState: LoadingState = {
      phase: "loading",
      totalCategories: totalScripts,
      loadedCategories: 0,
      categories: sortedConfigs.map((config) => ({
        id: config.categoryId,
        name: config.categoryName,
        status: "pending",
        progress: 0,
        questionsCount: 0,
      })),
      overallProgress: 0,
    };

    onProgress?.(loadingState);

    // 分批并发加载
    const batchSize = this.config.loadingConfig.concurrent;

    for (let i = 0; i < sortedConfigs.length; i += batchSize) {
      const batch = sortedConfigs.slice(i, i + batchSize);

      // 更新状态为loading
      batch.forEach((config) => {
        const categoryState = loadingState.categories.find(
          (c) => c.id === config.categoryId,
        );
        if (categoryState) {
          categoryState.status = "loading";
        }
      });
      onProgress?.(loadingState);

      // 并发加载当前批次
      const batchPromises = batch.map(async (config) => {
        try {
          const result = await this.loadScript(config);
          completedCount++;

          // 更新分类状态
          const categoryState = loadingState.categories.find(
            (c) => c.id === config.categoryId,
          );
          if (categoryState) {
            categoryState.status = result.error ? "error" : "success";
            categoryState.progress = 100;
            categoryState.questionsCount = result.questionsCount;
            categoryState.loadTime = result.loadTime;
            if (result.error) {
              categoryState.error = result.error.message;
            }
          }

          // 更新整体进度
          loadingState.loadedCategories = completedCount;
          loadingState.overallProgress = Math.round(
            (completedCount / totalScripts) * 100,
          );

          onProgress?.(loadingState);
          return result;
        } catch (error) {
          completedCount++;

          const categoryState = loadingState.categories.find(
            (c) => c.id === config.categoryId,
          );
          if (categoryState) {
            categoryState.status = "error";
            categoryState.error =
              error instanceof Error ? error.message : String(error);
          }

          loadingState.loadedCategories = completedCount;
          loadingState.overallProgress = Math.round(
            (completedCount / totalScripts) * 100,
          );

          onProgress?.(loadingState);

          return {
            categoryId: config.categoryId,
            categoryName: config.categoryName,
            data: [],
            questionsCount: 0,
            error: error instanceof Error ? error : new Error(String(error)),
          };
        }
      });

      // 等待当前批次完成
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    // 更新最终状态
    loadingState.phase = "complete";
    onProgress?.(loadingState);

    return results;
  }

  // ==================== 加载队列管理 ====================

  addToQueue(config: ScriptConfig): void {
    this.loadingQueue.push(config);
  }

  removeFromQueue(categoryId: string): boolean {
    const index = this.loadingQueue.findIndex(
      (config) => config.categoryId === categoryId,
    );
    if (index >= 0) {
      this.loadingQueue.splice(index, 1);
      return true;
    }
    return false;
  }

  async processQueue(
    onProgress?: (progress: LoadingState) => void,
  ): Promise<ScriptLoadResult[]> {
    if (this.loadingQueue.length === 0) {
      return [];
    }

    const configs = [...this.loadingQueue];
    this.loadingQueue = [];

    return await this.loadMultipleScripts(configs, onProgress);
  }

  // ==================== 缓存和状态管理 ====================

  getLoadResult(categoryId: string): ScriptLoadResult | undefined {
    return this.loadResults.get(categoryId);
  }

  getAllLoadResults(): ScriptLoadResult[] {
    return Array.from(this.loadResults.values());
  }

  clearLoadResults(): void {
    this.loadResults.clear();
  }

  isLoading(categoryId: string): boolean {
    return this.activeLoads.has(categoryId);
  }

  getActiveLoadsCount(): number {
    return this.activeLoads.size;
  }

  // ==================== 工具方法 ====================

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ==================== 配置管理 ====================

  updateConfig(newConfig: Partial<ScriptLoadingConfig>): void {
    if (newConfig.dataSources) {
      Object.assign(this.config.dataSources, newConfig.dataSources);
    }

    if (newConfig.loadingConfig) {
      Object.assign(this.config.loadingConfig, newConfig.loadingConfig);
    }
  }

  getConfig(): ScriptLoadingConfig {
    return { ...this.config };
  }

  // ==================== 预检查方法 ====================

  async validateScriptUrls(configs: ScriptConfig[]): Promise<{
    valid: ScriptConfig[];
    invalid: Array<{ config: ScriptConfig; error: string }>;
  }> {
    const results = {
      valid: [] as ScriptConfig[],
      invalid: [] as Array<{ config: ScriptConfig; error: string }>,
    };

    for (const config of configs) {
      try {
        // 简单的URL验证
        new URL(config.scriptUrl);

        // 检查必需字段
        if (
          !config.categoryId ||
          !config.globalVarName ||
          !config.categoryName
        ) {
          results.invalid.push({
            config,
            error: "配置字段不完整",
          });
          continue;
        }

        results.valid.push(config);
      } catch (error) {
        results.invalid.push({
          config,
          error: `无效的URL: ${config.scriptUrl}`,
        });
      }
    }

    return results;
  }
}

// ==================== 脚本加载器实例 ====================

export const scriptLoader = new ScriptLoader();

// ==================== 便捷函数 ====================

export async function loadScriptData(
  config: ScriptConfig,
  onProgress?: (progress: number) => void,
): Promise<ScriptLoadResult> {
  return await scriptLoader.loadScript(config);
}

export async function loadMultipleScriptData(
  configs: ScriptConfig[],
  onProgress?: (progress: LoadingState) => void,
): Promise<ScriptLoadResult[]> {
  return await scriptLoader.loadMultipleScripts(configs, onProgress);
}

export function createScriptConfig(
  categoryId: string,
  scriptUrl: string,
  globalVarName: string,
  categoryName: string,
  options?: {
    priority?: number;
    essential?: boolean;
    timeout?: number;
  },
): ScriptConfig {
  return {
    categoryId,
    scriptUrl,
    globalVarName,
    categoryName,
    priority: options?.priority || 1,
    essential: options?.essential || true,
    timeout: options?.timeout,
  };
}
