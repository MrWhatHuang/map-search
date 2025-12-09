<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

// POI数据项接口
export interface PoiItem {
  id?: string
  name: string
  location: string | [number, number] // 格式: "经度,纬度" 或 [经度, 纬度]
  address?: string
  type?: string
  tel?: string
  [key: string]: any
}

interface Props {
  // POI数据数组
  pois?: PoiItem[]
  // 地图中心点（经纬度，格式: "经度,纬度" 或 [经度, 纬度]）
  center?: string | [number, number]
  // 地图缩放级别
  zoom?: number
  // 地图高度
  height?: string
  // 是否显示信息窗口
  showInfoWindow?: boolean
  // 是否自动调整视野以包含所有POI点
  autoFitView?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  pois: () => [],
  center: '116.397428,39.90923', // 默认北京天安门
  zoom: 10,
  height: '500px',
  showInfoWindow: true,
  autoFitView: true,
})

const mapContainer = ref<HTMLDivElement | null>(null)
const mapInstance = ref<any>(null)
const markers = ref<any[]>([])
const infoWindow = ref<any>(null)

// 解析位置字符串为经纬度数组
function parseLocation(location: string | [number, number]): [number, number] {
  if (Array.isArray(location)) {
    return location
  }
  const [lng, lat] = location.split(',').map(Number)
  return [lng, lat]
}

// 初始化地图
function initMap() {
  if (!mapContainer.value) {
    console.warn('地图容器未找到，等待DOM渲染...')
    // 如果容器未准备好，延迟重试
    setTimeout(() => {
      if (mapContainer.value) {
        initMap()
      }
    }, 100)
    return
  }

  if (!(window as any).AMap) {
    console.error('高德地图API未加载')
    return
  }

  // 如果地图已初始化，先销毁
  if (mapInstance.value) {
    mapInstance.value.destroy()
    mapInstance.value = null
  }

  try {
    const centerPoint = parseLocation(props.center)

    mapInstance.value = new (window as any).AMap.Map(mapContainer.value, {
      zoom: props.zoom,
      center: centerPoint,
      viewMode: '3D',
      mapStyle: 'amap://styles/normal',
    })

    // 创建信息窗口
    if (props.showInfoWindow) {
      infoWindow.value = new (window as any).AMap.InfoWindow({
        offset: new (window as any).AMap.Pixel(0, -30),
        closeWhenClickMap: true,
      })
    }

    // 地图加载完成后添加POI点
    mapInstance.value.on('complete', () => {
      // 添加POI点
      if (props.pois && props.pois.length > 0) {
        nextTick(() => {
          addMarkers(props.pois)
        })
      }
    })
  } catch (error) {
    console.error('地图初始化失败:', error)
  }
}

// 添加标记点
function addMarkers(pois: PoiItem[]) {
  if (!mapInstance.value) return

  // 清除现有标记
  clearMarkers()

  const newMarkers: any[] = []

  pois.forEach((poi) => {
    try {
      const location =
        typeof poi.location === 'string' || Array.isArray(poi.location)
          ? poi.location
          : String(poi.location)
      const [lng, lat] = parseLocation(location)

      // 创建标记
      const marker = new (window as any).AMap.Marker({
        position: [lng, lat],
        title: poi.name,
        label: {
          content: '',
          direction: 'top',
          offset: [0, -5],
        },
      })
      marker.on('mouseover', () => {
        marker.setLabel({
          content: poi.name,
          direction: 'top',
          offset: [0, -5],
        })
        marker.updateOverlay()
      })
      marker.on('mouseout', () => {
        marker.setLabel({
          content: '',
        })
      })

      // 添加点击事件
      if (props.showInfoWindow && infoWindow.value) {
        marker.on('click', () => {
          const content = `
            <div style="padding: 8px; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">${poi.name}</h3>
              ${poi.address ? `<p style="margin: 4px 0; color: #666; font-size: 14px;">📍 ${poi.address}</p>` : ''}
              ${poi.type ? `<p style="margin: 4px 0; color: #999; font-size: 12px;">类型: ${poi.type}</p>` : ''}
            </div>
          `
          infoWindow.value.setContent(content)
          infoWindow.value.open(mapInstance.value, [lng, lat])
        })
      }

      marker.setMap(mapInstance.value)
      newMarkers.push(marker)
    } catch (error) {
      console.warn('解析POI位置失败:', poi, error)
    }
  })

  markers.value = newMarkers

  // 自动调整视野
  if (props.autoFitView && newMarkers.length > 0) {
    nextTick(() => {
      mapInstance.value?.setFitView(newMarkers, false, [50, 50, 50, 50])
    })
  }
}

// 清除所有标记
function clearMarkers() {
  markers.value.forEach((marker) => {
    marker.setMap(null)
    marker.off('click')
  })
  markers.value = []

  if (infoWindow.value) {
    infoWindow.value.close()
  }
}

// 更新地图中心点
function updateCenter() {
  if (!mapInstance.value) return
  const centerPoint = parseLocation(props.center)
  mapInstance.value.setCenter(centerPoint)
}

// 更新缩放级别
function updateZoom() {
  if (!mapInstance.value) return
  mapInstance.value.setZoom(props.zoom)
}

// 监听POI数据变化
watch(
  () => props.pois,
  (newPois) => {
    if (mapInstance.value && newPois) {
      addMarkers(newPois)
    }
  },
  { deep: true },
)

// 监听中心点变化
watch(() => props.center, updateCenter)

// 监听缩放级别变化
watch(() => props.zoom, updateZoom)

onMounted(() => {
  // 延迟初始化，确保DOM已渲染
  nextTick(() => {
    initMapWithRetry()
  })
})

function initMapWithRetry() {
  // 确保高德地图API已加载
  if ((window as any).AMap) {
    initMap()
  } else {
    // 如果API未加载，等待加载完成
    const checkAMap = setInterval(() => {
      if ((window as any).AMap) {
        clearInterval(checkAMap)
        nextTick(() => {
          initMap()
        })
      }
    }, 100)

    // 10秒后超时
    setTimeout(() => {
      clearInterval(checkAMap)
      if (!(window as any).AMap) {
        console.error('高德地图API加载失败，请检查网络连接和API Key')
      }
    }, 10000)
  }
}

onUnmounted(() => {
  clearMarkers()
  if (mapInstance.value) {
    mapInstance.value.destroy()
    mapInstance.value = null
  }
})
</script>

<template>
  <div class="amap-container" :style="{ height: height, minHeight: height }">
    <div ref="mapContainer" class="amap-view" :style="{ height: '100%', width: '100%' }"></div>
    <div v-if="!mapInstance" class="amap-loading">
      <div class="loading-text">地图加载中...</div>
    </div>
  </div>
</template>

<style scoped>
.amap-container {
  position: relative;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.amap-view {
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.amap-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  z-index: 1;
}

.loading-text {
  color: #666;
  font-size: 14px;
}
</style>
