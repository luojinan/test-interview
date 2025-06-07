import { computed, ref } from "vue";
import cacheManager from "../services/cache/cacheManager";
import { initializeDatabase } from "../services/database/schema";
import type { LoadingState } from "../types/interview";

// 数据加载状态管理组合函数
export function useDataLoading() {
  // 加载状态
  const loadingState = ref<LoadingState>({
    phase: "checking",
    totalCategories: 0,
    loadedCategories: 0,
    categories: [],
    overallProgress: 0,
  });

  // 计算属性
  const isLoading = computed(() =>
    ["checking", "loading", "processing"].includes(loadingState.value.phase),
  );

  const isComplete = computed(() => loadingState.value.phase === "complete");

  const hasError = computed(() => loadingState.value.phase === "error");

  const progressPercentage = computed(() =>
    Math.round(loadingState.value.overallProgress),
  );

  // 状态管理方法

  /**
   * 开始数据加载流程
   */
  const startDataLoading = async (): Promise<boolean> => {
    try {
      // 1. 初始化数据库
      loadingState.value.phase = "checking";
      loadingState.value.overallProgress = 0;

      const dbInitialized = await initializeDatabase();
      if (!dbInitialized) {
        throw new Error("数据库初始化失败");
      }

      updateProgress(10);

      // 2. 检查缓存
      const cacheInfo = await cacheManager.checkCacheVersion();
      updateProgress(20);

      if (cacheInfo.hasCache && !cacheInfo.isExpired) {
        // 使用缓存数据
        loadingState.value.phase = "loading";
        const cachedData = await cacheManager.getCachedData();
        updateProgress(80);

        // 模拟处理时间
        await new Promise((resolve) => setTimeout(resolve, 200));

        loadingState.value.phase = "complete";
        updateProgress(100);

        console.log("使用缓存数据加载完成");
        return true;
      } else {
        // 需要重新加载数据
        loadingState.value.phase = "loading";
        updateProgress(30);

        // 这里可以集成远程数据加载逻辑
        // 目前返回false表示需要外部加载数据
        console.log("缓存已过期或不存在，需要重新加载数据");
        return false;
      }
    } catch (error) {
      console.error("数据加载失败:", error);
      setError(error instanceof Error ? error.message : "数据加载失败");
      return false;
    }
  };

  /**
   * 加载远程数据（模拟）
   */
  const loadRemoteData = async (
    dataSources: Array<{
      id: string;
      name: string;
      data: any[];
    }>,
  ): Promise<boolean> => {
    try {
      loadingState.value.phase = "loading";
      loadingState.value.totalCategories = dataSources.length;
      loadingState.value.categories = dataSources.map((source) => ({
        id: source.id,
        name: source.name,
        status: "pending" as const,
        questionsCount: 0,
      }));

      updateProgress(40);

      // 模拟加载每个数据源
      for (let i = 0; i < dataSources.length; i++) {
        const source = dataSources[i];

        // 更新当前加载状态
        loadingState.value.currentCategory = {
          id: source.id,
          name: source.name,
          status: "loading",
          progress: 0,
          questionsCount: source.data.length,
        };

        // 更新分类状态
        loadingState.value.categories[i].status = "loading";

        // 模拟加载过程
        for (let progress = 0; progress <= 100; progress += 25) {
          if (loadingState.value.currentCategory) {
            loadingState.value.currentCategory.progress = progress;
          }
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // 完成当前分类
        loadingState.value.categories[i] = {
          ...loadingState.value.categories[i],
          status: "success",
          questionsCount: source.data.length,
          loadTime: Math.floor(Math.random() * 500) + 200,
        };

        loadingState.value.loadedCategories = i + 1;

        // 更新整体进度
        const progress = 40 + ((i + 1) / dataSources.length) * 40;
        updateProgress(progress);
      }

      // 进入处理阶段
      loadingState.value.phase = "processing";
      loadingState.value.currentCategory = undefined;
      updateProgress(85);

      // 模拟数据处理
      await new Promise((resolve) => setTimeout(resolve, 500));
      updateProgress(95);

      // 完成
      loadingState.value.phase = "complete";
      updateProgress(100);

      console.log("远程数据加载完成");
      return true;
    } catch (error) {
      console.error("远程数据加载失败:", error);
      setError(error instanceof Error ? error.message : "远程数据加载失败");
      return false;
    }
  };

  /**
   * 重试加载
   */
  const retryLoading = async (): Promise<boolean> => {
    resetLoading();
    return await startDataLoading();
  };

  /**
   * 重置加载状态
   */
  const resetLoading = (): void => {
    loadingState.value = {
      phase: "checking",
      totalCategories: 0,
      loadedCategories: 0,
      categories: [],
      overallProgress: 0,
    };
  };

  /**
   * 更新进度
   */
  const updateProgress = (progress: number): void => {
    loadingState.value.overallProgress = Math.min(100, Math.max(0, progress));
  };

  /**
   * 设置错误状态
   */
  const setError = (message: string): void => {
    loadingState.value.phase = "error";
    loadingState.value.errorMessage = message;
  };

  /**
   * 获取阶段文本
   */
  const getPhaseText = (): string => {
    switch (loadingState.value.phase) {
      case "checking":
        return "检查本地缓存";
      case "loading":
        return "加载数据中";
      case "processing":
        return "处理数据中";
      case "complete":
        return "加载完成";
      case "error":
        return "加载失败";
      default:
        return "准备中";
    }
  };

  /**
   * 获取阶段描述
   */
  const getPhaseDescription = (): string => {
    switch (loadingState.value.phase) {
      case "checking":
        return "正在检查本地缓存和数据库状态...";
      case "loading":
        return "正在从远程服务器加载最新数据...";
      case "processing":
        return "正在处理和验证数据格式...";
      case "complete":
        return "所有数据已加载完成，可以开始使用";
      case "error":
        return "数据加载过程中出现错误，请检查网络连接后重试";
      default:
        return "准备开始数据加载流程...";
    }
  };

  /**
   * 清空缓存
   */
  const clearCache = async (): Promise<boolean> => {
    try {
      await cacheManager.clearCache();
      resetLoading();
      console.log("缓存已清空");
      return true;
    } catch (error) {
      console.error("清空缓存失败:", error);
      return false;
    }
  };

  return {
    // 状态
    loadingState,
    isLoading,
    isComplete,
    hasError,
    progressPercentage,

    // 方法
    startDataLoading,
    loadRemoteData,
    retryLoading,
    resetLoading,
    updateProgress,
    setError,
    getPhaseText,
    getPhaseDescription,
    clearCache,
  };
}
