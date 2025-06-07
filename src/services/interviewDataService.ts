// 面试题库数据服务 - 集成所有底层服务的统一数据访问层

import { useIndexedDB } from "@/composables/useIndexedDB";
import cacheManager from "@/services/cache/cacheManager";
import { scriptLoader } from "@/services/loader/scriptLoader";
import type {
  Category,
  OriginalQuestionData,
  Question,
  UserEdit,
} from "@/types/interview";
import type {
  DataServiceConfig,
  LoadingState,
  ScriptConfig,
  ScriptLoadResult,
} from "@/types/storage";
import { dataTransformer, createCategoryNameMap } from "@/utils/dataTransform";

// ==================== 数据服务配置 ====================

const DEFAULT_CONFIG: DataServiceConfig = {
  cacheExpiryDays: 30,
  maxRetryCount: 3,
  loadTimeout: 10000,
  maxConcurrentLoads: 3,
};

// ==================== 数据服务类 ====================

export class InterviewDataService {
  private config: DataServiceConfig;
  private indexedDB: ReturnType<typeof useIndexedDB>;
  private isInitialized = false;

  constructor(config?: Partial<DataServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.indexedDB = useIndexedDB();
  }

  // ==================== 初始化 ====================

  async initialize(): Promise<boolean> {
    try {
      if (this.isInitialized) {
        return true;
      }

      // 等待IndexedDB就绪
      let attempts = 0;
      const maxAttempts = 10;

      while (!this.indexedDB.isReady.value && attempts < maxAttempts) {
        await this.delay(100);
        attempts++;
      }

      if (!this.indexedDB.isReady.value) {
        throw new Error("IndexedDB初始化超时");
      }

      this.isInitialized = true;
      console.log("面试题库数据服务初始化成功");
      return true;
    } catch (error) {
      console.error("数据服务初始化失败:", error);
      return false;
    }
  }

  // ==================== 核心数据加载流程 ====================

