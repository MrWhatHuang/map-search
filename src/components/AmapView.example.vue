<!-- 
  高德地图组件使用示例
  
  使用方式：
  1. 导入组件
  2. 传入POI数据数组
  3. 可选配置地图中心点、缩放级别等
-->

<script setup lang="ts">
import { ref } from 'vue'
import AmapView, { type PoiItem } from './AmapView.vue'

// 示例POI数据
const pois = ref<PoiItem[]>([
  {
    id: '1',
    name: '示例POI点1',
    location: '116.397428,39.90923', // 北京天安门
    address: '北京市东城区天安门广场',
    type: '景点',
    tel: '010-12345678',
  },
  {
    id: '2',
    name: '示例POI点2',
    location: '116.407526,39.904030', // 北京故宫
    address: '北京市东城区景山前街4号',
    type: '景点',
  },
])

// 地图配置
const center = ref<string>('116.397428,39.90923')
const zoom = ref<number>(12)
</script>

<template>
  <div class="example-container">
    <h2>高德地图组件示例</h2>
    
    <div class="map-wrapper">
      <AmapView
        :pois="pois"
        :center="center"
        :zoom="zoom"
        height="600px"
        :show-info-window="true"
        :auto-fit-view="true"
      />
    </div>
  </div>
</template>

<style scoped>
.example-container {
  padding: 24px;
}

.map-wrapper {
  margin-top: 24px;
}
</style>

