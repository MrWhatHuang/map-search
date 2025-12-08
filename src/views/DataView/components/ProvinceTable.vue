<script setup lang="ts">
import { defineEmits, defineProps, ref, computed } from 'vue'

const props = defineProps<{ data: Array<{ region: string; count: number }> }>()
const emit = defineEmits<{
  (e: 'show-details', region: string): void
  (e: 'showDetails', region: string): void
}>()

// 默认按 count 降序排列
const sortKey = ref<string | null>('count')
const sortOrder = ref<'descending' | 'ascending' | null>('descending')

// 根据排序状态对数据进行排序
const sortedData = computed(() => {
  if (!sortKey.value || !sortOrder.value) {
    // 默认按 count 降序排列
    return [...props.data].sort((a, b) => b.count - a.count)
  }

  const data = [...props.data]
  
  if (sortKey.value === 'count') {
    return data.sort((a, b) => {
      if (sortOrder.value === 'ascending') {
        return a.count - b.count
      } else {
        return b.count - a.count
      }
    })
  } else if (sortKey.value === 'region') {
    return data.sort((a, b) => {
      const comparison = a.region.localeCompare(b.region, 'zh-CN')
      return sortOrder.value === 'ascending' ? comparison : -comparison
    })
  }
  
  return data
})

function handleSort({ prop, order }: { prop: string | null; order: string | null }) {
  if (!prop || !order) {
    // 清除排序
    sortKey.value = null
    sortOrder.value = null
    return
  }
  sortKey.value = prop
  sortOrder.value = order === 'descending' ? 'descending' : 'ascending'
}

function onShowDetails(region: string) {
  console.log('[ProvinceTable] show details for', region)
  emit('show-details', region)
  // 兼容驼峰事件名监听
  emit('showDetails', region)
}
</script>

<template>
  <div class="province-table-wrapper">
    <el-table 
      :data="sortedData" 
      stripe 
      style="width: 100%" 
      @sort-change="handleSort"
      :header-cell-style="{ background: '#f5f7fa', color: '#333', fontWeight: '600' }"
    >
      <el-table-column 
        prop="region" 
        label="省/直辖市" 
        min-width="150"
        sortable="custom"
        :sort-orders="['descending', 'ascending']"
        :sort-order="sortKey === 'region' ? sortOrder : null"
      >
        <template #default="{ row }">
          <div class="region-cell">
            <span class="region-name">{{ row.region }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        prop="count"
        label="POI 数量"
        sortable="custom"
        :sort-orders="['descending', 'ascending']"
        :sort-order="sortKey === 'count' ? sortOrder : null"
        min-width="120"
      >
        <template #default="{ row }">
          <div class="count-cell">
            <span class="count-value">{{ row.count.toLocaleString() }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button 
            size="small" 
            type="primary" 
            @click="onShowDetails(row.region)"
          >
            查看详情
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.province-table-wrapper {
  border-radius: 8px;
  overflow: hidden;
}

.region-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.region-name {
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

:deep(.el-table) {
  border-radius: 8px;
}

:deep(.el-table__row) {
  transition: background-color 0.2s;
}

:deep(.el-table__row:hover) {
  background-color: #f5f7fa !important;
}

:deep(.el-button--small) {
  padding: 6px 12px;
}
</style>
