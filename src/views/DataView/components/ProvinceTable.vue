<script setup lang="ts">
import { defineEmits, defineProps, ref, watch } from 'vue'
const props = defineProps<{ data: Array<{ region: string; count: number }> }>()
const emit = defineEmits<{
  (e: 'show-details', region: string): void
  (e: 'showDetails', region: string): void
}>()

const sortKey = ref('count')
const sortOrder = ref<'descending' | 'ascending'>('descending')

watch(
  () => props.data,
  () => {
    // no-op; kept for reactivity
  },
)

function handleSort({ prop, order }: { prop: string; order: string }) {
  if (!prop) return
  sortKey.value = prop
  sortOrder.value = order === 'descending' ? 'descending' : 'ascending'
}

function onShowDetails(region: string) {
  // 日志帮助排查点击事件是否触发

  console.log('[ProvinceTable] show details for', region)
  emit('show-details', region)
  // 兼容驼峰事件名监听
  emit('showDetails', region)
}
</script>

<template>
  <el-table :data="data" stripe style="width: 100%" @sort-change="handleSort">
    <el-table-column prop="region" label="省/直辖市" />
    <el-table-column
      prop="count"
      label="数量"
      sortable="custom"
      :sort-orders="['descending', 'ascending']"
    />
    <el-table-column label="操作" width="120">
      <template #default="{ row }">
        <el-button size="small" type="primary" @click="onShowDetails(row.region)"
          >查看详情</el-button
        >
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.el-table {
  margin-top: 12px;
}
</style>
