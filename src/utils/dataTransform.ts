import type {
  Category,
  OriginalQuestionData,
  Question,
} from "@/types/interview";
import type {
  CategoryRecord,
  DataTransformResult,
  QuestionRecord,
  ScriptLoadResult,
  ScriptConfig,
} from "@/types/storage";

// 数据转换工具函数 - 处理原始JSON与应用格式的双向转换

// ==================== 新增数据源转换类型 ====================

/**
 * 数据源转换上下文
 */
export interface DataSourceTransformContext {
  sourceConfig: ScriptConfig;
  sourceData: OriginalQuestionData[];
  loadResult?: ScriptLoadResult;
}

/**
 * 数据源分组策略
 */
export enum DataSourceGroupingStrategy {
  /** 按数据源分组（推荐） - 同一数据源的所有题目归为一个分类 */
  BY_DATA_SOURCE = 'by_data_source',
  /** 按原始catalogId分组（向后兼容） - 保持原有的按catalogId分组逻辑 */
  BY_CATALOG_ID = 'by_catalog_id',
  /** 混合模式 - 优先数据源，fallback到catalogId */
  HYBRID = 'hybrid'
}

/**
 * 基于数据源的转换结果
 */
export interface DataSourceTransformResult extends DataTransformResult {
  /** 数据源信息 */
  dataSourceInfo: {
    sourceCount: number;
    sourcesProcessed: Array<{
      categoryId: string;
      categoryName: string;
      questionsCount: number;
      hasErrors: boolean;
    }>;
  };
  /** 使用的分组策略 */
  groupingStrategy: DataSourceGroupingStrategy;
  /** 数据源到分类的映射 */
  dataSourceToCategoryMap: Map<string, string>;
}

// ==================== 数据转换类 ====================

export class DataTransformer {
  /**
   * 将时间数组转换为Date对象
   */
  arrayToDate(timeArray: number[]): Date {
    if (!Array.isArray(timeArray) || timeArray.length < 3) {
      return new Date();
    }

    try {
      // 注意：月份需要-1，因为Date构造函数的月份是0-11
      const [year, month, day, hour = 0, minute = 0, second = 0] = timeArray;
      return new Date(year, month - 1, day, hour, minute, second);
    } catch (error) {
      console.warn('时间数组转换失败:', timeArray, error);
      return new Date();
    }
  }

  /**
   * 原始数据转换为应用数据
   * @param original 原始题目数据
   * @param dataSourceContext 数据源上下文（可选）
   */
  transformOriginalQuestion(
    original: OriginalQuestionData,
    dataSourceContext?: DataSourceTransformContext
  ): Question {
    // 优先使用数据源的categoryId，fallback到原始数据的catalogId
    const categoryId = dataSourceContext?.sourceConfig.categoryId ?? String(original.catalogId);

    return {
      id: String(original.id),
      categoryId,
      subject: original.subject,
      answer: original.answer,
      readCount: original.readCount,
      createTime: this.arrayToDate(original.createTime),
      updateTime: this.arrayToDate(original.updateTime),
      isCollected: original.collect,

      // 用户编辑相关初始值
      isEdited: false,
      editedAt: undefined,
      originalSubject: undefined,
      originalAnswer: undefined,

      // UI状态初始值
      isExpanded: false,
      isBookmarked: original.collect,
    };
  }

