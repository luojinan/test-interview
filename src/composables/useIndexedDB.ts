import {
  type ComputedRef,
  computed,
  onMounted,
  onUnmounted,
  type Ref,
  ref,
} from "vue";
import {
  db,
  getDatabaseStatus,
  initializeDatabase,
} from "@/services/database/schema";
import { interviewStorage } from "@/services/storage/interviewStorage";
import type {
  Category,
  OriginalQuestionData,
  Question,
  UserEdit,
} from "@/types/interview";
import type {
  CategoryRecord,
  DatabaseOperationResult,
  QuestionRecord,
  UserEditRecord,
  UserPreferenceRecord,
} from "@/types/storage";
import { dataTransformer } from "@/utils/dataTransform";

// IndexedDB操作封装Hook - 提供CRUD操作和事务管理

// ==================== Hook接口定义 ====================

export interface UseIndexedDBReturn {
  // 状态
  isReady: ComputedRef<boolean>;
  isOperating: ComputedRef<boolean>;
  lastError: Ref<string | null>;

  // 分类操作
  getCategories: () => Promise<Category[]>;
  saveCategories: (categories: Category[]) => Promise<boolean>;
  addCategory: (category: Category) => Promise<boolean>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<boolean>;
  deleteCategory: (id: string) => Promise<boolean>;

  // 题目操作
  getQuestions: (categoryId?: string) => Promise<Question[]>;
  saveQuestions: (questions: Question[]) => Promise<boolean>;
  addQuestion: (question: Question) => Promise<boolean>;
  updateQuestion: (id: string, updates: Partial<Question>) => Promise<boolean>;
  deleteQuestion: (id: string) => Promise<boolean>;

  // 用户编辑操作
  getUserEdits: () => Promise<UserEdit[]>;
  saveUserEdit: (edit: UserEdit) => Promise<boolean>;
  deleteUserEdit: (questionId: string) => Promise<boolean>;
  clearUserEdits: () => Promise<boolean>;

  // 用户偏好操作
  getUserPreference: (key: string) => Promise<any>;
  setUserPreference: (key: string, value: any) => Promise<boolean>;
  clearUserPreferences: () => Promise<boolean>;

  // 批量操作
  batchUpdateQuestions: (
    updates: Array<{ id: string; data: Partial<Question> }>,
  ) => Promise<boolean>;
  batchDeleteQuestions: (ids: string[]) => Promise<boolean>;

  // 数据统计
  getDataStatistics: () => Promise<{
    categoriesCount: number;
    questionsCount: number;
    editsCount: number;
    totalSize: number;
  }>;

  // 数据导入导出
  exportData: () => Promise<{
    categories: Category[];
    questions: Question[];
    userEdits: UserEdit[];
  }>;
  importData: (data: {
    categories: Category[];
    questions: Question[];
    userEdits: UserEdit[];
  }) => Promise<boolean>;

  // 工具方法
  clearAllData: () => Promise<boolean>;
  compactDatabase: () => Promise<boolean>;
}

// ==================== Hook实现 ====================

