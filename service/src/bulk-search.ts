import { searchAMapPoi } from './amap.js'
import { taskManager } from './task-manager.js'
import { config } from './config.js'
import { prisma } from './db.js'

interface BulkSearchOptions {
  maxConcurrency?: number
  taskId?: string
  delayMin?: number  // 请求延迟最小值（毫秒）
  delayMax?: number  // 请求延迟最大值（毫秒）
}

interface Poi {
  id: string
  name: string
  type: string
  [key: string]: unknown
}

interface SearchResult {
  region: string
  pois: Poi[]
  total: number
}

/**
 * 解析经纬度字符串 "经度,纬度" 并提取数值
 */
function parseLocation(location: string): { longitude: number; latitude: number } | null {
  try {
    const parts = location.split(',')
    if (parts.length >= 2) {
      const lng = parseFloat(parts[0]?.trim() || '0')
      const lat = parseFloat(parts[1]?.trim() || '0')
      if (!isNaN(lng) && !isNaN(lat)) {
        return { longitude: lng, latitude: lat }
      }
    }
  } catch {
    // 忽略解析错误
  }
  return null
}

/**
 * 并发控制：最多同时执行指定数量的Promise
 */
async function concurrentMap<T, U>(
  items: T[],
  fn: (item: T, index: number) => Promise<U>,
  maxConcurrency: number = 3
): Promise<U[]> {
  const results: U[] = Array.from({ length: items.length })
  let index = 0

  async function worker(): Promise<void> {
    while (index < items.length) {
      const currentIndex = index++
      const item = items[currentIndex]
      try {
        results[currentIndex] = await fn(item, currentIndex)
      } catch (error) {
        console.error(`处理索引 ${currentIndex} 时出错:`, error)
        throw error
      }
    }
  }

  const workers = Array(Math.min(maxConcurrency, items.length))
    .fill(null)
    .map(() => worker())

  await Promise.all(workers)
  return results as U[]
}

/**
 * 生成进度条
 */
function generateProgressBar(current: number, total: number, regionName: string = ''): string {
  const percentage = Math.round((current / total) * 100)
  const barLength = 20
  const filledLength = Math.round((barLength * current) / total)
  const emptyLength = barLength - filledLength

  const filled = '#'.repeat(filledLength)
  const empty = '-'.repeat(emptyLength)
  const bar = `${filled}${empty}`

  // 格式化百分比（固定宽度）
  const percentageStr = percentage.toString().padStart(3, ' ')

  const regionInfo = regionName ? ` ${regionName}` : ''
  return `${bar} ${percentageStr}%${regionInfo}`
}

/**
 * 过滤POI数据，只保留名称包含关键词的POI
 * @param pois POI数组
 * @param keywords 搜索关键词
 * @returns 过滤后的POI数组
 */
function filterPoisByKeyword(pois: Poi[], keywords: string): Poi[] {
  if (!keywords || keywords.trim() === '') {
    return pois
  }
  
  const keywordLower = keywords.toLowerCase().trim()
  const filtered = pois.filter((poi) => {
    const name = (poi.name || '').toLowerCase()
    return name.includes(keywordLower)
  })
  
  if (filtered.length < pois.length) {
    const filteredCount = pois.length - filtered.length
    console.log(`  ⚠️  过滤掉 ${filteredCount} 个不包含关键词"${keywords}"的POI`)
  }
  
  return filtered
}

/**
 * 搜索单个城市的所有数据（支持翻页并发控制）
 * 注意：region 参数必须是城市级别，不能是省份
 */
