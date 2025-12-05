import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { searchAMapPoi } from './amap.js'
import { taskManager } from './task-manager.js'
import { config } from './config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'public', 'poi-data')

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

// 创建数据目录
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
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
 * 搜索单个地区的所有数据（支持翻页并发控制）
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
      pois.push(...firstResult.pois)

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
          pois.push(...result.pois)

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

  await ensureDataDir()

  const displayId = taskId || 'direct'
  console.log(`\n🚀 开始批量搜索关键词: "${keywords}" (任务ID: ${displayId})`)
  console.log(`📊 总地区数: ${regions.length}, 最大并发数: ${maxConcurrency}`)
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
      console.log(`[${elapsed}s] ${bar}`)

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

  // 构建结果对象
  const result = {
    keyword: keywords,
    timestamp: new Date().toISOString(),
    totalCount: allPois.length,
    regionBreakdown: regionResults.map(r => ({
      region: r.region,
      count: r.total
    })),
    pois: allPois
  }

  // 生成带日期的文件名 (格式: 关键词_YYYY-MM-DD.json)
  const today = new Date().toISOString().split('T')[0]
  const fileName = `${keywords}_${today}.json`
  const filePath = path.join(DATA_DIR, fileName)

  await fs.writeFile(filePath, JSON.stringify(result, null, 2), 'utf-8')

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n✅ 搜索完成！`)
  console.log(`⏱️  耗时: ${totalTime}秒`)
  console.log(`📊 总共找到: ${allPois.length} 条POI`)
  console.log(`💾 文件已保存到: ${filePath}\n`)

  return {
    keyword: keywords,
    totalResults: allPois.length,
    regionResults,
    filePath
  }
}

/**
 * 获取已保存的数据 - 自动查找最新的日期文件
 */
export async function getPoisByKeyword(keywords: string) {
  try {
    // 列出目录中的所有文件
    const files = await fs.readdir(DATA_DIR)

    // 找到匹配关键词的所有文件，格式: 关键词_YYYY-MM-DD.json
    const matchingFiles = files.filter(file => {
      const prefix = `${keywords}_`
      return file.startsWith(prefix) && file.endsWith('.json')
    })

    if (matchingFiles.length === 0) {
      throw new Error(`文件未找到: ${keywords}`)
    }

    // 按文件名排序，获取最新的文件（日期最晚的）
    const latestFile = matchingFiles.sort().pop()!
    const filePath = path.join(DATA_DIR, latestFile)

    const data = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (err) {
    if (err instanceof Error && err.message.includes('文件未找到')) {
      throw err
    }
    throw new Error(`文件未找到: ${keywords}`)
  }
}

/**
 * 列出所有已保存的关键词
 */
export async function listSavedKeywords() {
  try {
    const files = await fs.readdir(DATA_DIR)
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''))
  } catch {
    return []
  }
}
