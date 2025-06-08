// 数据源配置 - 定义script加载的配置信息

import type { ScriptConfig, ScriptLoadingConfig } from '@/types/storage'

// ==================== 数据源配置定义 ====================

export interface DataSourceEnvironment {
  development: ScriptLoadingConfig
  production: ScriptLoadingConfig
}
// ==================== 默认数据源配置 ====================

export const DEFAULT_DATA_SOURCES: Record<string, ScriptConfig> = {
  'test-basic': {
    categoryId: 'test-basic',
    scriptUrl: '/data/interviews/test-basie.min.json',
    globalVarName: 'TEST_BASIC_DATA',
    categoryName: '软件测试基础',
    priority: 13,
    essential: true,
    timeout: 15000
  },
  'zhongruan-software-testing-interview': {
    categoryId: 'zhongruan-software-testing-interview',
    scriptUrl: '/data/interviews/zhongruan-software-testing-interview.min.js',
    globalVarName: 'ZHONGRUAN_SOFTWARE_TESTING_INTERVIEW_DATA',
    categoryName: '中软软件测试面试题',
    priority: 1,
    essential: true,
    timeout: 15000
  },

  'bytedance-software-testing-interview': {
    categoryId: 'bytedance-software-testing-interview',
    scriptUrl: '/data/interviews/bytedance-software-testing-interview.min.js',
    globalVarName: 'BYTEDANCE_SOFTWARE_TESTING_INTERVIEW_DATA',
    categoryName: '字节软件测试面试题',
    priority: 2,
    essential: true,
    timeout: 15000
  },

  'huawei-software-testing-interview': {
    categoryId: 'huawei-software-testing-interview',
    scriptUrl: '/data/interviews/huawei-software-testing-interview.min.js',
    globalVarName: 'HUAWEI_SOFTWARE_TESTING_INTERVIEW_DATA',
    categoryName: '华为软件测试面试题',
    priority: 3,
    essential: true,
    timeout: 15000
  },

  'hr-interview-questions': {
    categoryId: 'hr-interview-questions',
    scriptUrl: '/data/interviews/hr-interview-questions.min.js',
    globalVarName: 'HR_INTERVIEW_QUESTIONS_DATA',
    categoryName: 'HR面试题',
    priority: 4,
    essential: true,
    timeout: 12000
  },

  'performance-testing-interview': {
    categoryId: 'performance-testing-interview',
    scriptUrl: '/data/interviews/performance-testing-interview.min.js',
    globalVarName: 'PERFORMANCE_TESTING_INTERVIEW_DATA',
    categoryName: '性能测试面试题',
    priority: 5,
    essential: true,
    timeout: 12000
  },

  'app-automation-testing': {
    categoryId: 'app-automation-testing',
    scriptUrl: '/data/interviews/app-automation-testing.min.js',
    globalVarName: 'APP_AUTOMATION_TESTING_DATA',
    categoryName: 'APP自动化测试',
    priority: 6,
    essential: false,
    timeout: 12000
  },

  'api-automation-testing': {
    categoryId: 'api-automation-testing',
    scriptUrl: '/data/interviews/api-automation-testing.min.js',
    globalVarName: 'API_AUTOMATION_TESTING_DATA',
    categoryName: '接口自动化测试',
    priority: 7,
    essential: false,
    timeout: 12000
  },

  'web-automation-testing': {
    categoryId: 'web-automation-testing',
    scriptUrl: '/data/interviews/web-automation-testing.min.js',
    globalVarName: 'WEB_AUTOMATION_TESTING_DATA',
    categoryName: 'web自动化测试',
    priority: 8,
    essential: false,
    timeout: 12000
  },

  'python-basics': {
    categoryId: 'python-basics',
    scriptUrl: '/data/interviews/python-basics.min.js',
    globalVarName: 'PYTHON_BASICS_DATA',
    categoryName: 'pythone基础',
    priority: 9,
    essential: false,
    timeout: 10000
  },

  'api-testing-tools': {
    categoryId: 'api-testing-tools',
    scriptUrl: '/data/interviews/api-testing-tools.min.js',
    globalVarName: 'API_TESTING_TOOLS_DATA',
    categoryName: '接口测试工具',
    priority: 10,
    essential: false,
    timeout: 10000
  },

  'linux-server': {
    categoryId: 'linux-server',
    scriptUrl: '/data/interviews/linux-server.min.js',
    globalVarName: 'LINUX_SERVER_DATA',
    categoryName: 'Linux服务器',
    priority: 11,
    essential: false,
    timeout: 10000
  },

  'database-interview-questions': {
    categoryId: 'database-interview-questions',
    scriptUrl: '/data/interviews/database-interview-questions.min.js',
    globalVarName: 'DATABASE_INTERVIEW_QUESTIONS_DATA',
    categoryName: '数据库面试题',
    priority: 12,
    essential: false,
    timeout: 10000
  }
}

