<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import api from '../../api'
import ProvinceTable from './components/ProvinceTable.vue'
import CityDetailsModal from './components/CityDetailsModal.vue'

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

api.setApiBase('http://localhost:3000')

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
  <div class="app">
    <h2>POI 全国分布表格</h2>

    <div class="controls">
      <div class="control-group">
        <label>关键词：</label>
        <select v-model="selectedKeyword" class="select-input">
          <option value="">-- 请选择关键词 --</option>
          <option v-for="k in keywords" :key="k" :value="k">{{ k }}</option>
        </select>
      </div>

      <div class="control-group" v-if="dates.length > 0">
        <label>日期：</label>
        <el-date-picker
          v-model="selectedDate"
          type="date"
          placeholder="选择日期"
          :disabled-date="disabledDate"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
        />
      </div>
    </div>

    <div v-if="error" class="error">{{ error }}</div>
    <div v-if="loading" class="loading">加载中...</div>

    <province-table :data="provinces" @show-details="openDetailsForProvince" />

    <city-details-modal
      v-model:visible="detailModalVisible"
      :province="detailProvince"
      :rows="detailCityGroups"
    />
  </div>
</template>

<style scoped>
.app {
  padding: 24px;
}
.controls {
  display: flex;
  gap: 16px;
  align-items: flex-end;
  margin-bottom: 16px;
}
.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.select-input {
  padding: 6px 8px;
}
.loading {
  text-align: center;
}
.error {
  color: #f56c6c;
}
</style>