  async loadData(
    scriptConfigs: ScriptConfig[],
    onProgress?: (state: LoadingState) => void,
  ): Promise<{
    success: boolean;
    categories: Category[];
    questions: Question[];
    fromCache: boolean;
    error?: string;
  }> {
    try {
      await this.initialize();

      // 1. 检查缓存有效性
      const cacheInfo = await cacheManager.checkCacheVersion();

      if (cacheInfo.hasCache && !cacheInfo.isExpired) {
        console.log("使用有效缓存数据");
        const cachedData = await cacheManager.getCachedData();

        onProgress?.({
          phase: "complete",
          totalCategories: cachedData.categories.length,
          loadedCategories: cachedData.categories.length,
          categories: cachedData.categories.map((cat) => ({
            id: cat.id,
            name: cat.name,
            status: "success" as const,
            progress: 100,
            questionsCount: cachedData.questions.filter(
              (q) => q.categoryId === cat.id,
            ).length,
          })),
          overallProgress: 100,
        });

        return {
          success: true,
          categories: cachedData.categories,
          questions: cachedData.questions,
          fromCache: true,
        };
      }

      // 2. 加载远程数据
      console.log("开始加载远程数据");
      const loadResults = await scriptLoader.loadMultipleScripts(
        scriptConfigs,
        onProgress,
      );

      // 3. 处理加载结果
      const { transformedData, errors } =
        await this.processLoadResults(loadResults);

      if (transformedData.categories.length === 0) {
        throw new Error("没有成功加载任何分类数据");
      }

      // 4. 保存到缓存和IndexedDB
      await this.saveData(
        transformedData.categories,
        transformedData.questions,
      );

      // 5. 记录加载统计
      console.log(
        `数据加载完成: ${transformedData.categories.length}个分类, ${transformedData.questions.length}道题目`,
      );
      if (errors.length > 0) {
        console.warn("数据转换警告:", errors);
      }

      return {
        success: true,
        categories: transformedData.categories,
        questions: transformedData.questions,
        fromCache: false,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "数据加载失败";
      console.error("数据加载失败:", error);

      return {
        success: false,
        categories: [],
        questions: [],
        fromCache: false,
        error: errorMessage,
      };
    }
  }

  // ==================== 数据处理 ====================

  private async processLoadResults(results: ScriptLoadResult[]): Promise<{
    transformedData: { categories: Category[]; questions: Question[] };
    errors: string[];
  }> {
    const allErrors: string[] = [];
    const allOriginalData: OriginalQuestionData[] = [];

    // 收集成功加载的数据
    for (const result of results) {
      if (result.error) {
        allErrors.push(`${result.categoryName}: ${result.error.message}`);
        continue;
      }

      if (result.data && result.data.length > 0) {
        allOriginalData.push(...result.data);
      }
    }

    if (allOriginalData.length === 0) {
      throw new Error("没有成功加载任何数据");
    }

    // 创建分类名称映射（从 ScriptLoadResult 中获取正确的分类名称）
    const categoryNameMap = createCategoryNameMap(results);

    // 转换数据格式
    const transformResult =
      dataTransformer.transformQuestionsBatch(allOriginalData, categoryNameMap);

    return {
      transformedData: {
        categories: transformResult.categories,
        questions: transformResult.questions,
      },
      errors: [...allErrors, ...transformResult.errors],
    };
  }

  // ==================== 数据存储 ====================

  private async saveData(
    categories: Category[],
    questions: Question[],
  ): Promise<void> {
    try {
      // 保存到IndexedDB
      await Promise.all([
        this.indexedDB.saveCategories(categories),
        this.indexedDB.saveQuestions(questions),
      ]);

      // 保存到缓存
      const version = this.generateDataVersion(categories, questions);
      await cacheManager.setCachedData({ categories, questions }, version);

      console.log("数据保存完成");
    } catch (error) {
      console.error("数据保存失败:", error);
      throw error;
    }
  }

  private generateDataVersion(
    categories: Category[],
    questions: Question[],
  ): string {
    const timestamp = Date.now();
    const categoriesCount = categories.length;
    const questionsCount = questions.length;

    return `v${timestamp}_${categoriesCount}cats_${questionsCount}qs`;
  }

  // ==================== 分类管理 ====================

  async getCategories(): Promise<Category[]> {
    await this.initialize();
    return await this.indexedDB.getCategories();
  }

  async addCategory(category: Category): Promise<boolean> {
    await this.initialize();
    return await this.indexedDB.addCategory(category);
  }

  async updateCategory(
    id: string,
    updates: Partial<Category>,
  ): Promise<boolean> {
    await this.initialize();
    return await this.indexedDB.updateCategory(id, updates);
  }

  async deleteCategory(id: string): Promise<boolean> {
    await this.initialize();
    return await this.indexedDB.deleteCategory(id);
  }

  // ==================== 题目管理 ====================

  async getQuestions(categoryId?: string): Promise<Question[]> {
    await this.initialize();
    return await this.indexedDB.getQuestions(categoryId);
  }

  async getQuestionById(id: string): Promise<Question | null> {
    await this.initialize();
    const allQuestions = await this.indexedDB.getQuestions();
    return allQuestions.find((q) => q.id === id) || null;
  }

  async addQuestion(question: Question): Promise<boolean> {
    await this.initialize();
    return await this.indexedDB.addQuestion(question);
  }

  async updateQuestion(
    id: string,
    updates: Partial<Question>,
  ): Promise<boolean> {
    await this.initialize();
    return await this.indexedDB.updateQuestion(id, updates);
  }

  async deleteQuestion(id: string): Promise<boolean> {
    await this.initialize();
    return await this.indexedDB.deleteQuestion(id);
  }

  async searchQuestions(query: string): Promise<Question[]> {
    await this.initialize();
    const allQuestions = await this.indexedDB.getQuestions();
    const lowercaseQuery = query.toLowerCase();

    return allQuestions.filter(
      (question) =>
        question.subject.toLowerCase().includes(lowercaseQuery) ||
        question.answer.toLowerCase().includes(lowercaseQuery),
    );
  }

  async getBookmarkedQuestions(): Promise<Question[]> {
    await this.initialize();
    const allQuestions = await this.indexedDB.getQuestions();
    return allQuestions.filter((q) => q.isBookmarked);
  }

  async getEditedQuestions(): Promise<Question[]> {
    await this.initialize();
    const allQuestions = await this.indexedDB.getQuestions();
    return allQuestions.filter((q) => q.isEdited);
  }

  // ==================== 用户编辑管理 ====================

  async getUserEdits(): Promise<UserEdit[]> {
    await this.initialize();
    return await this.indexedDB.getUserEdits();
  }

  async saveUserEdit(edit: UserEdit): Promise<boolean> {
    await this.initialize();

    // 保存编辑记录
    const editSaved = await this.indexedDB.saveUserEdit(edit);

    if (editSaved) {
      // 更新题目状态
      await this.updateQuestion(edit.questionId, {
        isEdited: true,
        editedAt: edit.editedAt,
        subject: edit.editedSubject,
        answer: edit.editedAnswer,
      });
    }

    return editSaved;
  }

  async deleteUserEdit(questionId: string): Promise<boolean> {
    await this.initialize();

    // 删除编辑记录
    const editDeleted = await this.indexedDB.deleteUserEdit(questionId);

    if (editDeleted) {
      // 恢复题目原始状态
      const question = await this.getQuestionById(questionId);
      if (question && question.isEdited) {
        await this.updateQuestion(questionId, {
          isEdited: false,
          editedAt: undefined,
          subject: question.originalSubject || question.subject,
          answer: question.originalAnswer || question.answer,
          originalSubject: undefined,
          originalAnswer: undefined,
        });
      }
    }

    return editDeleted;
  }

  async restoreQuestion(questionId: string): Promise<boolean> {
    return await this.deleteUserEdit(questionId);
  }

  // ==================== 用户偏好管理 ====================

  async getUserPreference(key: string): Promise<any> {
    await this.initialize();
    return await this.indexedDB.getUserPreference(key);
  }

  async setUserPreference(key: string, value: any): Promise<boolean> {
    await this.initialize();
    return await this.indexedDB.setUserPreference(key, value);
  }

  async clearUserPreferences(): Promise<boolean> {
    await this.initialize();
    return await this.indexedDB.clearUserPreferences();
  }

  // ==================== 数据统计 ====================

  async getDataStatistics(): Promise<{
    categoriesCount: number;
    questionsCount: number;
    editsCount: number;
    bookmarkedCount: number;
    totalSize: number;
  }> {
    await this.initialize();

    const baseStats = await this.indexedDB.getDataStatistics();
    const bookmarkedQuestions = await this.getBookmarkedQuestions();

    return {
      ...baseStats,
      bookmarkedCount: bookmarkedQuestions.length,
    };
  }

  // ==================== 数据导入导出 ====================

  async exportData(): Promise<{
    categories: Category[];
    questions: Question[];
    userEdits: UserEdit[];
    exportedAt: Date;
    version: string;
  }> {
    await this.initialize();

    const exportedData = await this.indexedDB.exportData();

    return {
      ...exportedData,
      exportedAt: new Date(),
      version: this.generateDataVersion(
        exportedData.categories,
        exportedData.questions,
      ),
    };
  }

  async importData(data: {
    categories: Category[];
    questions: Question[];
    userEdits: UserEdit[];
  }): Promise<boolean> {
    await this.initialize();

    try {
      // 导入到IndexedDB
      const imported = await this.indexedDB.importData(data);

      if (imported) {
        // 更新缓存
        const version = this.generateDataVersion(
          data.categories,
          data.questions,
        );
        await cacheManager.setCachedData(
          {
            categories: data.categories,
            questions: data.questions,
          },
          version,
        );

        console.log("数据导入成功");
      }

      return imported;
    } catch (error) {
      console.error("数据导入失败:", error);
      return false;
    }
  }

  // ==================== 数据清理 ====================

  async clearAllData(): Promise<boolean> {
    await this.initialize();

    try {
      await Promise.all([
        this.indexedDB.clearAllData(),
        cacheManager.clearCache(),
      ]);

      console.log("所有数据已清理");
      return true;
    } catch (error) {
      console.error("清理数据失败:", error);
      return false;
    }
  }

  // 清除所有缓存的别名方法
  async clearAllCache(): Promise<boolean> {
    return await this.clearAllData();
  }

  async clearExpiredCache(): Promise<number> {
    return await cacheManager.clearExpiredCache();
  }

  // 获取缓存状态
  async getCacheStatus(): Promise<{
    hasCache: boolean;
    version: string;
    lastUpdated: Date;
    isExpired: boolean;
    totalSize?: number;
  }> {
    try {
      const cacheInfo = await cacheManager.checkCacheVersion();

      return {
        hasCache: cacheInfo.hasCache,
        version: cacheInfo.version,
        lastUpdated: cacheInfo.lastUpdated,
        isExpired: cacheInfo.isExpired,
        // totalSize: 暂时不提供，因为需要额外计算
      };
    } catch (error) {
      console.error("获取缓存状态失败:", error);
      return {
        hasCache: false,
        version: "",
        lastUpdated: new Date(),
        isExpired: true,
      };
    }
  }

  // ==================== 数据一致性检查 ====================

  async validateDataIntegrity(): Promise<{
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    await this.initialize();

    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      // 检查分类和题目的一致性
      const [categories, questions] = await Promise.all([
        this.getCategories(),
        this.getQuestions(),
      ]);

      // 检查孤儿题目
      const categoryIds = new Set(categories.map((c) => c.id));
      const orphanQuestions = questions.filter(
        (q) => !categoryIds.has(q.categoryId),
      );

      if (orphanQuestions.length > 0) {
        issues.push(`发现 ${orphanQuestions.length} 道孤儿题目（分类不存在）`);
        suggestions.push("建议清理孤儿题目或重新创建对应分类");
      }

      // 检查分类题目数量
      for (const category of categories) {
        const actualCount = questions.filter(
          (q) => q.categoryId === category.id,
        ).length;
        if (actualCount !== category.questionCount) {
          issues.push(
            `分类 "${category.name}" 题目数量不一致: 预期${category.questionCount}, 实际${actualCount}`,
          );
          suggestions.push(`更新分类 "${category.name}" 的题目数量`);
        }
      }

      // 检查题目数据完整性
      for (const question of questions) {
        if (!dataTransformer.validateQuestionData(question)) {
          issues.push(`题目 ${question.id} 数据格式不正确`);
          suggestions.push(`修复或删除题目 ${question.id}`);
        }
      }

      return {
        isValid: issues.length === 0,
        issues,
        suggestions,
      };
    } catch (error) {
      return {
        isValid: false,
        issues: [
          "数据完整性检查失败: " +
          (error instanceof Error ? error.message : String(error)),
        ],
        suggestions: ["重新加载数据或清理缓存"],
      };
    }
  }

