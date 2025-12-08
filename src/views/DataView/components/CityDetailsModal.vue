<script setup lang="ts">
import { defineEmits, defineProps, computed, ref } from 'vue'
import AmapView, { type PoiItem } from '../../../components/AmapView.vue'

interface CityRow {
  city: string
  count: number
}

interface Props {
  province?: string
  visible: boolean
  rows?: CityRow[]
  pois?: Array<Record<string, any>>
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
}>()

const visibleProxy = computed({
  get: () => props.visible,
  set: (v: boolean) => emit('update:visible', v),
})

// 当前激活的页签（默认表格）
const activeTab = ref('table')

// 排序状态管理
const sortKey = ref<string | null>('count')
const sortOrder = ref<'descending' | 'ascending' | null>('descending')

// 将POI数据转换为地图组件需要的格式
const mapPois = computed<PoiItem[]>(() => {
  return (props.pois || [])
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

// 根据排序状态对数据进行排序
const sortedRows = computed(() => {
  const rows = props.rows || []
  if (rows.length === 0) return []

  if (!sortKey.value || !sortOrder.value) {
    // 默认按 count 降序排列
    return [...rows].sort((a, b) => b.count - a.count)
  }

  const data = [...rows]
  
  if (sortKey.value === 'count') {
    return data.sort((a, b) => {
      if (sortOrder.value === 'ascending') {
        return a.count - b.count
      } else {
        return b.count - a.count
      }
    })
  } else if (sortKey.value === 'city') {
    return data.sort((a, b) => {
      const comparison = a.city.localeCompare(b.city, 'zh-CN')
      return sortOrder.value === 'ascending' ? comparison : -comparison
    })
  }
  
  return data
})

function handleSort({ prop, order }: { prop: string | null; order: string | null }) {
  if (!prop || !order) {
    // 清除排序，恢复默认
    sortKey.value = 'count'
    sortOrder.value = 'descending'
    return
  }
  sortKey.value = prop
  sortOrder.value = order === 'descending' ? 'descending' : 'ascending'
}

function close() {
  emit('update:visible', false)
}
</script>

<template>
  <el-dialog
    :title="props.province ? `${props.province} - 城市明细` : '城市明细'"
    v-model="visibleProxy"
    width="1200px"
    @close="close"
    class="city-details-dialog"
  >
    <div class="modal-content">
      <div v-if="sortedRows.length > 0" class="summary-info">
        <span class="summary-text">
          共 <strong>{{ sortedRows.length }}</strong> 个城市，
          总计 <strong>{{ sortedRows.reduce((sum, r) => sum + r.count, 0).toLocaleString() }}</strong> 个 POI
        </span>
      </div>

      <el-tabs v-model="activeTab" class="detail-tabs">
        <el-tab-pane label="表格视图" name="table">
          <template #label>
            <span class="tab-label">
              <span class="tab-icon">📊</span>
              表格视图
            </span>
          </template>
          
          <el-table 
            :data="sortedRows" 
            stripe 
            style="width: 100%"
            :header-cell-style="{ background: '#f5f7fa', color: '#333', fontWeight: '600' }"
            max-height="500"
            @sort-change="handleSort"
          >
            <el-table-column 
              prop="city" 
              label="城市" 
              min-width="200"
              sortable="custom"
              :sort-orders="['descending', 'ascending']"
              :sort-order="sortKey === 'city' ? sortOrder : null"
            >
              <template #default="{ row }">
                <div class="city-cell">
                  <span class="city-name">{{ row.city }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column 
              prop="count" 
              label="POI 数量" 
              min-width="150"
              sortable="custom"
              :sort-orders="['descending', 'ascending']"
              :sort-order="sortKey === 'count' ? sortOrder : null"
            >
              <template #default="{ row }">
                <div class="count-cell">
                  <span class="count-value">{{ row.count.toLocaleString() }}</span>
                </div>
              </template>
            </el-table-column>
          </el-table>
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

          <div v-else class="empty-state">
            <div class="empty-icon">🗺️</div>
            <p class="empty-text">暂无位置数据，无法在地图上展示</p>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="close" type="primary">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.city-details-dialog :deep(.el-dialog__header) {
  padding: 20px 24px 16px;
  border-bottom: 1px solid #ebeef5;
}

.city-details-dialog :deep(.el-dialog__title) {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
}

.modal-content {
  padding: 8px 0;
}

.detail-tabs {
  margin-top: 16px;
}

:deep(.detail-tabs .el-tabs__header) {
  margin-bottom: 16px;
}

:deep(.detail-tabs .el-tabs__item) {
  font-size: 15px;
  font-weight: 500;
  padding: 0 20px;
  height: 44px;
  line-height: 44px;
}

:deep(.detail-tabs .el-tabs__item.is-active) {
  color: #667eea;
}

:deep(.detail-tabs .el-tabs__active-bar) {
  background-color: #667eea;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab-icon {
  font-size: 16px;
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

.summary-info {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #f0f9ff;
  border-left: 4px solid #667eea;
  border-radius: 4px;
}

.summary-text {
  font-size: 14px;
  color: #333;
}

.summary-text strong {
  color: #667eea;
  font-weight: 600;
}

.city-cell {
  display: flex;
  align-items: center;
}

.city-name {
  font-weight: 500;
  color: #1a1a1a;
}

.count-cell {
  display: flex;
  align-items: center;
}

.count-value {
  font-weight: 600;
  color: #667eea;
  font-size: 15px;
}

.dialog-footer {
  text-align: right;
}

:deep(.el-table__row:hover) {
  background-color: #f5f7fa !important;
}
</style>
