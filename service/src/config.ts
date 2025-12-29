/**
 * 服务配置文件
 * 支持从环境变量读取配置
 */

// 从环境变量读取配置，如果必需配置缺失则抛出错误
const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key]
  if (!value || value.trim() === '') {
    if (defaultValue !== undefined) {
      return defaultValue
    }
    throw new Error(
      `❌ 环境变量 ${key} 未配置！\n` +
      `请在 .env 文件中设置 ${key} 环境变量。`
    )
  }
  return value
}

// 验证必需的环境变量
const validateRequiredEnv = () => {
  const requiredVars = ['AMAP_KEY', 'DATABASE_URL']
  const missing: string[] = []

  for (const varName of requiredVars) {
    if (!process.env[varName] || process.env[varName]!.trim() === '') {
      missing.push(varName)
    }
  }

  if (missing.length > 0) {
    console.error('\n❌ 缺少必需的环境变量配置：')
    missing.forEach(varName => {
      console.error(`   - ${varName}`)
    })
    console.error('\n请在项目根目录创建 .env 文件并配置以下变量：')
    console.error('   AMAP_KEY=your_web_service_api_key')
    console.error('   DATABASE_URL=postgresql://user:password@localhost:5432/map_search')
    console.error('\n获取 Key: https://console.amap.com/dev/key/app')
    console.error('Key 类型: Web 服务')
    console.error('数据库: 请先创建 PostgreSQL 数据库\n')
    process.exit(1)
  }
}

// 启动时验证配置
validateRequiredEnv()

export const config = {
  // API端口
  port: parseInt(getEnv('PORT', '3000'), 10),

  // 高德API密钥（必须配置，从环境变量读取）
  amapKey: getEnv('AMAP_KEY'),

  // 批量搜索配置
  bulkSearch: {
    // 最大并发数（同时处理的地区数）
    maxConcurrency: 1,

    // 随机延迟范围（毫秒）
    delayMin: 1000,
    delayMax: 1500,

    // 每个地区的最大页面并发数
    maxPageConcurrency: 1,

    // 单页POI数量
    pageSize: 25
  },

  // API请求重试配置
  apiRetry: {
    // 重试次数（触发并发限制或网络错误时）
    retryCount: 3,

    // 重试延迟（毫秒）
    retryDelay: 1000
  }
}
