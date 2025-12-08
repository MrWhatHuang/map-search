<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import api from '../../api'
import { API_BASE_URL } from '../../config'
import ProvinceTable from './components/ProvinceTable.vue'
import CityDetailsModal from './components/CityDetailsModal.vue'
import AmapView, { type PoiItem } from '../../components/AmapView.vue'

const keywords = ref<string[]>([])
const selectedKeyword = ref<string | null>(null)
const savedFiles = ref<string[]>([])
const keywordToDates = ref<Record<string, string[]>>({})
const dates = ref<string[]>([])
const selectedDate = ref<string | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const provinces = ref<Array<{ region: string; count: number }>>([])
const pois = ref<Array<Record<string, any>>>([])

const detailModalVisible = ref(false)
const detailProvince = ref<string | null>(null)
const detailCityGroups = ref<Array<{ city: string; count: number }>>([])

// 当前激活的页签
const activeTab = ref('table')

api.setApiBase(API_BASE_URL)

// 将POI数据转换为地图组件需要的格式
const mapPois = computed<PoiItem[]>(() => {
  return pois.value
    .filter((poi) => poi.location) // 过滤掉没有位置信息的POI
    .map((poi) => ({
      id: poi.id,
      name: poi.name || '未知',
      location: poi.location as string, // 高德API返回的格式: "经度,纬度"
      address: poi.address,
      type: poi.type,
      tel: poi.tel,
    }))
})

function formatLocalDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

const disabledDate = (time: Date) => {
  const y = time.getFullYear()
  const m = String(time.getMonth() + 1).padStart(2, '0')
  const dd = String(time.getDate()).padStart(2, '0')
  const dateStr = `${y}-${m}-${dd}`
  return !dates.value.includes(dateStr)
}

async function loadKeywords() {
  try {
    const body = await api.get('/api/saved-keywords')
    const savedBody = (body && (body.data ?? body)) || []
    savedFiles.value = savedBody

    const map: Record<string, Set<string>> = {}
    for (const fn of savedFiles.value) {
      const m = fn.match(/(\d{4}-\d{2}-\d{2})/)
      const date = m ? m[1] : null
      if (date) {
        const idx = fn.indexOf(date)
        let kw = fn.slice(0, idx)
        if (kw.endsWith('_')) kw = kw.slice(0, -1)
        if (!map[kw]) map[kw] = new Set()
        map[kw].add(date)
      }
    }
    const obj: Record<string, string[]> = {}
    Object.keys(map).forEach((k) => {
      obj[k] = Array.from(map[k]!).sort().reverse()
    })
    keywordToDates.value = obj
    keywords.value = Object.keys(obj)
    selectedKeyword.value = keywords.value[0] || null
    if (selectedKeyword.value) {
      dates.value = keywordToDates.value[selectedKeyword.value] || []
      selectedDate.value = dates.value.length > 0 ? dates.value[0]! : null
    }
  } catch (err: unknown) {
    console.error(err)
    const msg = err instanceof Error ? err.message : String(err)
    error.value = '加载关键词失败'
    ElMessage.error(msg || '加载关键词失败')
  }
}

async function loadData(k: string, dateStr: string) {
  loading.value = true
  error.value = null
  try {
    const body = await api.get(
      `/api/saved-pois/${encodeURIComponent(k)}/${encodeURIComponent(dateStr)}`,
    )
    const payload = body && (body.data ?? body)
    // payload.regionBreakdown & payload.pois
    provinces.value = (payload?.regionBreakdown || [])
      .slice()
      .sort((a: any, b: any) => b.count - a.count)
    pois.value = payload?.pois || []
  } catch (err: unknown) {
    console.error(err)
    const msg = err instanceof Error ? err.message : String(err)
    error.value = msg || '加载数据失败'
    if (error.value) ElMessage.error(error.value)
  } finally {
    loading.value = false
  }
}

function openDetailsForProvince(prov: string) {
  detailProvince.value = prov
  // group pois by cityname where pname === prov
  const filtered = pois.value.filter(
    (p) => p.pname === prov || p.pname === prov.replace(/省|市|自治区|特别行政区$/, ''),
  )
  const map: Record<string, number> = {}
  for (const p of filtered) {
    const city = p.cityname || '未知'
    map[city] = (map[city] || 0) + 1
  }
  detailCityGroups.value = Object.keys(map)
    .map((c) => ({ city: c, count: map[c] }))
    .sort((a, b) => b.count - a.count)
  detailModalVisible.value = true
}

onMounted(async () => {
  await loadKeywords()
  // if default selected values exist, load data
  if (selectedKeyword.value && selectedDate.value) {
    await loadData(selectedKeyword.value, selectedDate.value)
  }
})

watch(selectedKeyword, (k) => {
  if (k) {
    dates.value = (keywordToDates.value[k] || []).slice()
    selectedDate.value = dates.value.length > 0 ? dates.value[0]! : null
    if (selectedDate.value) loadData(k, selectedDate.value)
  } else {
    savedFiles.value = []
    dates.value = []
    selectedDate.value = null
  }
})