  // ==================== 工具方法 ====================

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ==================== 配置管理 ====================

  updateConfig(newConfig: Partial<DataServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): DataServiceConfig {
    return { ...this.config };
  }
}

// ==================== 数据服务实例 ====================

export const interviewDataService = new InterviewDataService();

// ==================== 便捷函数 ====================

export async function loadInterviewData(
  scriptConfigs: ScriptConfig[],
  onProgress?: (state: LoadingState) => void,
): Promise<{
  success: boolean;
  categories: Category[];
  questions: Question[];
  fromCache: boolean;
  error?: string;
}> {
  return await interviewDataService.loadData(scriptConfigs, onProgress);
}

export async function getInterviewCategories(): Promise<Category[]> {
  return await interviewDataService.getCategories();
}

export async function getInterviewQuestions(
  categoryId?: string,
): Promise<Question[]> {
  return await interviewDataService.getQuestions(categoryId);
}

export async function searchInterviewQuestions(
  query: string,
): Promise<Question[]> {
  return await interviewDataService.searchQuestions(query);
}

export async function saveInterviewEdit(edit: UserEdit): Promise<boolean> {
  return await interviewDataService.saveUserEdit(edit);
}

export async function restoreInterviewQuestion(
  questionId: string,
): Promise<boolean> {
  return await interviewDataService.restoreQuestion(questionId);
}

export default interviewDataService;
