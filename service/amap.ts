/**
 * 高德地图API服务
 */

import { config } from './config.js'

/**
 * 随机延迟函数
 * @param min 最小延迟时间（毫秒）
 * @param max 最大延迟时间（毫秒）
 */
function randomDelay(min: number = 0, max: number = 0): Promise<void> {
  if (min === 0 && max === 0) return Promise.resolve()

  const delay = Math.random() * (max - min) + min
  return new Promise(resolve => setTimeout(resolve, delay))
}

interface AmapPoiParams {
  keywords: string
  region: string
  pageSize?: number
  pageNum?: number
  key?: string
  delayMin?: number  // 随机延迟最小值（毫秒）
  delayMax?: number  // 随机延迟最大值（毫秒）
  retryCount?: number  // 重试次数（默认3次）
  retryDelay?: number  // 重试延迟（毫秒，默认1000ms）
}

interface AmapPoiResponse {
  status: string
  count: number
  info: string
  infocode: string
  pois: Array<{
    id: string
    name: string
    type: string
    typecode: string
    biz_type: string
    address: string
    location: string
    tel: string
    distance: string
    business_area: string
    navi_poiid: string
  }>
  suggestion: {
    keywords: string[]
    cities: string[]
    districts: string[]
  }
}

const AMAP_KEY = config.amapKey
const AMAP_BASE_URL = 'https://restapi.amap.com/v5/place/text'

/**
 * 搜索高德POI，支持自动重试
 * @param params 查询参数
 * @returns POI搜索结果
 */
export async function searchAMapPoi(params: AmapPoiParams): Promise<AmapPoiResponse> {
  const {
    keywords,
    region,
    pageSize = 25,
    pageNum = 1,
    key = AMAP_KEY,
    delayMin = 0,
    delayMax = 0,
    retryCount = 3,
    retryDelay = 1000
  } = params

  // 如果设置了延迟范围，先执行随机延迟
  if (delayMin > 0 || delayMax > 0) {
    await randomDelay(delayMin, delayMax)
  }

  const queryParams = new URLSearchParams({
    key,
    keywords,
    region,
    page_size: pageSize.toString(),
    page_num: pageNum.toString(),
    city_limit: 'true'
  })

  const url = `${AMAP_BASE_URL}?${queryParams.toString()}`

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP 错误! 状态码: ${response.status}`)
      }
      const data: AmapPoiResponse = await response.json()

      // 检查是否触发了并发限制
      if (data.info === 'CUQPS_HAS_EXCEEDED_THE_LIMIT') {
        if (attempt < retryCount) {
          console.warn(`⚠️  触发并发限制，${retryDelay}ms 后进行第 ${attempt + 1} 次重试...`)
          await randomDelay(retryDelay, retryDelay + 500)
          continue
        }
      }

      return data
    } catch (error) {
      lastError = error as Error
      if (attempt < retryCount) {
        console.warn(`❌ 第 ${attempt} 次请求失败，${retryDelay}ms 后进行第 ${attempt + 1} 次重试...`)
        await randomDelay(retryDelay, retryDelay + 500)
        continue
      }
    }
  }

  console.error('获取高德POI数据失败 (所有重试均失败):', lastError)
  throw lastError || new Error('获取POI数据失败')
}

/**
 * 搜索指定关键词和地区的POI
 * @param keywords 搜索关键词
 * @param region 搜索地区
 * @param pageNum 页码
 * @returns POI搜索结果
 */
export async function searchPoi(
  keywords: string,
  region: string,
  pageNum: number = 1
): Promise<AmapPoiResponse> {
  return searchAMapPoi({
    keywords,
    region,
    pageNum
  })
}