watch(selectedDate, (d) => {
  if (selectedKeyword.value && d) {
    loadData(selectedKeyword.value, d)
  }
})
</script>

<template>
  <div class="data-view-container">
    <div class="page-header">
      <h1 class="page-title">POI 数据展示</h1>
      <p class="page-subtitle">查看已采集的兴趣点数据在全国的分布情况</p>
    </div>

    <div class="content-card">
      <div class="controls-section">
        <div class="control-group">
          <label class="control-label">
            <span class="label-icon">🔍</span>
            关键词
          </label>
          <el-select
            v-model="selectedKeyword"
            placeholder="请选择关键词"
            class="control-select"
            size="large"
            clearable
          >
            <el-option v-for="k in keywords" :key="k" :label="k" :value="k" />
          </el-select>
        </div>

        <div class="control-group" v-if="dates.length > 0">
          <label class="control-label">
            <span class="label-icon">📅</span>
            日期
          </label>
          <el-date-picker
            v-model="selectedDate"
            type="date"
            placeholder="选择日期"
            :disabled-date="disabledDate"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            size="large"
            class="control-date-picker"
          />
        </div>
      </div>

      <div v-if="error" class="error-message">
        <el-alert :title="error" type="error" :closable="false" show-icon />
      </div>

      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="8" animated />
      </div>

      <el-tabs v-else v-model="activeTab" class="data-tabs">
        <el-tab-pane label="表格视图" name="table">
          <template #label>
            <span class="tab-label">
              <span class="tab-icon">📊</span>
              表格视图
            </span>
          </template>

          <div v-if="provinces.length > 0" class="table-section">
            <div class="stats-summary">
              <div class="stat-item">
                <span class="stat-label">总省份数</span>
                <span class="stat-value">{{ provinces.length }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">总 POI 数</span>
                <span class="stat-value">{{
                  provinces.reduce((sum, p) => sum + p.count, 0).toLocaleString()
                }}</span>
              </div>
            </div>
            <province-table :data="provinces" @show-details="openDetailsForProvince" />
          </div>

          <div v-else-if="selectedKeyword" class="empty-state">
            <div class="empty-icon">📊</div>
            <p class="empty-text">暂无数据，请先进行数据爬取</p>
          </div>
        </el-tab-pane>

        <el-tab-pane label="地图视图" name="map" :lazy="true">
          <template #label>
            <span class="tab-label">
              <span class="tab-icon">🗺️</span>
              地图视图
            </span>
          </template>

          <div v-if="mapPois.length > 0" class="map-section">
            <div class="map-stats">
              <span class="map-stat-text">
                共 <strong>{{ mapPois.length }}</strong> 个 POI 点
              </span>
            </div>
            <AmapView
              v-if="activeTab === 'map'"
              :pois="mapPois"
              height="600px"
              :show-info-window="true"
              :auto-fit-view="true"
            />
          </div>

          <div v-else-if="selectedKeyword" class="empty-state">
            <div class="empty-icon">🗺️</div>
            <p class="empty-text">暂无位置数据，无法在地图上展示</p>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <city-details-modal
      v-model:visible="detailModalVisible"
      :province="detailProvince"
      :rows="detailCityGroups"
    />
  </div>
</template>

<style scoped>
.data-view-container {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px 0;
}

.page-subtitle {
  font-size: 16px;
  color: #666;
  margin: 0;
}

.content-card {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.controls-section {
  display: flex;
  gap: 24px;
  margin-bottom: 32px;
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 200px;
}

.control-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  display: flex;
  align-items: center;
  gap: 6px;
}

.label-icon {
  font-size: 16px;
}

.control-select {
  width: 100%;
}

.control-date-picker {
  width: 100%;
}

.error-message {
  margin-bottom: 24px;
}

.loading-container {
  margin-top: 24px;
}

.data-tabs {
  margin-top: 24px;
}

:deep(.el-tabs__header) {
  margin-bottom: 24px;
}

:deep(.el-tabs__item) {
  font-size: 16px;
  font-weight: 500;
  padding: 0 24px;
  height: 48px;
  line-height: 48px;
}

:deep(.el-tabs__item.is-active) {
  color: #667eea;
}

:deep(.el-tabs__active-bar) {
  background-color: #667eea;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab-icon {
  font-size: 18px;
}

.table-section {
  margin-top: 0;
}

.map-section {
  margin-top: 0;
}

.map-stats {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #f0f9ff;
  border-left: 4px solid #667eea;
  border-radius: 4px;
}

.map-stat-text {
  font-size: 14px;
  color: #333;
}

.map-stat-text strong {
  color: #667eea;
  font-weight: 600;
}

.stats-summary {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 400;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: white;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  color: #999;
  margin: 0;
}

@media (max-width: 768px) {
  .data-view-container {
    padding: 16px;
  }

  .page-title {
    font-size: 24px;
  }

  .content-card {
    padding: 20px;
  }

  .controls-section {
    flex-direction: column;
    gap: 16px;
  }

  .control-group {
    min-width: 100%;
  }

  .stats-summary {
    flex-direction: column;
    gap: 16px;
  }
}
</style>
