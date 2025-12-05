/**
 * 服务配置文件
 */

export const config = {
  // API端口
  port: 3000,

  // 高德API密钥
  amapKey: 'ee0eeaabf7b9b44be3ed8c0e37aa1d89',

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