// ==================== 环境配置 ====================

export const DATA_SOURCE_ENVIRONMENTS: DataSourceEnvironment = {
  development: {
    dataSources: DEFAULT_DATA_SOURCES,
    loadingConfig: {
      concurrent: 2,        // 开发环境降低并发数
      timeout: 20000,       // 开发环境延长超时
      retryCount: 2,        // 开发环境减少重试次数
      retryDelay: 1500
    }
  },

  production: {
    dataSources: DEFAULT_DATA_SOURCES,
    loadingConfig: {
      concurrent: 3,        // 生产环境允许更高并发
      timeout: 10000,       // 生产环境缩短超时
      retryCount: 3,        // 生产环境增加重试次数
      retryDelay: 1000
    }
  }
}

// ==================== 数据源管理器 ====================

export class DataSourceManager {
  private currentConfig: ScriptLoadingConfig
  private environment: 'development' | 'production'

  constructor(environment: 'development' | 'production' = 'production') {
    this.environment = environment
    this.currentConfig = DATA_SOURCE_ENVIRONMENTS[environment]
  }

  // ==================== 配置获取 ====================

  getConfig(): ScriptLoadingConfig {
    return { ...this.currentConfig }
  }

  getDataSources(): Record<string, ScriptConfig> {
    return { ...this.currentConfig.dataSources }
  }

  getDataSourceConfigs(): ScriptConfig[] {
    return Object.values(this.currentConfig.dataSources)
  }

  getEssentialDataSources(): ScriptConfig[] {
    return this.getDataSourceConfigs().filter(config => config.essential)
  }

  getOptionalDataSources(): ScriptConfig[] {
    return this.getDataSourceConfigs().filter(config => !config.essential)
  }

  // ==================== 数据源查询 ====================

  getDataSourceById(id: string): ScriptConfig | undefined {
    return this.currentConfig.dataSources[id]
  }

  getDataSourcesByPriority(): ScriptConfig[] {
    return this.getDataSourceConfigs().sort((a, b) => a.priority - b.priority)
  }

  // ==================== 配置管理 ====================

  addDataSource(id: string, config: ScriptConfig): void {
    this.currentConfig.dataSources[id] = config
  }

  removeDataSource(id: string): boolean {
    if (this.currentConfig.dataSources[id]) {
      delete this.currentConfig.dataSources[id]
      return true
    }
    return false
  }

  updateDataSource(id: string, updates: Partial<ScriptConfig>): boolean {
    const existing = this.currentConfig.dataSources[id]
    if (existing) {
      this.currentConfig.dataSources[id] = { ...existing, ...updates }
      return true
    }
    return false
  }

  // ==================== 环境切换 ====================

  switchEnvironment(environment: 'development' | 'production'): void {
    this.environment = environment
    this.currentConfig = DATA_SOURCE_ENVIRONMENTS[environment]
  }

  getCurrentEnvironment(): 'development' | 'production' {
    return this.environment
  }

  // ==================== 数据源统计 ====================

  getStatistics(): {
    total: number
    essential: number
    optional: number
    environments: string[]
  } {
    const configs = this.getDataSourceConfigs()
    const essential = configs.filter(c => c.essential).length
    const optional = configs.length - essential

    return {
      total: configs.length,
      essential,
      optional,
      environments: Object.keys(DATA_SOURCE_ENVIRONMENTS)
    }
  }

  // ==================== 预设配置 ====================

  resetToDefault(): void {
    this.currentConfig = { ...DATA_SOURCE_ENVIRONMENTS[this.environment] }
  }
}

// ==================== 数据源管理器实例 ====================

// 根据环境变量或开发模式确定环境
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development'
export const dataSourceManager = new DataSourceManager(isDevelopment ? 'development' : 'production')

// ==================== 便捷函数 ====================

export function getAllDataSources(): ScriptConfig[] {
  return dataSourceManager.getDataSourceConfigs()
}

export function getEssentialDataSources(): ScriptConfig[] {
  return dataSourceManager.getEssentialDataSources()
}

export function getOptionalDataSources(): ScriptConfig[] {
  return dataSourceManager.getOptionalDataSources()
}

export function getDataSourceById(id: string): ScriptConfig | undefined {
  return dataSourceManager.getDataSourceById(id)
}

export function getCurrentEnvironment(): 'development' | 'production' {
  return dataSourceManager.getCurrentEnvironment()
}

export function getLoadingConfig(): ScriptLoadingConfig['loadingConfig'] {
  return dataSourceManager.getConfig().loadingConfig
}

// ==================== 默认导出 ====================

export default dataSourceManager
