// 原始JSON数据结构（来自华为面试题数据）
export interface OriginalQuestionData {
  id: number;
  catalogId: number;
  subject: string;        // 题目内容
  answer: string;         // 答案内容
  readCount: number;      // 阅读次数
  createTime: number[];   // 创建时间数组 [年,月,日,时,分,秒]
  updateTime: number[];   // 更新时间数组
  optionStatus: number;   // 选项状态
  catalogName: string | null;  // 分类名称
  collect: boolean;       // 收藏状态
}

// 原始分类数据结构
export interface OriginalCatalogData {
  id: number;
  name: string;           // 分类名称
  description?: string;
}

// 应用内使用的分类接口
export interface Category {
  id: string;
  name: string;           // "Linux题", "Python题", "华为软件测试题"
  description?: string;
  questionCount: number;  // 该分类下的题目数量
  icon?: string;          // 分类图标
}

// 应用内使用的题目接口
export interface Question {
  id: string;
  categoryId: string;
  subject: string;        // 题目内容
  answer: string;         // 答案内容
  readCount: number;      // 阅读次数
  createTime: Date;       // 创建时间
  updateTime: Date;       // 更新时间
  isCollected: boolean;   // 收藏状态
  
  // 用户编辑相关
  isEdited: boolean;
  editedAt?: Date;
  originalSubject?: string;
  originalAnswer?: string;
  
  // UI状态
  isExpanded: boolean;    // 是否展开答案
  isBookmarked: boolean;  // 是否已收藏
}

// 用户编辑记录
export interface UserEdit {
  questionId: string;
  editedSubject: string;
  editedAnswer: string;
  editedAt: Date;
  editType: 'subject' | 'answer' | 'both';
}

// 用户偏好设置
export interface UserPreferences {
  selectedCategoryId: string;
  theme: 'light' | 'dark' | 'auto';
  autoExpandAnswers: boolean;
  showReadCount: boolean;
  compactMode: boolean;
}

// 应用状态接口
export interface InterviewBankState {
  categories: Category[];
  questions: Question[];
  userEdits: UserEdit[];
  preferences: UserPreferences;
  currentCategoryId: string;
  searchQuery: string;
  isLoading: boolean;
  error?: string;
}

// 本地存储结构
export interface LocalStorageSchema {
  // 原始数据缓存
  originalData: {
    questions: OriginalQuestionData[];
    lastUpdated: Date;
    version: string;
  };
  
  // 用户数据
  userData: {
    edits: UserEdit[];
    preferences: UserPreferences;
    bookmarks: string[];  // 收藏的题目ID列表
    readHistory: {
      questionId: string;
      lastRead: Date;
      readCount: number;
    }[];
  };
  
  // 应用缓存
  appCache: {
    transformedQuestions: Question[];
    categories: Category[];
    lastProcessed: Date;
  };
}

// 数据转换工具函数接口
export interface DataTransformUtils {
  // 时间数组转换为Date对象
  arrayToDate: (timeArray: number[]) => Date;
  
  // 原始数据转换为应用数据
  transformOriginalQuestion: (original: OriginalQuestionData) => Question;
  
  // 批量数据转换
  transformQuestionsBatch: (original: OriginalQuestionData[]) => Question[];
  
  // 分类数据聚合
  aggregateCategories: (questions: Question[]) => Category[];
  
  // 数据验证
  validateQuestionData: (question: Question) => boolean;
}

// 加载状态相关接口
export interface LoadingState {
  phase: 'checking' | 'loading' | 'processing' | 'complete' | 'error';
  totalCategories: number;
  loadedCategories: number;
  currentCategory?: {
    id: string;
    name: string;
    status: 'pending' | 'loading' | 'success' | 'error';
    progress: number;        // 0-100
    questionsCount?: number;
  };
  categories: Array<{
    id: string;
    name: string;
    status: 'pending' | 'loading' | 'success' | 'error';
    questionsCount: number;
    loadTime?: number;       // 加载耗时(ms)
  }>;
  overallProgress: number;   // 0-100
  errorMessage?: string;
}

// Script加载配置接口
export interface ScriptLoadingConfig {
  // 数据源配置
  dataSources: {
    [categoryId: string]: {
      scriptUrl: string;         // JSON数据的script标签URL
      globalVarName: string;     // 全局变量名
      categoryName: string;      // 分类显示名称
      priority: number;          // 加载优先级
      essential: boolean;        // 是否为必需数据
    };
  };
  
  // 加载配置
  loadingConfig: {
    concurrent: number;          // 并发加载数量
    timeout: number;            // 超时时间(ms)
    retryCount: number;         // 重试次数
    retryDelay: number;         // 重试延迟(ms)
  };
} 