/**
 * 前端全局配置文件
 * 支持从环境变量读取配置
 *
 * 注意：前端需要使用 Web 端（JS API）类型的 Key
 * 服务端需要使用 Web Service API 类型的 Key
 * 两种 Key 不能混用
 */

// 高德地图 API Key（前端 Web 端 JS API）
// 必须通过环境变量 VITE_AMAP_KEY 配置
// 如果未配置，应用将无法启动
const getAmapKey = (): string => {
  const key = import.meta.env.VITE_AMAP_KEY
  if (!key || key.trim() === '') {
    throw new Error(
      '❌ 高德地图 API Key 未配置！\n' +
      '请在 .env 文件中设置 VITE_AMAP_KEY 环境变量。\n' +
      '获取 Key: https://console.amap.com/dev/key/app\n' +
      'Key 类型: Web 端（JS API）'
    )
  }
  return key
}

export const AMAP_KEY = getAmapKey()

// API 基础地址
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

// 导出配置对象
export const appConfig = {
  amapKey: AMAP_KEY,
  apiBaseUrl: API_BASE_URL,
}

