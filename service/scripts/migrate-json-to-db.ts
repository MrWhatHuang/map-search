/**
 * 将现有的 JSON 文件数据迁移到 PostgreSQL 数据库
 * 运行: pnpm tsx service/scripts/migrate-json-to-db.ts
 */

import { prisma } from '../src/db.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', '..', 'public', 'poi-data')

/**
 * 解析经纬度字符串
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

async function migrateJsonToDb() {
  try {
    // 列出所有 JSON 文件
    const files = await fs.readdir(DATA_DIR)
    const jsonFiles = files.filter(f => f.endsWith('.json'))

    console.log(`找到 ${jsonFiles.length} 个 JSON 文件`)

    for (const file of jsonFiles) {
      const filePath = path.join(DATA_DIR, file)
      console.log(`\n处理文件: ${file}`)

      // 解析文件名获取关键词和日期
      const match = file.match(/^(.+)_(\d{4}-\d{2}-\d{2})\.json$/)
      if (!match) {
        console.log(`  跳过: 文件名格式不正确`)
        continue
      }

      const [, keyword, dateStr] = match
      const searchDate = new Date(dateStr)
      searchDate.setHours(0, 0, 0, 0)

      // 读取 JSON 文件
      const fileContent = await fs.readFile(filePath, 'utf-8')
      const data = JSON.parse(fileContent)

      const pois = data.pois || []
      console.log(`  关键词: ${keyword}, 日期: ${dateStr}, POI数量: ${pois.length}`)

      // 检查是否已存在
      const existing = await prisma.searchRecord.findUnique({
        where: {
          keyword_searchDate: {
            keyword,
            searchDate,
          },
        },
      })

      if (existing) {
        console.log(`  已存在，跳过`)
        continue
      }

      // 批量插入 POI
      const batchSize = 1000
      let inserted = 0

      for (let i = 0; i < pois.length; i += batchSize) {
        const batch = pois.slice(i, i + batchSize)
        const poiData = batch.map((poi: any) => {
          const location = parseLocation(poi.location as string)
          const { id, name, type, typecode, biz_type, address, location: loc, tel, distance, business_area, navi_poiid, pcode, adcode, pname, cityname, ...extra } = poi

          return {
            amapId: id as string,
            keyword,
            searchDate,
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
            extraData: extra,
          }
        })

        await prisma.poi.createMany({
          data: poiData,
          skipDuplicates: true,
        })

        inserted += poiData.length
        console.log(`  已插入 ${inserted} / ${pois.length} 条POI`)
      }

      // 创建搜索记录
      await prisma.searchRecord.create({
        data: {
          keyword,
          searchDate,
          totalCount: data.totalCount || pois.length,
          regionBreakdown: data.regionBreakdown || [],
        },
      })

      console.log(`  ✅ 完成`)
    }

    console.log(`\n✅ 所有文件迁移完成`)
  } catch (error) {
    console.error('迁移失败:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

migrateJsonToDb()