async function searchRegion(
  keywords: string,
  region: string,
  maxPageConcurrency: number = 2,
  delayMin: number = 0,
  delayMax: number = 0,
  _taskId?: string,
  _regionIndex?: number
): Promise<SearchResult> {
  const pois: Poi[] = []
  let pageNum = 1
  let totalPages = -1  // -1 表示还不知道总页数

  try {
    // 第一次请求获取数据
    const firstResult = await searchAMapPoi({
      keywords,
      region,
      pageNum: 1,
      pageSize: 25,
      delayMin,
      delayMax,
      retryCount: config.apiRetry.retryCount,
      retryDelay: config.apiRetry.retryDelay
    })

    if (firstResult.pois && firstResult.pois.length > 0) {
      // 过滤POI，只保留名称包含关键词的
      const filteredPois = filterPoisByKeyword(firstResult.pois, keywords)
      pois.push(...filteredPois)

      // 如果第一页就少于25条，说明只有一页
      if (firstResult.pois.length < 25) {
        totalPages = 1
      } else {
        pageNum = 2
        totalPages = -1  // 继续请求下一页
      }
    } else {
      totalPages = 1
    }
  } catch (error) {
    console.error(`搜索 ${region} 第1页出错:`, error)
    return { region, pois: [], total: 0 }
  }

  // 对于多页的情况，使用并发控制来获取后续页面
  const pendingPages: Promise<void>[] = []

  while (totalPages === -1) {
    // 创建并发的页面请求
    const currentPageNum = pageNum
    const pageRequest = (async () => {
      try {
        const result = await searchAMapPoi({
          keywords,
          region,
          pageNum: currentPageNum,
          pageSize: 25,
          delayMin,
          delayMax,
          retryCount: config.apiRetry.retryCount,
          retryDelay: config.apiRetry.retryDelay
        })

        if (result.pois && result.pois.length > 0) {
          // 过滤POI，只保留名称包含关键词的
          const filteredPois = filterPoisByKeyword(result.pois, keywords)
          pois.push(...filteredPois)

          // 如果返回的数据少于25条，表示已获取全部数据
          if (result.pois.length < 25) {
            totalPages = currentPageNum
          }
        } else {
          totalPages = currentPageNum - 1
        }
      } catch (error) {
        console.error(`搜索 ${region} 第${currentPageNum}页出错:`, error)
        totalPages = currentPageNum - 1
      }
    })()

    pendingPages.push(pageRequest)
    pageNum++

    // 如果达到并发上限，等待所有当前的请求完成
    if (pendingPages.length >= maxPageConcurrency) {
      await Promise.all(pendingPages)
      pendingPages.length = 0
    }
  }

  // 等待所有剩余的请求完成
  // 等待所有剩余的请求完成
  if (pendingPages.length > 0) {
    await Promise.all(pendingPages)
  }

  return {
    region,
    pois,
    total: pois.length
  }
}

/**
 * 批量搜索所有地区
 */
