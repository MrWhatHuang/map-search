/**
 * 将高德地图的 Excel 文件转换为城市列表 JSON
 * 运行: pnpm tsx service/convert-regions.ts
 */

import xlsx from 'xlsx'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const excelPath = path.join(__dirname, 'AMap_adcode_citycode.xlsx')
const outputPath = path.join(__dirname, 'cities.json')

interface CityInfo {
  name: string
  adcode: string
  citycode?: string
  province?: string
}

async function convertExcelToJson() {
  try {
    // 读取 Excel 文件
    const workbook = xlsx.readFile(excelPath)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // 转换为 JSON
    const data = xlsx.utils.sheet_to_json(worksheet) as any[]

    console.log(`读取到 ${data.length} 条数据`)
    console.log('示例数据:', data[0])

    // 提取城市名称（假设 Excel 中有城市名称列）
    // 需要根据实际 Excel 结构调整列名
    const cities: string[] = []
    const cityMap: Record<string, CityInfo> = {}

    // 尝试不同的列名组合
    const nameColumns = ['name', '城市名称', '城市', 'city', 'NAME', 'CITY']
    const adcodeColumns = ['adcode', 'ADCODE', '行政代码', '代码']
    const citycodeColumns = ['citycode', 'CITYCODE', '城市代码']
    const provinceColumns = ['province', 'PROVINCE', '省份', '省']

    const nameCol = nameColumns.find(col => data[0] && col in data[0]) || Object.keys(data[0] || {})[0]
    const adcodeCol = adcodeColumns.find(col => data[0] && col in data[0])
    const citycodeCol = citycodeColumns.find(col => data[0] && col in data[0])
    const provinceCol = provinceColumns.find(col => data[0] && col in data[0])

    console.log(`使用列名: name=${nameCol}, adcode=${adcodeCol}, citycode=${citycodeCol}, province=${provinceCol}`)

    for (const row of data) {
      const name = row[nameCol]
      if (name && typeof name === 'string' && name.trim()) {
        const cityName = name.trim()
        // 去重
        if (!cities.includes(cityName)) {
          cities.push(cityName)
          cityMap[cityName] = {
            name: cityName,
            adcode: adcodeCol ? String(row[adcodeCol] || '') : '',
            citycode: citycodeCol ? String(row[citycodeCol] || '') : undefined,
            province: provinceCol ? String(row[provinceCol] || '') : undefined,
          }
        }
      }
    }

    // 排序
    cities.sort()

    console.log(`提取到 ${cities.length} 个城市`)

    // 保存为 JSON
    await fs.writeFile(outputPath, JSON.stringify(cities, null, 2), 'utf-8')
    console.log(`✅ 城市列表已保存到: ${outputPath}`)

    // 同时保存详细信息的映射
    const detailPath = path.join(__dirname, 'cities-detail.json')
    await fs.writeFile(detailPath, JSON.stringify(cityMap, null, 2), 'utf-8')
    console.log(`✅ 城市详细信息已保存到: ${detailPath}`)

  } catch (error) {
    console.error('转换失败:', error)
    process.exit(1)
  }
}

convertExcelToJson()

