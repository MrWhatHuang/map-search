// 加载环境变量（必须在其他导入之前）
import 'dotenv/config'

import express, { Express, Request, Response } from 'express'
import cors from 'cors'
import { searchAMapPoi } from './amap.js'
import { bulkSearchByKeyword, getPoisByKeyword, listSavedKeywords } from './bulk-search.js'
import { taskManager } from './task-manager.js'
import regionsData from '../data/regions.json' with { type: 'json' }
import provinceToCities from '../data/province-to-cities.json' with { type: 'json' }
import citiesData from '../data/cities.json' with { type: 'json' }
import { config } from './config.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const app: Express = express()
const PORT = config.port

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', '..', 'public', 'poi-data')

// 中间件
app.use(cors())
app.use(express.json())

// 健康检查
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// POI搜索接口
app.get('/api/poi/search', async (req: Request, res: Response) => {
  try {
    const { keywords, region, pageSize = 25, pageNum = 1, key } = req.query

    // 参数验证
    if (!keywords || !region) {
      return res.status(400).json({
        code: 400,
        message: '缺少必要参数: keywords 和 region'
      })
    }

    const result = await searchAMapPoi({
      keywords: String(keywords),
      region: String(region),
      pageSize: parseInt(String(pageSize), 10) || 25,
      pageNum: parseInt(String(pageNum), 10) || 1,
      key: key ? String(key) : undefined
    })

    res.json({
      code: 200,
      data: result,
      message: '成功'
    })
  } catch (error) {
    console.error('搜索POI出错:', error)
    res.status(500).json({
      code: 500,
      message: '内部服务器错误',
      error: error instanceof Error ? error.message : '未知错误'
    })
  }
})

// 简化版搜索接口
app.get('/api/poi/:keywords/:region', async (req: Request, res: Response) => {
  try {
    const { keywords, region } = req.params
    const { pageNum = 1 } = req.query

    const result = await searchAMapPoi({
      keywords,
      region,
      pageNum: parseInt(String(pageNum), 10) || 1
    })

    res.json({
      code: 200,
      data: result,
      message: '成功'
    })
  } catch (error) {
    console.error('搜索POI出错:', error)
    res.status(500).json({
      code: 500,
      message: '内部服务器错误',
      error: error instanceof Error ? error.message : '未知错误'
    })
  }
})

// 获取所有地区列表（省份）
app.get('/api/regions', (_req: Request, res: Response) => {
  res.json({
    code: 200,
    data: regionsData,
    message: '成功'
  })
})

// 获取所有城市列表
app.get('/api/cities', (_req: Request, res: Response) => {
  res.json({
    code: 200,
    data: citiesData,
    message: '成功'
  })
})

// 获取省份到城市的映射
app.get('/api/province-cities', (_req: Request, res: Response) => {
  res.json({
    code: 200,
    data: provinceToCities,
    message: '成功'
  })
})

