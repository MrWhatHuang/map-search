<script setup lang="ts">
import { defineEmits, defineProps, computed, ref } from 'vue'

interface CityRow {
  city: string
  count: number
}

interface Props {
  province?: string
  visible: boolean
  rows?: CityRow[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
}>()

const visibleProxy = computed({
  get: () => props.visible,
  set: (v: boolean) => emit('update:visible', v),
})

// 排序状态管理
const sortKey = ref<string | null>('count')
const sortOrder = ref<'descending' | 'ascending' | null>('descending')

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
    width="700px"
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
      <el-table 
        :data="sortedRows" 
        stripe 
        style="width: 100%"
        :header-cell-style="{ background: '#f5f7fa', color: '#333', fontWeight: '600' }"
        max-height="400"
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
