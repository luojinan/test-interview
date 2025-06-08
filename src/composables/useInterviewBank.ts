import {
  type ComputedRef,
  computed,
  onMounted,
  type Ref,
  ref,
  watch,
} from "vue";
import dataSourceManager from "@/config/dataSourceConfig";
import { interviewDataService } from "@/services/interviewDataService";
import type {
  Category,
  Question,
  UserEdit,
  UserPreferences,
} from "@/types/interview";
import type { LoadingState } from "@/types/storage";

// ==================== Hook类型定义 ====================

export interface UseInterviewBankReturn {
  // 状态
  categories: Ref<Category[]>;
  questions: Ref<Question[]>;
  currentCategoryId: Ref<string>;
  searchQuery: Ref<string>;
  isLoading: Ref<boolean>;
  loadingState: Ref<LoadingState | null>;
  error: Ref<string | null>;
  preferences: Ref<UserPreferences>;

  // 计算属性
  currentCategory: ComputedRef<Category | undefined>;
  currentQuestions: ComputedRef<Question[]>;
  bookmarkedQuestions: ComputedRef<Question[]>;
  editedQuestions: ComputedRef<Question[]>;

  // 数据加载
  initializeData: () => Promise<boolean>;
  refreshData: (forceReload?: boolean) => Promise<boolean>;

  // 分类操作
  switchCategory: (categoryId: string) => void;

  // 题目操作
  toggleQuestion: (questionId: string) => void;
  toggleBookmark: (questionId: string) => Promise<boolean>;

  // 编辑操作
  editQuestion: (
    questionId: string,
    newSubject: string,
    newAnswer: string,
  ) => Promise<boolean>;
  restoreQuestion: (questionId: string) => Promise<boolean>;

  // 搜索
  search: (query: string) => void;

  // 偏好设置
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<boolean>;

  // 数据统计
  getStatistics: () => Promise<{
    categoriesCount: number;
    questionsCount: number;
    editsCount: number;
    bookmarkedCount: number;
  }>;

  // 缓存管理
  clearAllCache: () => Promise<boolean>;
  clearExpiredCache: () => Promise<number>;
  getCacheStatus: () => Promise<{
    hasCache: boolean;
    version: string;
    lastUpdated: Date;
    isExpired: boolean;
    totalSize?: number;
  }>;
}