// 批量搜索接口 - 指定关键词和地区（支持省份或城市）
app.post('/api/bulk-search', async (req: Request, res: Response) => {
  try {
    const {
      keywords,
      regions,
      maxConcurrency = config.bulkSearch.maxConcurrency,
      delayMin = config.bulkSearch.delayMin,
      delayMax = config.bulkSearch.delayMax
    } = req.body

    // 参数验证
    if (!keywords || !regions || !Array.isArray(regions)) {
      return res.status(400).json({
        code: 400,
        message: '缺少必要参数: keywords (字符串) 和 regions (数组)'
      })
    }

    // 将省份转换为城市列表
    const allProvinces = regionsData as string[]
    const isProvince = (name: string) => allProvinces.includes(name)
    const cities: string[] = []
    const citySet = new Set<string>()

    for (const region of regions) {
      if (isProvince(region)) {
        // 是省份，转换为城市列表（过滤掉非直辖市的省份本身）
        const provinceCities = (provinceToCities as Record<string, string[]>)[region] || []
        for (const city of provinceCities) {
          // 过滤逻辑：
          // 1. 如果是直辖市（如"北京市"），保留（因为本身就是城市级别）
          // 2. 如果是普通省份（如"江苏省"），过滤掉（因为不是城市级别）
          // 3. 其他地级市保留
          const shouldInclude = !citySet.has(city) && (
            !isProvince(city) || isMunicipality(city)
          )
          
          if (shouldInclude) {
            citySet.add(city)
            cities.push(city)
          }
        }
      } else {
        // 是城市，直接添加
        if (!citySet.has(region)) {
          citySet.add(region)
          cities.push(region)
        }
      }
    }

    if (cities.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '未找到有效的城市，请检查 regions 参数'
      })
    }

    const concurrency = parseInt(String(maxConcurrency), 10) || config.bulkSearch.maxConcurrency
    const minDelay = parseInt(String(delayMin), 10) || config.bulkSearch.delayMin
    const maxDelay = parseInt(String(delayMax), 10) || config.bulkSearch.delayMax

    // 创建任务（使用城市列表）
    const taskId = taskManager.createTask(keywords, cities)
    taskManager.startTask(taskId)

    // 返回任务ID给客户端（异步执行）
    res.json({
      code: 200,
      data: {
        taskId,
        keyword: keywords,
        message: '任务已创建，正在后台运行',
        delayRange: `${minDelay}ms - ${maxDelay}ms`,
        totalCities: cities.length
      },
      message: '成功'
    })

    // 后台异步执行搜索（使用城市列表）
    bulkSearchByKeyword(keywords, cities, {
      maxConcurrency: concurrency,
      delayMin: minDelay,
      delayMax: maxDelay,
      taskId
    })
      .then((result) => {
        taskManager.completeTask(taskId, result.filePath)
        console.log(`✅ 任务 ${taskId} 已完成`)
      })
      .catch(error => {
        taskManager.failTask(taskId, error instanceof Error ? error.message : '未知错误')
        console.error(`❌ 任务 ${taskId} 失败:`, error)
      })
  } catch (error) {
    console.error('批量搜索出错:', error)
    res.status(500).json({
      code: 500,
      message: '内部服务器错误',
      error: error instanceof Error ? error.message : '未知错误'
    })
  }
})

/**
 * 判断是否是直辖市（名称以"市"结尾且在regions.json中）
 */
function isMunicipality(name: string): boolean {
  const provinces = regionsData as string[]
  return provinces.includes(name) && name.endsWith('市')
}

/**
 * 将省份列表转换为城市列表
 * 注意：过滤掉非直辖市的省份本身，只保留地级市（高德API的region参数只支持城市级别）
 */
function convertProvincesToCities(provinces: string[]): string[] {
  const cities: string[] = []
  const citySet = new Set<string>()
  const provincesSet = new Set(regionsData as string[])

  for (const province of provinces) {
    // 查找省份对应的城市列表
    const provinceCities = (provinceToCities as Record<string, string[]>)[province] || []
    for (const city of provinceCities) {
      // 过滤逻辑：
      // 1. 如果是直辖市（如"北京市"），保留（因为本身就是城市级别）
      // 2. 如果是普通省份（如"江苏省"），过滤掉（因为不是城市级别）
      // 3. 其他地级市保留
      const shouldInclude = !citySet.has(city) && (
        !provincesSet.has(city) || isMunicipality(city)
      )
      
      if (shouldInclude) {
        citySet.add(city)
        cities.push(city)
      }
    }
  }

  return cities
}

/**
 * 判断一个名称是否是省份/直辖市（在 regions.json 中）
 */
function isProvinceOrMunicipality(name: string): boolean {
  const provinces = regionsData as string[]
  return provinces.includes(name)
}

/**
 * 将城市名转换为省份名（使用反向映射）
 */