export function useIndexedDB(): UseIndexedDBReturn {
  // ==================== 响应式状态 ====================

  const isReady = ref(false);
  const isOperating = ref(false);
  const lastError = ref<string | null>(null);

  // ==================== 初始化检查 ====================

  async function checkDatabaseReady(): Promise<boolean> {
    try {
      await db.open();
      isReady.value = true;
      return true;
    } catch (error) {
      console.error("数据库初始化失败:", error);
      setError("数据库初始化失败");
      return false;
    }
  }

  // 计算属性
  const isReadyComputed = computed(() => isReady.value);
  const isOperatingComputed = computed(() => isOperating.value);

  // ==================== 错误处理 ====================

  function setError(message: string): void {
    lastError.value = message;
    console.error("IndexedDB操作错误:", message);
  }

  function clearError(): void {
    lastError.value = null;
  }

  async function executeOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<DatabaseOperationResult<T>> {
    if (!isReady.value) {
      await checkDatabaseReady();
    }

    isOperating.value = true;
    clearError();

    try {
      const result = await operation();
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setError(`${operationName}失败: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      isOperating.value = false;
    }
  }

  // ==================== 分类操作 ====================

  async function getCategories(): Promise<Category[]> {
    const result = await executeOperation(async () => {
      const records = await db.categories.toArray();
      return dataTransformer.recordsToCategories(records);
    }, "获取分类列表");

    return result.data || [];
  }

  async function saveCategories(categories: Category[]): Promise<boolean> {
    const result = await executeOperation(async () => {
      const records = dataTransformer.categoriesToRecords(categories);
      await db.categories.clear();
      await db.categories.bulkAdd(records);
      return true;
    }, "保存分类列表");

    return result.success;
  }

  async function addCategory(category: Category): Promise<boolean> {
    const result = await executeOperation(async () => {
      const record = dataTransformer.categoryToRecord(category);
      await db.categories.add(record);
      return true;
    }, "添加分类");

    return result.success;
  }

  async function updateCategory(
    id: string,
    updates: Partial<Category>,
  ): Promise<boolean> {
    const result = await executeOperation(async () => {
      const existing = await db.categories.get(id);
      if (!existing) {
        throw new Error(`分类 ${id} 不存在`);
      }

      const updated = { ...existing, ...updates, updatedAt: new Date() };
      await db.categories.put(updated);
      return true;
    }, "更新分类");

    return result.success;
  }

  async function deleteCategory(id: string): Promise<boolean> {
    const result = await executeOperation(async () => {
      await db.categories.delete(id);
      return true;
    }, "删除分类");

    return result.success;
  }

  // ==================== 题目操作 ====================

  async function getQuestions(categoryId?: string): Promise<Question[]> {
    const result = await executeOperation(async () => {
      let records: QuestionRecord[];

      if (categoryId) {
        records = await db.questions
          .where("categoryId")
          .equals(categoryId)
          .toArray();
      } else {
        records = await db.questions.toArray();
      }

      return dataTransformer.recordsToQuestions(records);
    }, "获取题目列表");

    return result.data || [];
  }

  async function saveQuestions(questions: Question[]): Promise<boolean> {
    const result = await executeOperation(async () => {
      const records = dataTransformer.questionsToRecords(questions);

      // 使用事务确保数据一致性
      await db.transaction("rw", db.questions, async () => {
        await db.questions.clear();
        await db.questions.bulkAdd(records);
      });

      return true;
    }, "保存题目列表");

    return result.success;
  }

  async function addQuestion(question: Question): Promise<boolean> {
    const result = await executeOperation(async () => {
      const record = dataTransformer.questionToRecord(question);
      await db.questions.add(record);
      return true;
    }, "添加题目");

    return result.success;
  }

  async function updateQuestion(
    id: string,
    updates: Partial<Question>,
  ): Promise<boolean> {
    const result = await executeOperation(async () => {
      const existing = await db.questions.get(id);
      if (!existing) {
        throw new Error(`题目 ${id} 不存在`);
      }

      const updated = { ...existing, ...updates };
      await db.questions.put(updated);
      return true;
    }, "更新题目");

    return result.success;
  }

  async function deleteQuestion(id: string): Promise<boolean> {
    const result = await executeOperation(async () => {
      await db.questions.delete(id);
      return true;
    }, "删除题目");

    return result.success;
  }

  // ==================== 用户编辑操作 ====================

  async function getUserEdits(): Promise<UserEdit[]> {
    const result = await executeOperation(async () => {
      const records = await db.userEdits.toArray();
      return records.map((record) => ({
        questionId: record.questionId,
        editedSubject: record.editedSubject,
        editedAnswer: record.editedAnswer,
        editedAt: record.editedAt,
        editType: record.editType,
      }));
    }, "获取用户编辑列表");

    return result.data || [];
  }

  async function saveUserEdit(edit: UserEdit): Promise<boolean> {
    const result = await executeOperation(async () => {
      const record: UserEditRecord = {
        id: `edit_${edit.questionId}_${Date.now()}`,
        questionId: edit.questionId,
        editedSubject: edit.editedSubject,
        editedAnswer: edit.editedAnswer,
        editedAt: edit.editedAt,
        editType: edit.editType,
      };

      // 删除该题目的旧编辑记录
      await db.userEdits.where("questionId").equals(edit.questionId).delete();

      // 添加新编辑记录
      await db.userEdits.add(record);
      return true;
    }, "保存用户编辑");

    return result.success;
  }

  async function deleteUserEdit(questionId: string): Promise<boolean> {
    const result = await executeOperation(async () => {
      await db.userEdits.where("questionId").equals(questionId).delete();
      return true;
    }, "删除用户编辑");

    return result.success;
  }

  async function clearUserEdits(): Promise<boolean> {
    const result = await executeOperation(async () => {
      await db.userEdits.clear();
      return true;
    }, "清空用户编辑");

    return result.success;
  }

  // ==================== 用户偏好操作 ====================

  async function getUserPreference(key: string): Promise<any> {
    const result = await executeOperation(async () => {
      const record = await db.userPreferences.get(key);
      return record?.value;
    }, "获取用户偏好");

    return result.data;
  }

  async function setUserPreference(key: string, value: any): Promise<boolean> {
    const result = await executeOperation(async () => {
      const record: UserPreferenceRecord = {
        key,
        value,
        updatedAt: new Date(),
      };
      await db.userPreferences.put(record);
      return true;
    }, "设置用户偏好");

    return result.success;
  }

  async function clearUserPreferences(): Promise<boolean> {
    const result = await executeOperation(async () => {
      await db.userPreferences.clear();
      return true;
    }, "清空用户偏好");

    return result.success;
  }

  // ==================== 批量操作 ====================

  async function batchUpdateQuestions(
    updates: Array<{ id: string; data: Partial<Question> }>,
  ): Promise<boolean> {
    const result = await executeOperation(async () => {
      await db.transaction("rw", db.questions, async () => {
        for (const update of updates) {
          const existing = await db.questions.get(update.id);
          if (existing) {
            const updated = { ...existing, ...update.data };
            await db.questions.put(updated);
          }
        }
      });
      return true;
    }, "批量更新题目");

    return result.success;
  }

  async function batchDeleteQuestions(ids: string[]): Promise<boolean> {
    const result = await executeOperation(async () => {
      await db.questions.bulkDelete(ids);
      return true;
    }, "批量删除题目");

    return result.success;
  }

  // ==================== 数据统计 ====================

  async function getDataStatistics(): Promise<{
    categoriesCount: number;
    questionsCount: number;
    editsCount: number;
    totalSize: number;
  }> {
    const result = await executeOperation(async () => {
      const [categoriesCount, questionsCount, editsCount] = await Promise.all([
        db.categories.count(),
        db.questions.count(),
        db.userEdits.count(),
      ]);

      // 简单估算数据大小
      const categories = await db.categories.toArray();
      const questions = await db.questions.toArray();
      const edits = await db.userEdits.toArray();

      const totalSize = JSON.stringify({ categories, questions, edits }).length;

      return {
        categoriesCount,
        questionsCount,
        editsCount,
        totalSize,
      };
    }, "获取数据统计");

    return (
      result.data || {
        categoriesCount: 0,
        questionsCount: 0,
        editsCount: 0,
        totalSize: 0,
      }
    );
  }

  // ==================== 数据导入导出 ====================

  async function exportData(): Promise<{
    categories: Category[];
    questions: Question[];
    userEdits: UserEdit[];
  }> {
    const result = await executeOperation(async () => {
      const [categories, questions, userEdits] = await Promise.all([
        getCategories(),
        getQuestions(),
        getUserEdits(),
      ]);

      return { categories, questions, userEdits };
    }, "导出数据");

    return result.data || { categories: [], questions: [], userEdits: [] };
  }

  async function importData(data: {
    categories: Category[];
    questions: Question[];
    userEdits: UserEdit[];
  }): Promise<boolean> {
    const result = await executeOperation(async () => {
      await db.transaction(
        "rw",
        db.categories,
        db.questions,
        db.userEdits,
        async () => {
          // 清空现有数据
          await Promise.all([
            db.categories.clear(),
            db.questions.clear(),
            db.userEdits.clear(),
          ]);

          // 导入新数据
          await saveCategories(data.categories);
          await saveQuestions(data.questions);

          for (const edit of data.userEdits) {
            await saveUserEdit(edit);
          }
        },
      );

      return true;
    }, "导入数据");

    return result.success;
  }

  // ==================== 工具方法 ====================

  async function clearAllData(): Promise<boolean> {
    const result = await executeOperation(async () => {
      await db.transaction(
        "rw",
        [db.categories, db.questions, db.userEdits, db.userPreferences],
        async () => {
          await Promise.all([
            db.categories.clear(),
            db.questions.clear(),
            db.userEdits.clear(),
            db.userPreferences.clear(),
          ]);
        },
      );
      return true;
    }, "清空所有数据");

    return result.success;
  }

  async function compactDatabase(): Promise<boolean> {
    const result = await executeOperation(async () => {
      // IndexedDB没有直接的压缩方法，但可以重建数据库
      const exportedData = await exportData();
      await clearAllData();
      await importData(exportedData);
      return true;
    }, "压缩数据库");

    return result.success;
  }

  // ==================== 初始化 ====================

  // 初始化数据库连接
  checkDatabaseReady();

  // ==================== 返回接口 ====================

  return {
    // 状态
    isReady: isReadyComputed,
    isOperating: isOperatingComputed,
    lastError,

    // 分类操作
    getCategories,
    saveCategories,
    addCategory,
    updateCategory,
    deleteCategory,

    // 题目操作
    getQuestions,
    saveQuestions,
    addQuestion,
    updateQuestion,
    deleteQuestion,

    // 用户编辑操作
    getUserEdits,
    saveUserEdit,
    deleteUserEdit,
    clearUserEdits,

    // 用户偏好操作
    getUserPreference,
    setUserPreference,
    clearUserPreferences,

    // 批量操作
    batchUpdateQuestions,
    batchDeleteQuestions,

    // 数据统计
    getDataStatistics,

    // 数据导入导出
    exportData,
    importData,

    // 工具方法
    clearAllData,
    compactDatabase,
  };
}