export async function bulkSearchByKeyword(
  keywords: string,
  regions: string[],
  options: BulkSearchOptions = {}
): Promise<{
  keyword: string
  totalResults: number
  regionResults: SearchResult[]
  filePath: string
  taskId?: string
}> {
  const { maxConcurrency = 2, taskId, delayMin = 0, delayMax = 0 } = options

  const displayId = taskId || 'direct'
  console.log(`\n🚀 开始批量搜索关键词: "${keywords}" (任务ID: ${displayId})`)
  console.log(`📊 总城市数: ${regions.length}, 最大并发数: ${maxConcurrency}`)
  if (delayMin > 0 || delayMax > 0) {
    console.log(`⏱️  请求延迟范围: ${delayMin}ms - ${delayMax}ms\n`)
  } else {
    console.log()
  }

  // 创建进度跟踪
  let completedRegions = 0
  const startTime = Date.now()

  // 并发搜索所有地区
  const regionResults = await concurrentMap(
    regions,
    async (region, _index) => {
      // 在每个地区内部支持最多2个并发页面请求，并传递延迟参数
      const result = await searchRegion(keywords, region, 2, delayMin, delayMax, taskId, _index)
      completedRegions++

      // 更新进度条
      const bar = generateProgressBar(completedRegions, regions.length, region)
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      console.log(`[${elapsed}s] ${bar} (城市: ${region})`)

      if (taskId) {
        taskManager.updateProgress(taskId, completedRegions, {
          region,
          count: result.total
        })
      }

      return result
    },
    maxConcurrency
  )

  // 合并所有结果
  const allPois = regionResults.flatMap(r => r.pois)

  // 按省份聚合 regionBreakdown（使用 POI 数据中的 pname 字段）
  const provinceMap = new Map<string, number>()
  for (const poi of allPois) {
    const province = (poi.pname as string) || '未知'
    provinceMap.set(province, (provinceMap.get(province) || 0) + 1)
  }

  const regionBreakdown = Array.from(provinceMap.entries())
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count)

  // 保存到数据库
  const searchDate = new Date()
  searchDate.setHours(0, 0, 0, 0) // 只保留日期部分

  // 批量插入 POI 数据
  console.log(`\n💾 开始保存 ${allPois.length} 条POI到数据库...`)
  
  // 准备批量插入数据
  const batchSize = 1000
  for (let i = 0; i < allPois.length; i += batchSize) {
    const batch = allPois.slice(i, i + batchSize)
    const poiData = batch.map((poi) => {
      const location = parseLocation(poi.location as string)
      // 提取其他字段到 extraData
      const { id, name, type, typecode, biz_type, address, location: loc, tel, distance, business_area, navi_poiid, pcode, adcode, pname, cityname, ...extra } = poi as any
      
      return {
        amapId: id as string,
        keyword: keywords,
        searchDate: searchDate,
        name: name as string,
        type: type as string,
        typecode: typecode as string,
        bizType: biz_type as string,
        address: address as string,
        location: loc as string,
        longitude: location?.longitude,
        latitude: location?.latitude,
        tel: tel as string,
        distance: distance as string,
        businessArea: business_area as string,
        naviPoiid: navi_poiid as string,
        province: pcode as string,
        city: adcode as string,
        pname: pname as string,
        cityname: cityname as string,
        extraData: extra, // 保存其他扩展字段
      }
    })
    
    // 使用 createMany 批量插入（更高效）
    await prisma.poi.createMany({
      data: poiData,
      skipDuplicates: true, // 跳过重复数据（基于唯一约束）
    })
    
    console.log(`  已保存 ${Math.min(i + batchSize, allPois.length)} / ${allPois.length} 条`)
  }

  // 创建或更新搜索记录
  await prisma.searchRecord.upsert({
    where: {
      keyword_searchDate: {
        keyword: keywords,
        searchDate: searchDate,
      },
    },
    create: {
      keyword: keywords,
      searchDate: searchDate,
      totalCount: allPois.length,
      regionBreakdown: regionBreakdown,
    },
    update: {
      totalCount: allPois.length,
      regionBreakdown: regionBreakdown,
    },
  })

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n✅ 搜索完成！`)
  console.log(`⏱️  耗时: ${totalTime}秒`)
  console.log(`📊 总共找到: ${allPois.length} 条POI`)
  console.log(`💾 数据已保存到数据库\n`)

  return {
    keyword: keywords,
    totalResults: allPois.length,
    regionResults,
    filePath: `database:${keywords}:${searchDate.toISOString().split('T')[0]}` // 兼容性标识
  }
}

/**
 * 获取已保存的数据 - 从数据库获取最新的搜索记录
 */
export async function getPoisByKeyword(keywords: string, date?: string) {
  try {
    let searchDate: Date | undefined

    if (date) {
      // 指定日期
      searchDate = new Date(date)
      searchDate.setHours(0, 0, 0, 0)
    } else {
      // 获取最新的搜索记录
      const latestRecord = await prisma.searchRecord.findFirst({
        where: { keyword: keywords },
        orderBy: { searchDate: 'desc' },
      })

      if (!latestRecord) {
        throw new Error(`未找到关键词 "${keywords}" 的数据`)
      }

      searchDate = latestRecord.searchDate
    }

    // 获取搜索记录
    const record = await prisma.searchRecord.findUnique({
      where: {
        keyword_searchDate: {
          keyword: keywords,
          searchDate: searchDate!,
        },
      },
    })

    if (!record) {
      throw new Error(`未找到关键词 "${keywords}" 在日期 "${searchDate!.toISOString().split('T')[0]}" 的数据`)
    }

    // 获取 POI 数据
    const pois = await prisma.poi.findMany({
      where: {
        keyword: keywords,
        searchDate: searchDate!,
      },
      orderBy: { createdAt: 'asc' },
    })

    // 转换为原始格式
    const poisData = pois.map((poi) => ({
      id: poi.amapId,
      name: poi.name,
      type: poi.type,
      typecode: poi.typecode,
      biz_type: poi.bizType,
      address: poi.address,
      location: poi.location,
      tel: poi.tel,
      distance: poi.distance,
      business_area: poi.businessArea,
      navi_poiid: poi.naviPoiid,
      pcode: poi.province,
      adcode: poi.city,
      pname: poi.pname,
      cityname: poi.cityname,
      ...(poi.extraData as Record<string, unknown>),
    }))

    return {
      keyword: record.keyword,
      timestamp: record.createdAt.toISOString(),
      totalCount: record.totalCount,
      regionBreakdown: (record.regionBreakdown as Array<{ region: string; count: number }>) || [],
      pois: poisData,
    }
  } catch (err) {
    if (err instanceof Error) {
      throw err
    }
    throw new Error(`获取数据失败: ${String(err)}`)
  }
}

/**
 * 列出所有已保存的关键词
 */
export async function listSavedKeywords() {
  try {
    const records = await prisma.searchRecord.findMany({
      select: { keyword: true },
      distinct: ['keyword'],
      orderBy: { keyword: 'asc' },
    })
    return records.map((r) => r.keyword)
  } catch {
    return []
  }
}

/**
 * 获取关键词的所有日期列表
 */
export async function getKeywordDates(keywords: string): Promise<string[]> {
  try {
    const records = await prisma.searchRecord.findMany({
      where: { keyword: keywords },
      select: { searchDate: true },
      orderBy: { searchDate: 'desc' },
    })
    return records.map((r) => r.searchDate.toISOString().split('T')[0])
  } catch {
    return []
  }
}