function convertCityToProvince(cityName: string): string | null {
  // 如果本身就是省份/直辖市，直接返回
  if (isProvinceOrMunicipality(cityName)) {
    return cityName
  }
  
  // 尝试在省份到城市的映射中查找
  const mapping = provinceToCities as Record<string, string[]>
  for (const [province, cities] of Object.entries(mapping)) {
    if (cities.includes(cityName)) {
      return province
    }
  }
  
  return null
}

/**
 * 将城市级别的 regionBreakdown 转换为省份级别
 * 只保留省/直辖市，过滤掉无法转换的城市
 */
function convertRegionBreakdownToProvinces(
  regionBreakdown: Array<{ region: string; count: number }>
): Array<{ region: string; count: number }> {
  const provinceMap = new Map<string, number>()

  for (const item of regionBreakdown) {
    // 先检查是否是省份/直辖市
    if (isProvinceOrMunicipality(item.region)) {
      // 直接使用省份名
      provinceMap.set(item.region, (provinceMap.get(item.region) || 0) + item.count)
    } else {
      // 尝试转换为省份
      const province = convertCityToProvince(item.region)
      if (province) {
        provinceMap.set(province, (provinceMap.get(province) || 0) + item.count)
      }
      // 如果无法转换，跳过（不添加到结果中）
    }
  }

  return Array.from(provinceMap.entries())
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count)
}