export function useInterviewBank(): UseInterviewBankReturn {
  // ==================== 响应式状态 ====================

  const categories = ref<Category[]>([]);
  const questions = ref<Question[]>([]);
  const currentCategoryId = ref<string>("");
  const searchQuery = ref<string>("");
  const isLoading = ref<boolean>(false);
  const loadingState = ref<LoadingState | null>(null);
  const error = ref<string | null>(null);

  const preferences = ref<UserPreferences>({
    selectedCategoryId: "",
    theme: "auto",
    autoExpandAnswers: false,
    compactMode: false,
  });

  // ==================== 计算属性 ====================

  const currentCategory = computed(() =>
    categories.value.find((cat) => cat.id === currentCategoryId.value),
  );

  const currentQuestions = computed(() => {
    let filtered = questions.value.filter(
      (q) =>
        currentCategoryId.value === "" ||
        q.categoryId === currentCategoryId.value,
    );

    // 搜索过滤
    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        (q) =>
          q.subject.toLowerCase().includes(query) ||
          q.answer.toLowerCase().includes(query),
      );
    }

    return filtered;
  });

  const bookmarkedQuestions = computed(() =>
    questions.value.filter((q) => q.isBookmarked),
  );

  const editedQuestions = computed(() =>
    questions.value.filter((q) => q.isEdited),
  );

  // ==================== 错误处理 ====================

  function setError(message: string): void {
    error.value = message;
    console.error("useInterviewBank错误:", message);
  }

  function clearError(): void {
    error.value = null;
  }

  // ==================== 数据加载 ====================

  async function initializeData(): Promise<boolean> {
    try {
      isLoading.value = true;
      clearError();

      // 加载用户偏好设置
      await loadUserPreferences();

      // 获取数据源配置
      const scriptConfigs = dataSourceManager.getDataSourceConfigs();

      if (scriptConfigs.length === 0) {
        throw new Error("没有配置任何数据源");
      }

      // 加载数据
      const result = await interviewDataService.loadData(
        scriptConfigs,
        (state) => {
          loadingState.value = state;
        },
      );

      if (!result.success) {
        throw new Error(result.error || "数据加载失败");
      }

      // 更新状态
      categories.value = result.categories;
      questions.value = result.questions;

      // 设置默认分类
      if (categories.value.length > 0 && !currentCategoryId.value) {
        const savedCategoryId = preferences.value.selectedCategoryId;
        const validCategory = categories.value.find(
          (cat) => cat.id === savedCategoryId,
        );

        currentCategoryId.value = validCategory
          ? savedCategoryId
          : categories.value[0].id;
        preferences.value.selectedCategoryId = currentCategoryId.value;
        await saveUserPreferences();
      }

      // 应用用户编辑
      await applyUserEdits();

      console.log(
        `数据初始化完成: ${categories.value.length}个分类, ${questions.value.length}道题目 (${result.fromCache ? "缓存" : "远程"})`,
      );

      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "数据初始化失败";
      setError(errorMessage);
      return false;
    } finally {
      isLoading.value = false;
      loadingState.value = null;
    }
  }

  async function refreshData(forceReload = false): Promise<boolean> {
    try {
      if (forceReload) {
        // 清理缓存，强制重新加载
        await interviewDataService.clearExpiredCache();
      }

      return await initializeData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "数据刷新失败";
      setError(errorMessage);
      return false;
    }
  }

  // ==================== 用户编辑处理 ====================

  async function applyUserEdits(): Promise<void> {
    try {
      const userEdits = await interviewDataService.getUserEdits();

      for (const edit of userEdits) {
        const question = questions.value.find((q) => q.id === edit.questionId);
        if (question) {
          // 保存原始内容
          if (!question.isEdited) {
            question.originalSubject = question.subject;
            question.originalAnswer = question.answer;
          }

          // 应用编辑
          question.subject = edit.editedSubject;
          question.answer = edit.editedAnswer;
          question.isEdited = true;
          question.editedAt = edit.editedAt;
        }
      }
    } catch (err) {
      console.warn("应用用户编辑失败:", err);
    }
  }

  // ==================== 偏好设置管理 ====================

  async function loadUserPreferences(): Promise<void> {
    try {
      const keys = [
        "selectedCategoryId",
        "theme",
        "autoExpandAnswers",
        "compactMode",
      ];

      for (const key of keys) {
        const value = await interviewDataService.getUserPreference(key);
        if (value !== undefined) {
          (preferences.value as any)[key] = value;
        }
      }
    } catch (err) {
      console.warn("加载用户偏好失败:", err);
    }
  }

  async function saveUserPreferences(): Promise<void> {
    try {
      const entries = Object.entries(preferences.value);
      await Promise.all(
        entries.map(([key, value]) =>
          interviewDataService.setUserPreference(key, value),
        ),
      );
    } catch (err) {
      console.warn("保存用户偏好失败:", err);
    }
  }

  // ==================== 分类操作 ====================

  function switchCategory(categoryId: string): void {
    currentCategoryId.value = categoryId;
    preferences.value.selectedCategoryId = categoryId;
    saveUserPreferences();

    // 清除搜索
    searchQuery.value = "";
  }

  // ==================== 题目操作 ====================

  function toggleQuestion(questionId: string): void {
    const question = questions.value.find((q) => q.id === questionId);
    if (question) {
      question.isExpanded = !question.isExpanded;
    }
  }

  async function toggleBookmark(questionId: string): Promise<boolean> {
    try {
      const question = questions.value.find((q) => q.id === questionId);
      if (!question) return false;

      const newBookmarkState = !question.isBookmarked;
      question.isBookmarked = newBookmarkState;
      question.isCollected = newBookmarkState;

      // 更新到数据库
      const success = await interviewDataService.updateQuestion(questionId, {
        isBookmarked: newBookmarkState,
        isCollected: newBookmarkState,
      });

      if (!success) {
        // 回滚状态
        question.isBookmarked = !newBookmarkState;
        question.isCollected = !newBookmarkState;
        throw new Error("更新收藏状态失败");
      }

      return true;
    } catch (err) {
      console.error("切换收藏状态失败:", err);
      return false;
    }
  }

  // ==================== 编辑操作 ====================

  async function editQuestion(
    questionId: string,
    newSubject: string,
    newAnswer: string,
  ): Promise<boolean> {
    try {
      const question = questions.value.find((q) => q.id === questionId);
      if (!question) return false;

      // 创建编辑记录
      const edit: UserEdit = {
        questionId,
        editedSubject: newSubject,
        editedAnswer: newAnswer,
        editedAt: new Date(),
        editType: "both",
      };

      // 保存编辑到数据服务
      const success = await interviewDataService.saveUserEdit(edit);

      if (success) {
        // 更新本地状态
        if (!question.isEdited) {
          question.originalSubject = question.subject;
          question.originalAnswer = question.answer;
        }

        question.subject = newSubject;
        question.answer = newAnswer;
        question.isEdited = true;
        question.editedAt = new Date();
      }

      return success;
    } catch (err) {
      console.error("编辑题目失败:", err);
      return false;
    }
  }

  async function restoreQuestion(questionId: string): Promise<boolean> {
    try {
      const question = questions.value.find((q) => q.id === questionId);
      if (!question || !question.isEdited) return false;

      // 删除编辑记录
      const success = await interviewDataService.restoreQuestion(questionId);

      if (success) {
        // 恢复本地状态
        question.subject = question.originalSubject || question.subject;
        question.answer = question.originalAnswer || question.answer;
        question.isEdited = false;
        question.editedAt = undefined;
        question.originalSubject = undefined;
        question.originalAnswer = undefined;
      }

      return success;
    } catch (err) {
      console.error("恢复题目失败:", err);
      return false;
    }
  }

  // ==================== 搜索功能 ====================

  function search(query: string): void {
    searchQuery.value = query;
  }

  // ==================== 偏好设置更新 ====================

  async function updatePreferences(
    updates: Partial<UserPreferences>,
  ): Promise<boolean> {
    try {
      Object.assign(preferences.value, updates);
      await saveUserPreferences();

      // 如果更新了选中的分类，切换分类
      if (
        updates.selectedCategoryId &&
        updates.selectedCategoryId !== currentCategoryId.value
      ) {
        switchCategory(updates.selectedCategoryId);
      }

      return true;
    } catch (err) {
      console.error("更新偏好设置失败:", err);
      return false;
    }
  }

  // ==================== 数据统计 ====================

  async function getStatistics(): Promise<{
    categoriesCount: number;
    questionsCount: number;
    editsCount: number;
    bookmarkedCount: number;
  }> {
    try {
      return await interviewDataService.getDataStatistics();
    } catch (err) {
      console.error("获取统计信息失败:", err);
      return {
        categoriesCount: categories.value.length,
        questionsCount: questions.value.length,
        editsCount: editedQuestions.value.length,
        bookmarkedCount: bookmarkedQuestions.value.length,
      };
    }
  }

  // ==================== 缓存管理 ====================

  async function clearAllCache(): Promise<boolean> {
    try {
      return await interviewDataService.clearAllCache();
    } catch (err) {
      console.error("清除所有缓存失败:", err);
      return false;
    }
  }

  async function clearExpiredCache(): Promise<number> {
    try {
      return await interviewDataService.clearExpiredCache();
    } catch (err) {
      console.error("清除过期缓存失败:", err);
      return 0;
    }
  }

  async function getCacheStatus(): Promise<{
    hasCache: boolean;
    version: string;
    lastUpdated: Date;
    isExpired: boolean;
    totalSize?: number;
  }> {
    try {
      return await interviewDataService.getCacheStatus();
    } catch (err) {
      console.error("获取缓存状态失败:", err);
      return {
        hasCache: false,
        version: "",
        lastUpdated: new Date(),
        isExpired: true,
      };
    }
  }

  // ==================== 响应式监听 ====================

  // 监听分类切换，保存偏好
  watch(currentCategoryId, (newId) => {
    if (newId && preferences.value.selectedCategoryId !== newId) {
      preferences.value.selectedCategoryId = newId;
      saveUserPreferences();
    }
  });

  // ==================== 生命周期 ====================

  onMounted(() => {
    initializeData();
  });

  // ==================== 返回接口 ====================

  return {
    // 状态
    categories,
    questions,
    currentCategoryId,
    searchQuery,
    isLoading,
    loadingState,
    error,
    preferences,

    // 计算属性
    currentCategory,
    currentQuestions,
    bookmarkedQuestions,
    editedQuestions,

    // 数据加载
    initializeData,
    refreshData,

    // 分类操作
    switchCategory,

    // 题目操作
    toggleQuestion,
    toggleBookmark,

    // 编辑操作
    editQuestion,
    restoreQuestion,

    // 搜索
    search,

    // 偏好设置
    updatePreferences,

    // 数据统计
    getStatistics,

    // 缓存管理
    clearAllCache,
    clearExpiredCache,
    getCacheStatus,
  };
}