  /**
   * 基于数据源的批量转换（推荐使用）
   * @param dataSources 数据源上下文数组
   * @param strategy 分组策略
   */
  transformByDataSource(
    dataSources: DataSourceTransformContext[],
    strategy: DataSourceGroupingStrategy = DataSourceGroupingStrategy.BY_DATA_SOURCE
  ): DataSourceTransformResult {
    const errors: string[] = [];
    const questions: Question[] = [];
    const sourcesProcessed: Array<{
      categoryId: string;
      categoryName: string;
      questionsCount: number;
      hasErrors: boolean;
    }> = [];
    const dataSourceToCategoryMap = new Map<string, string>();

    // 处理每个数据源
    for (const dataSourceContext of dataSources) {
      const { sourceConfig, sourceData } = dataSourceContext;
      let sourceErrors = 0;

      // 记录数据源到分类的映射
      dataSourceToCategoryMap.set(sourceConfig.categoryId, sourceConfig.categoryName);

      // 转换该数据源的所有题目
      for (const originalQuestion of sourceData) {
        try {
          const transformed = this.transformOriginalQuestion(originalQuestion, dataSourceContext);
          questions.push(transformed);
        } catch (error) {
          sourceErrors++;
          const errorMsg = `数据源 "${sourceConfig.categoryName}" 中题目ID ${originalQuestion.id} 转换失败: ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMsg);
          console.error(errorMsg, originalQuestion);
        }
      }

      // 记录数据源处理结果
      sourcesProcessed.push({
        categoryId: sourceConfig.categoryId,
        categoryName: sourceConfig.categoryName,
        questionsCount: sourceData.length - sourceErrors,
        hasErrors: sourceErrors > 0
      });
    }

    // 生成分类数据
    const categories = this.aggregateCategoriesByDataSource(
      questions,
      dataSources,
      strategy
    );

    return {
      categories,
      questions,
      transformedCount: questions.length,
      errors,
      dataSourceInfo: {
        sourceCount: dataSources.length,
        sourcesProcessed
      },
      groupingStrategy: strategy,
      dataSourceToCategoryMap
    };
  }

  /**
   * 批量数据转换（重构版本，支持数据源上下文）
   */
  transformQuestionsBatch(
    original: OriginalQuestionData[],
    categoryNameMap?: Map<string, string>,
    dataSourceContext?: DataSourceTransformContext,
    strategy: DataSourceGroupingStrategy = DataSourceGroupingStrategy.BY_CATALOG_ID
  ): DataTransformResult {
    const errors: string[] = [];
    const questions: Question[] = [];

    for (const originalQuestion of original) {
      try {
        const transformed = this.transformOriginalQuestion(originalQuestion, dataSourceContext);
        questions.push(transformed);
      } catch (error) {
        const errorMsg = `题目ID ${originalQuestion.id} 转换失败: ${error instanceof Error ? error.message : String(error)}`;
        errors.push(errorMsg);
        console.error(errorMsg, originalQuestion);
      }
    }

    // 生成分类数据 - 根据策略选择聚合方法
    let categories: Category[];
    if (strategy === DataSourceGroupingStrategy.BY_DATA_SOURCE && dataSourceContext) {
      categories = this.aggregateCategoriesByDataSource(questions, [dataSourceContext], strategy);
    } else {
      categories = this.aggregateCategories(questions, categoryNameMap);
    }

    return {
      categories,
      questions,
      transformedCount: questions.length,
      errors,
    };
  }

  /**
   * 基于数据源的分类聚合（新增方法）
   */
  aggregateCategoriesByDataSource(
    questions: Question[],
    dataSources: DataSourceTransformContext[],
    strategy: DataSourceGroupingStrategy = DataSourceGroupingStrategy.BY_DATA_SOURCE
  ): Category[] {
    const categoryMap = new Map<
      string,
      {
        id: string;
        name: string;
        count: number;
        sourceConfig?: ScriptConfig;
      }
    >();

    // 创建数据源配置映射
    const dataSourceConfigMap = new Map<string, ScriptConfig>();
    for (const dataSource of dataSources) {
      dataSourceConfigMap.set(dataSource.sourceConfig.categoryId, dataSource.sourceConfig);
    }

    // 统计每个分类的题目数量
    for (const question of questions) {
      const categoryId = question.categoryId;

      if (categoryMap.has(categoryId)) {
        const category = categoryMap.get(categoryId)!;
        category.count++;
      } else {
        // 优先使用数据源配置中的分类名称
        const sourceConfig = dataSourceConfigMap.get(categoryId);
        const categoryName = sourceConfig?.categoryName || this.inferCategoryName(categoryId, question);

        categoryMap.set(categoryId, {
          id: categoryId,
          name: categoryName,
          count: 1,
          sourceConfig,
        });
      }
    }

    // 转换为Category数组并排序
    const categories: Category[] = Array.from(categoryMap.values())
      .map((item) => ({
        id: item.id,
        name: item.name,
        questionCount: item.count,
        icon: this.getCategoryIcon(item.name),
        description: this.getCategoryDescription(item.name, item.sourceConfig),
      }))
      .sort((a, b) => {
        // 按优先级排序（如果有数据源配置），然后按题目数量降序
        const aConfig = dataSourceConfigMap.get(a.id);
        const bConfig = dataSourceConfigMap.get(b.id);

        if (aConfig && bConfig) {
          return aConfig.priority - bConfig.priority;
        }

        return b.questionCount - a.questionCount;
      });

    return categories;
  }

  /**
   * 分类数据聚合（原有方法，保持向后兼容）
   * 从题目数据中提取分类信息并统计题目数量
   */
  aggregateCategories(questions: Question[], categoryNameMap?: Map<string, string>): Category[] {
    const categoryMap = new Map<
      string,
      {
        id: string;
        name: string;
        count: number;
        firstQuestion?: Question;
      }
    >();

    // 统计每个分类的题目数量
    for (const question of questions) {
      const categoryId = question.categoryId;

      if (categoryMap.has(categoryId)) {
        const category = categoryMap.get(categoryId)!;
        category.count++;
      } else {
        // 优先使用传入的分类名称映射，其次使用推断
        const categoryName = categoryNameMap?.get(categoryId) || this.inferCategoryName(categoryId, question);

        categoryMap.set(categoryId, {
          id: categoryId,
          name: categoryName,
          count: 1,
          firstQuestion: question,
        });
      }
    }

    // 转换为Category数组并排序
    const categories: Category[] = Array.from(categoryMap.values())
      .map((item) => ({
        id: item.id,
        name: item.name,
        questionCount: item.count,
        icon: this.getCategoryIcon(item.name),
        description: this.getCategoryDescription(item.name),
      }))
      .sort((a, b) => b.questionCount - a.questionCount); // 按题目数量降序排列

    return categories;
  }

  /**
   * 数据验证
   */
  validateQuestionData(question: Question): boolean {
    // 基础字段验证
    if (
      !question.id ||
      !question.categoryId ||
      !question.subject ||
      !question.answer
    ) {
      return false;
    }

    // 数据类型验证
    if (
      typeof question.id !== "string" ||
      typeof question.categoryId !== "string" ||
      typeof question.subject !== "string" ||
      typeof question.answer !== "string"
    ) {
      return false;
    }

    // 日期验证
    if (
      !(question.createTime instanceof Date) ||
      !(question.updateTime instanceof Date)
    ) {
      return false;
    }

    // 布尔值验证
    if (
      typeof question.isCollected !== "boolean" ||
      typeof question.isEdited !== "boolean" ||
      typeof question.isExpanded !== "boolean" ||
      typeof question.isBookmarked !== "boolean"
    ) {
      return false;
    }

    return true;
  }

  /**
   * Question转换为QuestionRecord（用于数据库存储）
   */
  questionToRecord(question: Question): QuestionRecord {
    return {
      id: question.id,
      categoryId: question.categoryId,
      subject: question.subject,
      answer: question.answer,
      readCount: question.readCount,
      createTime: question.createTime,
      updateTime: question.updateTime,
      isCollected: question.isCollected,
      isEdited: question.isEdited,
      editedAt: question.editedAt,
      originalSubject: question.originalSubject,
      originalAnswer: question.originalAnswer,
    };
  }

  /**
   * QuestionRecord转换为Question（从数据库读取）
   */
  recordToQuestion(record: QuestionRecord): Question {
    return {
      id: record.id,
      categoryId: record.categoryId,
      subject: record.subject,
      answer: record.answer,
      readCount: record.readCount,
      createTime: record.createTime,
      updateTime: record.updateTime,
      isCollected: record.isCollected,
      isEdited: record.isEdited,
      editedAt: record.editedAt,
      originalSubject: record.originalSubject,
      originalAnswer: record.originalAnswer,

      // UI状态默认值
      isExpanded: false,
      isBookmarked: record.isCollected,
    };
  }

  /**
   * Category转换为CategoryRecord
   */
  categoryToRecord(category: Category): CategoryRecord {
    const now = new Date();
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      questionCount: category.questionCount,
      icon: category.icon,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * CategoryRecord转换为Category
   */
  recordToCategory(record: CategoryRecord): Category {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      questionCount: record.questionCount,
      icon: record.icon,
    };
  }

  /**
   * 批量转换Question到Record
   */
  questionsToRecords(questions: Question[]): QuestionRecord[] {
    return questions.map((q) => this.questionToRecord(q));
  }

  /**
   * 批量转换Record到Question
   */
  recordsToQuestions(records: QuestionRecord[]): Question[] {
    return records.map((r) => this.recordToQuestion(r));
  }

  /**
   * 批量转换Category到Record
   */
  categoriesToRecords(categories: Category[]): CategoryRecord[] {
    return categories.map((c) => this.categoryToRecord(c));
  }

  /**
   * 批量转换Record到Category
   */
  recordsToCategories(records: CategoryRecord[]): Category[] {
    return records.map((r) => this.recordToCategory(r));
  }

  // 私有辅助方法

  private readonly categoryIdNameMap: Record<number, string> = {
    18: '中软软件测试面试题',
    17: '字节软件测试面试题',
    16: '华为软件测试面试题',
    14: 'HR面试题',
    15: '性能测试面试题',
    7: 'APP自动化测试',
    6: '接口自动化测试',
    5: 'web自动化测试',
    12: 'pythone基础',
    11: '接口测试工具',
    13: 'Linux服务器',
    10: '数据库面试题',
    3: '软件测试基础'
  };

  /**
   * 根据分类ID获取分类名称
   * @deprecated 应该使用数据源配置中的 categoryName，此方法仅作为后备方案
   */
  private inferCategoryName(categoryId: string, question: Question): string {
    return this.categoryIdNameMap[Number(categoryId)] || `分类${categoryId}`;
  }

  /**
   * 获取分类图标
   */
  private getCategoryIcon(categoryName: string): string {
    const iconMap: Record<string, string> = {
      Linux题: "🐧",
      Python题: "🐍",
      Java题: "☕",
      JavaScript题: "🟨",
      前端框架题: "⚛️",
      数据库题: "🗃️",
      算法题: "🧮",
      华为软件测试面试题: "🏢",
      中软软件测试面试题: "🏗️",
      字节软件测试面试题: "🎯",
      HR面试题: "👥",
      性能测试面试题: "📊",
      APP自动化测试: "📱",
      接口自动化测试: "🔌",
      web自动化测试: "🌐",
      pythone基础: "🐍",
      接口测试工具: "🔧",
      Linux服务器: "🖥️",
      数据库面试题: "💾"
    };

    return iconMap[categoryName] || "📝";
  }

  /**
   * 获取分类描述
   */
  private getCategoryDescription(categoryName: string, sourceConfig?: ScriptConfig): string {
    // 如果有数据源配置且提供了描述信息，优先使用
    if (sourceConfig && sourceConfig.categoryName) {
      // 根据数据源配置生成更精确的描述
      return `${sourceConfig.categoryName}相关面试题目`;
    }

    const descriptionMap: Record<string, string> = {
      Linux题: "Linux系统操作和命令相关题目",
      Python题: "Python编程语言相关题目",
      Java题: "Java编程语言相关题目",
      JavaScript题: "JavaScript编程语言相关题目",
      前端框架题: "Vue、React等前端框架相关题目",
      数据库题: "数据库设计和SQL相关题目",
      算法题: "算法和数据结构相关题目",
      华为软件测试题: "华为公司软件测试岗位面试题目",
      中软软件测试面试题: "中软国际软件测试岗位面试题目",
      字节软件测试面试题: "字节跳动软件测试岗位面试题目",
      "HR面试题": "人力资源面试相关题目",
      性能测试面试题: "软件性能测试相关面试题目",
      "APP自动化测试": "移动应用自动化测试相关题目",
      接口自动化测试: "API接口自动化测试相关题目",
      "web自动化测试": "Web应用自动化测试相关题目",
      "pythone基础": "Python编程基础知识题目",
      接口测试工具: "API接口测试工具使用相关题目",
      "Linux服务器": "Linux服务器管理和运维相关题目",
      数据库面试题: "数据库技术面试相关题目",
    };

    return descriptionMap[categoryName] || "面试相关题目";
  }
}

// 导出数据转换工具实例
export const dataTransformer = new DataTransformer();

// ==================== 辅助工具函数 ====================

/**
 * 从ScriptLoadResult数组创建分类名称映射
 */
export function createCategoryNameMap(scriptResults: Array<{ categoryId: string; categoryName: string }>): Map<string, string> {
  const map = new Map<string, string>();

  for (const result of scriptResults) {
    if (result.categoryId && result.categoryName) {
      map.set(result.categoryId, result.categoryName);
    }
  }

  return map;
}

/**
 * 从数据源配置创建分类名称映射
 */
export function createCategoryNameMapFromConfig(dataSourceConfig: Record<string, { categoryId: string; categoryName: string }>): Map<string, string> {
  const map = new Map<string, string>();

  for (const config of Object.values(dataSourceConfig)) {
    if (config.categoryId && config.categoryName) {
      map.set(config.categoryId, config.categoryName);
    }
  }

  return map;
}

/**
 * 从ScriptLoadResult数组创建数据源转换上下文
 */
export function createDataSourceContexts(
  scriptResults: ScriptLoadResult[],
  scriptConfigs: Record<string, ScriptConfig>
): DataSourceTransformContext[] {
  const contexts: DataSourceTransformContext[] = [];

  for (const result of scriptResults) {
    const sourceConfig = scriptConfigs[result.categoryId];

    if (sourceConfig && result.data) {
      contexts.push({
        sourceConfig,
        sourceData: result.data,
        loadResult: result
      });
    } else {
      console.warn(`无法为数据源 ${result.categoryId} 创建转换上下文:`, {
        hasConfig: !!sourceConfig,
        hasData: !!result.data
      });
    }
  }

  return contexts;
}

/**
 * 验证数据源转换上下文
 */
export function validateDataSourceContext(context: DataSourceTransformContext): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 验证源配置
  if (!context.sourceConfig) {
    errors.push('缺少源配置');
  } else {
    if (!context.sourceConfig.categoryId) {
      errors.push('源配置缺少categoryId');
    }
    if (!context.sourceConfig.categoryName) {
      errors.push('源配置缺少categoryName');
    }
    if (!context.sourceConfig.scriptUrl) {
      errors.push('源配置缺少scriptUrl');
    }
  }

  // 验证源数据
  if (!context.sourceData) {
    errors.push('缺少源数据');
  } else if (!Array.isArray(context.sourceData)) {
    errors.push('源数据不是数组');
  } else if (context.sourceData.length === 0) {
    errors.push('源数据为空');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 批量验证数据源转换上下文
 */
export function validateDataSourceContexts(contexts: DataSourceTransformContext[]): {
  isValid: boolean;
  validContexts: DataSourceTransformContext[];
  invalidContexts: Array<{
    context: DataSourceTransformContext;
    errors: string[];
  }>;
} {
  const validContexts: DataSourceTransformContext[] = [];
  const invalidContexts: Array<{
    context: DataSourceTransformContext;
    errors: string[];
  }> = [];

  for (const context of contexts) {
    const validation = validateDataSourceContext(context);

    if (validation.isValid) {
      validContexts.push(context);
    } else {
      invalidContexts.push({
        context,
        errors: validation.errors
      });
    }
  }

  return {
    isValid: invalidContexts.length === 0,
    validContexts,
    invalidContexts
  };
}

/**
 * 从数据源配置和脚本加载结果创建优化的转换管道
 */
export function createOptimizedTransformPipeline(
  scriptResults: ScriptLoadResult[],
  scriptConfigs: Record<string, ScriptConfig>,
  strategy: DataSourceGroupingStrategy = DataSourceGroupingStrategy.BY_DATA_SOURCE
): {
  contexts: DataSourceTransformContext[];
  transform: () => DataSourceTransformResult;
  validate: () => { isValid: boolean; errors: string[] };
} {
  // 创建数据源上下文
  const contexts = createDataSourceContexts(scriptResults, scriptConfigs);

  return {
    contexts,
    transform: () => dataTransformer.transformByDataSource(contexts, strategy),
    validate: () => {
      const validation = validateDataSourceContexts(contexts);
      return {
        isValid: validation.isValid,
        errors: validation.invalidContexts.flatMap(item => item.errors)
      };
    }
  };
}

/**
 * 创建向后兼容的转换方法（用于迁移期间）
 */
export function createCompatibleTransform(
  originalData: OriginalQuestionData[],
  categoryNameMap?: Map<string, string>
): DataTransformResult {
  return dataTransformer.transformQuestionsBatch(
    originalData,
    categoryNameMap,
    undefined,
    DataSourceGroupingStrategy.BY_CATALOG_ID
  );
}

/**
 * 数据源分组策略检测
 * 根据数据特征自动推荐最佳分组策略
 */
export function detectOptimalGroupingStrategy(
  originalData: OriginalQuestionData[],
  dataSources?: DataSourceTransformContext[]
): {
  recommendedStrategy: DataSourceGroupingStrategy;
  reasons: string[];
  confidence: number; // 0-1
} {
  const reasons: string[] = [];
  let confidence = 0.5;

  // 如果有明确的数据源配置，推荐数据源策略
  if (dataSources && dataSources.length > 0) {
    reasons.push('检测到数据源配置，推荐按数据源分组');
    confidence += 0.3;

    // 检查数据源是否有重复的categoryId
    const categoryIds = new Set(dataSources.map(d => d.sourceConfig.categoryId));
    if (categoryIds.size === dataSources.length) {
      reasons.push('数据源categoryId唯一，适合按数据源分组');
      confidence += 0.2;
    }

    return {
      recommendedStrategy: DataSourceGroupingStrategy.BY_DATA_SOURCE,
      reasons,
      confidence: Math.min(confidence, 1.0)
    };
  }

  // 分析原始数据的catalogId分布
  const catalogIds = new Set(originalData.map(q => q.catalogId));
  const avgQuestionsPerCatalog = originalData.length / catalogIds.size;

  if (avgQuestionsPerCatalog > 50) {
    reasons.push('每个catalogId平均题目数量较多，适合按catalogId分组');
    confidence += 0.2;
  } else {
    reasons.push('每个catalogId平均题目数量较少，可能需要数据源分组');
    confidence -= 0.1;
  }

  return {
    recommendedStrategy: catalogIds.size > 10
      ? DataSourceGroupingStrategy.BY_CATALOG_ID
      : DataSourceGroupingStrategy.HYBRID,
    reasons,
    confidence: Math.max(0.1, confidence)
  };
}
