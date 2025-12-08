/**
 * 根据 adcode 规则生成省份到城市的映射
 * adcode 规则：
 * - 省级：110000（前2位是省份代码，后4位是0000）
 * - 地级市：320100（前4位是城市代码，后2位是00）
 * - 区县：110101（6位完整代码）
 */

import xlsx from 'xlsx'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const excelPath = path.join(__dirname, 'AMap_adcode_citycode.xlsx')
const outputPath = path.join(__dirname, 'province-to-cities.json')
const citiesOutputPath = path.join(__dirname, 'cities.json')

// 省份代码映射（前2位）
const provinceCodeMap: Record<string, string> = {
  '11': '北京市',
  '12': '天津市',
  '13': '河北省',
  '14': '山西省',
  '15': '内蒙古自治区',
  '21': '辽宁省',
  '22': '吉林省',
  '23': '黑龙江省',
  '31': '上海市',
  '32': '江苏省',
  '33': '浙江省',
  '34': '安徽省',
  '35': '福建省',
  '36': '江西省',
  '37': '山东省',
  '41': '河南省',
  '42': '湖北省',
  '43': '湖南省',
  '44': '广东省',
  '45': '广西壮族自治区',
  '46': '海南省',
  '50': '重庆市',
  '51': '四川省',
  '52': '贵州省',
  '53': '云南省',
  '54': '西藏自治区',
  '61': '陕西省',
  '62': '甘肃省',
  '63': '青海省',
  '64': '宁夏回族自治区',
  '65': '新疆维吾尔自治区',
  '71': '台湾省',
  '81': '香港特别行政区',
  '82': '澳门特别行政区',
}

interface CityInfo {
  name: string
  adcode: string
  citycode?: string
  province: string
}

async function generateMapping() {
  // 读取 Excel 文件
  const workbook = xlsx.readFile(excelPath)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const data = xlsx.utils.sheet_to_json(sheet) as any[]

  console.log(`读取到 ${data.length} 条数据`)

  const provinceToCities: Record<string, string[]> = {}
  const allCities: string[] = []
  const cityDetails: Record<string, CityInfo> = {}

  // 初始化省份列表
  for (const province of Object.values(provinceCodeMap)) {
    provinceToCities[province] = []
  }

  for (const row of data) {
    const name = String(row['中文名'] || '').trim()
    const adcode = String(row['adcode'] || '').padStart(6, '0')
    const citycode = row['citycode'] ? String(row['citycode']) : undefined

    if (!name || !adcode || adcode.length !== 6) continue

    // 判断级别
    const provinceCode = adcode.substring(0, 2)
    const cityCode = adcode.substring(0, 4)
    const isProvince = adcode.endsWith('0000')
    const isCity = adcode.endsWith('00') && !isProvince
    const isDistrict = !adcode.endsWith('00')

    const province = provinceCodeMap[provinceCode]

    if (!province) {
      console.warn(`未知省份代码: ${provinceCode}, 名称: ${name}`)
      continue
    }

    // 只提取地级市（adcode 以 00 结尾但不是 0000）
    if (isCity) {
      // 地级市
      if (!provinceToCities[province].includes(name)) {
        provinceToCities[province].push(name)
      }
      if (!allCities.includes(name)) {
        allCities.push(name)
      }
      cityDetails[name] = {
        name,
        adcode,
        citycode: citycode !== '\\N' ? citycode : undefined,
        province,
      }
    } else if (isProvince) {
      // 省级（直辖市、省、自治区等），也作为城市使用
      if (!provinceToCities[province].includes(name)) {
        provinceToCities[province].push(name)
      }
      if (!allCities.includes(name)) {
        allCities.push(name)
      }
      cityDetails[name] = {
        name,
        adcode,
        citycode: citycode !== '\\N' ? citycode : undefined,
        province,
      }
    }
  }

  // 排序
  for (const province of Object.keys(provinceToCities)) {
    provinceToCities[province].sort()
  }
  allCities.sort()

  // 保存文件
  await fs.writeFile(outputPath, JSON.stringify(provinceToCities, null, 2), 'utf-8')
  await fs.writeFile(citiesOutputPath, JSON.stringify(allCities, null, 2), 'utf-8')

  console.log(`\n✅ 省份到城市映射已保存到: ${outputPath}`)
  console.log(`✅ 城市列表已保存到: ${citiesOutputPath}`)
  console.log(`\n📊 统计信息:`)
  console.log(`   省份数: ${Object.keys(provinceToCities).length}`)
  console.log(`   总城市数: ${allCities.length}`)

  let totalCities = 0
  for (const [province, cities] of Object.entries(provinceToCities)) {
    totalCities += cities.length
    if (cities.length > 0) {
      console.log(`   ${province}: ${cities.length} 个城市`)
    }
  }
}

generateMapping().catch(console.error)