// 快速批量搜索 - 只需传入关键词，自动使用所有城市（后台异步执行）
app.get('/api/bulk-search/:keywords', async (req: Request, res: Response) => {
  try {
    const { keywords } = req.params
    const {
      maxConcurrency = config.bulkSearch.maxConcurrency,
      delayMin = config.bulkSearch.delayMin,
      delayMax = config.bulkSearch.delayMax
    } = req.query

    // 使用所有城市（从省份转换而来）
    const allProvinces = regionsData as string[]
    const cities = convertProvincesToCities(allProvinces)
    
    const concurrency = parseInt(String(maxConcurrency), 10) || config.bulkSearch.maxConcurrency
    const minDelay = parseInt(String(delayMin), 10) || config.bulkSearch.delayMin
    const maxDelay = parseInt(String(delayMax), 10) || config.bulkSearch.delayMax

    // 创建任务（使用城市列表）
    const taskId = taskManager.createTask(keywords, cities)
    taskManager.startTask(taskId)

    // 返回任务ID给客户端
    res.json({
      code: 200,
      data: {
        taskId,
        keyword: keywords,
        message: '任务已创建，正在后台运行',
        delayRange: `${minDelay}ms - ${maxDelay}ms`,
        totalCities: cities.length
      },
      message: '成功'
    })

    // 后台异步执行搜索（使用城市列表）
    bulkSearchByKeyword(keywords, cities, {
      maxConcurrency: concurrency,
      delayMin: minDelay,
      delayMax: maxDelay,
      taskId
    })
      .then((result) => {
        taskManager.completeTask(taskId, result.filePath)
        console.log(`✅ 任务 ${taskId} 已完成`)
      })
      .catch(error => {
        taskManager.failTask(taskId, error instanceof Error ? error.message : '未知错误')
        console.error(`❌ 任务 ${taskId} 失败:`, error)
      })
  } catch (error) {
    console.error('快速批量搜索出错:', error)
    res.status(500).json({
      code: 500,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// 查询任务进度
app.get('/api/task/:taskId', (req: Request, res: Response) => {
  try {
    const { taskId } = req.params
    const task = taskManager.getTask(taskId)

    if (!task) {
      return res.status(404).json({
        code: 404,
        message: '任务未找到'
      })
    }

    res.json({
      code: 200,
      data: task,
      message: '成功'
    })
  } catch (error) {
    console.error('获取任务出错:', error)
    res.status(500).json({
      code: 500,
      message: '内部服务器错误'
    })
  }
})

// 获取关键词的所有任务历史
app.get('/api/tasks/keyword/:keywords', (req: Request, res: Response) => {
  try {
    const { keywords } = req.params
    const tasks = taskManager.getTasksByKeyword(keywords)

    res.json({
      code: 200,
      data: tasks,
      message: '成功'
    })
  } catch (error) {
    console.error('获取任务列表出错:', error)
    res.status(500).json({
      code: 500,
      message: '内部服务器错误'
    })
  }
})

// 获取任务管理器统计信息
app.get('/api/tasks/stats', (_req: Request, res: Response) => {
  try {
    const stats = taskManager.getStats()
    res.json({
      code: 200,
      data: stats,
      message: '成功'
    })
  } catch (error) {
    console.error('获取任务统计出错:', error)
    res.status(500).json({
      code: 500,
      message: '内部服务器错误'
    })
  }
})

// 获取已保存的POI数据
app.get('/api/saved-pois/:keywords', async (req: Request, res: Response) => {
  try {
    const { keywords } = req.params

    try {
      // 尝试获取已保存的数据
      const data = await getPoisByKeyword(keywords)
      
      // 如果 regionBreakdown 包含城市，转换为省份统计
      if (data.regionBreakdown && Array.isArray(data.regionBreakdown)) {
        // 检查是否包含非省份/直辖市的条目（即包含城市）
        const hasCities = data.regionBreakdown.some(
          item => !isProvinceOrMunicipality(item.region)
        )
        
        // 如果包含城市，需要转换
        if (hasCities) {
          data.regionBreakdown = convertRegionBreakdownToProvinces(data.regionBreakdown)
        }
      }
      
      return res.json({
        code: 200,
        data,
        message: '成功'
      })
    } catch (error) {
      // 文件不存在
      console.log('文件不存在:', error instanceof Error ? error.message : String(error))
      return res.status(404).json({
        code: 404,
        message: `未找到"${keywords}"的数据，请先调用 /api/bulk-search/${keywords} 进行搜索`
      })
    }
  } catch (error) {
    console.error('获取已保存的POI出错:', error)
    res.status(500).json({
      code: 500,
      message: '内部服务器错误',
      error: error instanceof Error ? error.message : '未知错误'
    })
  }
})

// 列出所有已保存的关键词
app.get('/api/saved-keywords', async (_req: Request, res: Response) => {
  try {
    const keywords = await listSavedKeywords()
    res.json({
      code: 200,
      data: keywords,
      message: '成功'
    })
  } catch (error) {
    console.error('列出已保存关键词出错:', error)
    res.status(500).json({
      code: 500,
      message: '内部服务器错误'
    })
  }
})

// 列出某关键词可用的日期文件（格式: YYYY-MM-DD）
app.get('/api/saved-files/:keywords', async (req: Request, res: Response) => {
  try {
    const { keywords } = req.params

    // 读取数据目录中的文件
    const files = await fs.readdir(DATA_DIR)
    const prefix = `${keywords}_`
    const matching = files.filter(f => f.startsWith(prefix) && f.endsWith('.json'))

    if (matching.length === 0) {
      return res.status(404).json({ code: 404, data: [], message: '未找到可用的日期文件' })
    }

    // 提取日期部分 YYYY-MM-DD
    const dates = matching
      .map(f => {
        const m = f.match(new RegExp(`^${keywords}_(\\d{4}-\\d{2}-\\d{2})\\.json$`))
        return m ? m[1] : null
      })
      .filter(Boolean) as string[]

    // 按日期降序排列（最新在前）
    dates.sort().reverse()

    res.json({ code: 200, data: dates, message: '成功' })
  } catch (error) {
    console.error('列出关键词日期出错:', error)
    res.status(500).json({ code: 500, message: '内部服务器错误' })
  }
})

// 按指定日期获取已保存的数据: /api/saved-pois/:keywords/:date (date 格式 YYYY-MM-DD)
app.get('/api/saved-pois/:keywords/:date', async (req: Request, res: Response) => {
  try {
    const { keywords, date } = req.params
    const fileName = `${keywords}_${date}.json`
    const filePath = path.join(DATA_DIR, fileName)

    try {
      const data = await fs.readFile(filePath, 'utf-8')
      const fileData = JSON.parse(data)
      
      // 如果 regionBreakdown 包含城市，转换为省份统计
      if (fileData.regionBreakdown && Array.isArray(fileData.regionBreakdown)) {
        // 检查是否包含非省份/直辖市的条目（即包含城市）
        const hasCities = fileData.regionBreakdown.some(
          item => !isProvinceOrMunicipality(item.region)
        )
        
        // 如果包含城市，需要转换
        if (hasCities) {
          fileData.regionBreakdown = convertRegionBreakdownToProvinces(fileData.regionBreakdown)
        }
      }
      
      return res.json({ code: 200, data: fileData, message: '成功' })
    } catch (error) {
      console.log('文件不存在:', error instanceof Error ? error.message : String(error))
      return res.status(404).json({ code: 404, message: `未找到文件: ${fileName}` })
    }
  } catch (error) {
    console.error('按日期获取已保存数据出错:', error)
    res.status(500).json({ code: 500, message: '内部服务器错误' })
  }
})

// 测试接口 - 并发请求高德API
app.get('/api/test/concurrent', async (req: Request, res: Response) => {
  try {
    const { keywords = '古茗', region = '南京市', count = 5 } = req.query
    const concurrentCount = parseInt(String(count), 10) || 5

    if (concurrentCount < 1 || concurrentCount > 50) {
      return res.status(400).json({
        code: 400,
        message: '并发次数必须在1-50之间'
      })
    }

    console.log(`\n🧪 开始并发测试: ${concurrentCount}个并发请求`)
    const startTime = Date.now()
    const requests = []

    // 创建并发请求
    for (let i = 0; i < concurrentCount; i++) {
      requests.push(
        searchAMapPoi({
          keywords: String(keywords),
          region: String(region),
          pageNum: 1
        })
          .then(result => ({
            index: i + 1,
            status: 'success',
            code: result.status,
            info: result.info,
            count: result.count,
            poiCount: result.pois?.length || 0,
            message: result.info
          }))
          .catch(error => ({
            index: i + 1,
            status: 'error',
            message: error instanceof Error ? error.message : '未知错误'
          }))
      )
    }

    const results = await Promise.all(requests)
    const endTime = Date.now()
    const duration = endTime - startTime

    // 统计结果
    const successful = results.filter(r => r.status === 'success').length
    const failed = results.filter(r => r.status === 'error').length

    res.json({
      code: 200,
      data: {
        concurrentCount,
        duration: `${duration}ms`,
        successful,
        failed,
        results,
        summary: {
          keyword: keywords,
          region,
          totalRequests: concurrentCount,
          successfulRequests: successful,
          failedRequests: failed,
          averageTime: `${(duration / concurrentCount).toFixed(2)}ms per request`
        }
      },
      message: '测试完成'
    })
  } catch (error) {
    console.error('并发测试出错:', error)
    res.status(500).json({
      code: 500,
      message: '内部服务器错误',
      error: error instanceof Error ? error.message : '未知错误'
    })
  }
})

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`)
  console.log(`\n📍 单地区搜索:`)
  console.log(`   GET /api/poi/search?keywords=古茗&region=江苏省`)
  console.log(`   GET /api/poi/古茗/江苏省`)
  console.log(`\n🔄 批量搜索 (异步):`)
  console.log(`   GET /api/bulk-search/:keywords?maxConcurrency=3`)
  console.log(`\n📊 任务管理:`)
  console.log(`   GET /api/task/:taskId`)
  console.log(`   GET /api/tasks/keyword/:keywords`)
  console.log(`   GET /api/tasks/stats`)
  console.log(`\n💾 数据获取:`)
  console.log(`   GET /api/saved-pois/:keywords`)
  console.log(`   GET /api/saved-keywords`)
  console.log(`\n🌍 地区列表:`)
  console.log(`   GET /api/regions`)
  console.log(`\n🧪 测试接口:`)
  console.log(`   GET /api/test/concurrent?keywords=古茗&region=江苏省&count=5`)
})
