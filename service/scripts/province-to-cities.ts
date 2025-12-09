/**
 * 省份到城市的映射
 * 从 cities-detail.json 生成省份到城市列表的映射
 */

import citiesDetail from '../data/cities-detail.json' with { type: 'json' }
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

interface CityDetail {
  name: string
  adcode: string
  citycode?: string
  province?: string
}

// 省份名称映射（处理不同的命名方式）
const provinceMap: Record<string, string[]> = {
  '北京市': ['北京', '北京市'],
  '天津市': ['天津', '天津市'],
  '河北省': ['河北', '河北省'],
  '山西省': ['山西', '山西省'],
  '内蒙古自治区': ['内蒙古', '内蒙古自治区', '内蒙古省'],
  '辽宁省': ['辽宁', '辽宁省'],
  '吉林省': ['吉林', '吉林省'],
  '黑龙江省': ['黑龙江', '黑龙江省'],
  '上海市': ['上海', '上海市'],
  '江苏省': ['江苏', '江苏省'],
  '浙江省': ['浙江', '浙江省'],
  '安徽省': ['安徽', '安徽省'],
  '福建省': ['福建', '福建省'],
  '江西省': ['江西', '江西省'],
  '山东省': ['山东', '山东省'],
  '河南省': ['河南', '河南省'],
  '湖北省': ['湖北', '湖北省'],
  '湖南省': ['湖南', '湖南省'],
  '广东省': ['广东', '广东省'],
  '广西壮族自治区': ['广西', '广西壮族自治区', '广西省'],
  '海南省': ['海南', '海南省'],
  '重庆市': ['重庆', '重庆市'],
  '四川省': ['四川', '四川省'],
  '贵州省': ['贵州', '贵州省'],
  '云南省': ['云南', '云南省'],
  '西藏自治区': ['西藏', '西藏自治区'],
  '陕西省': ['陕西', '陕西省'],
  '甘肃省': ['甘肃', '甘肃省'],
  '青海省': ['青海', '青海省'],
  '宁夏回族自治区': ['宁夏', '宁夏回族自治区', '宁夏省'],
  '新疆维吾尔自治区': ['新疆', '新疆维吾尔自治区', '新疆省'],
  '香港特别行政区': ['香港', '香港特别行政区'],
  '澳门特别行政区': ['澳门', '澳门特别行政区'],
  '台湾省': ['台湾', '台湾省'],
}

function normalizeProvinceName(province: string): string {
  // 移除后缀
  const normalized = province.replace(/省|市|自治区|特别行政区$/, '')

  // 查找匹配的省份
  for (const [key, variants] of Object.entries(provinceMap)) {
    if (variants.includes(province) || variants.includes(normalized)) {
      return key
    }
  }

  return province
}

async function generateProvinceToCities() {
  const mapping: Record<string, string[]> = {}

  // 初始化所有省份
  for (const province of Object.keys(provinceMap)) {
    mapping[province] = []
  }

  // 遍历城市，根据省份分组
  for (const [cityName, detail] of Object.entries(citiesDetail as Record<string, CityDetail>)) {
    if (detail.province) {
      const normalizedProvince = normalizeProvinceName(detail.province)
      if (mapping[normalizedProvince]) {
        mapping[normalizedProvince].push(cityName)
      }
    } else {
      // 如果没有省份信息，尝试从城市名称推断
      // 例如：北京市 -> 北京市
      for (const [province, variants] of Object.entries(provinceMap)) {
        if (variants.some(v => cityName.includes(v))) {
          if (!mapping[province].includes(cityName)) {
            mapping[province].push(cityName)
          }
          break
        }
      }
    }
  }

  // 排序每个省份的城市列表
  for (const province of Object.keys(mapping)) {
    mapping[province].sort()
  }

  const outputPath = path.join(__dirname, '..', 'data', 'province-to-cities.json')
  await fs.writeFile(outputPath, JSON.stringify(mapping, null, 2), 'utf-8')
  console.log(`✅ 省份到城市映射已保存到: ${outputPath}`)
  console.log(`   共 ${Object.keys(mapping).length} 个省份`)

  // 统计信息
  let totalCities = 0
  for (const cities of Object.values(mapping)) {
    totalCities += cities.length
  }
  console.log(`   共 ${totalCities} 个城市`)
}

generateProvinceToCities().catch(console.error)

