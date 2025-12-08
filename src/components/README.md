# AmapView 高德地图组件

高德地图组件，用于在地图上展示POI（兴趣点）数据。

## 功能特性

- ✅ 支持传入经纬度数组展示POI点
- ✅ 自动调整视野以包含所有POI点
- ✅ 点击标记点显示详细信息窗口
- ✅ 支持自定义地图中心点和缩放级别
- ✅ 响应式设计，支持自定义高度
- ✅ TypeScript 类型支持

## 使用方法

### 基础用法

```vue
<template>
  <AmapView
    :pois="pois"
    height="500px"
  />
</template>

<script setup lang="ts">
import AmapView, { type PoiItem } from '@/components/AmapView.vue'

const pois: PoiItem[] = [
  {
    name: 'POI点1',
    location: '116.397428,39.90923', // 格式: "经度,纬度"
    address: '北京市东城区',
    type: '景点',
  },
  {
    name: 'POI点2',
    location: [116.407526, 39.904030], // 或使用数组格式 [经度, 纬度]
    address: '北京市东城区',
  },
]
</script>
```

### 完整配置

```vue
<template>
  <AmapView
    :pois="pois"
    center="116.397428,39.90923"
    :zoom="12"
    height="600px"
    :show-info-window="true"
    :auto-fit-view="true"
  />
</template>
```

## Props

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `pois` | `PoiItem[]` | `[]` | POI数据数组 |
| `center` | `string \| [number, number]` | `'116.397428,39.90923'` | 地图中心点（经纬度） |
| `zoom` | `number` | `10` | 地图缩放级别（3-18） |
| `height` | `string` | `'500px'` | 地图容器高度 |
| `showInfoWindow` | `boolean` | `true` | 是否显示信息窗口 |
| `autoFitView` | `boolean` | `true` | 是否自动调整视野以包含所有POI点 |

## PoiItem 接口

```typescript
interface PoiItem {
  id?: string              // POI ID（可选）
  name: string             // POI名称（必需）
  location: string | [number, number]  // 位置（必需），格式: "经度,纬度" 或 [经度, 纬度]
  address?: string         // 地址（可选）
  type?: string            // 类型（可选）
  tel?: string             // 电话（可选）
  [key: string]: any       // 其他自定义字段
}
```

## 使用示例

### 示例1: 展示单个POI点

```vue
<template>
  <AmapView
    :pois="[{
      name: '天安门',
      location: '116.397428,39.90923',
      address: '北京市东城区天安门广场',
      type: '景点'
    }]"
    center="116.397428,39.90923"
    :zoom="15"
  />
</template>
```

### 示例2: 展示多个POI点（自动调整视野）

```vue
<template>
  <AmapView
    :pois="pois"
    :auto-fit-view="true"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AmapView, { type PoiItem } from '@/components/AmapView.vue'

const pois = ref<PoiItem[]>([
  { name: '点1', location: '116.397428,39.90923' },
  { name: '点2', location: '116.407526,39.904030' },
  { name: '点3', location: '116.417526,39.914030' },
])
</script>
```

### 示例3: 从API获取POI数据并展示

```vue
<template>
  <AmapView
    v-if="pois.length > 0"
    :pois="pois"
    height="600px"
  />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AmapView, { type PoiItem } from '@/components/AmapView.vue'
import api from '@/api'

const pois = ref<PoiItem[]>([])

onMounted(async () => {
  // 从API获取POI数据
  const response = await api.get('/api/saved-pois/关键词/2025-12-05')
  const data = response.data || response
  
  // 转换数据格式
  pois.value = (data.pois || []).map((poi: any) => ({
    id: poi.id,
    name: poi.name,
    location: poi.location, // 高德API返回的location格式: "经度,纬度"
    address: poi.address,
    type: poi.type,
    tel: poi.tel,
  }))
})
</script>
```

## 注意事项

1. **高德地图API Key**: 已在 `index.html` 中配置，如需更换请修改 `index.html` 中的key
2. **位置格式**: `location` 支持字符串格式 `"经度,纬度"` 或数组格式 `[经度, 纬度]`
3. **自动调整视野**: 当 `autoFitView` 为 `true` 时，地图会自动调整视野以包含所有POI点
4. **信息窗口**: 点击标记点会显示信息窗口，包含POI的详细信息
5. **响应式**: 组件会自动响应 `pois`、`center`、`zoom` 等属性的变化

## 技术实现

- 使用高德地图 JavaScript API 2.0
- Vue 3 Composition API
- TypeScript 类型支持
- 自动处理地图初始化和销毁

