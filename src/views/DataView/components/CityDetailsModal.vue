<script setup lang="ts">
import { defineEmits, defineProps, computed } from 'vue'

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

function close() {
  emit('update:visible', false)
}

const sortedRows = computed(() => {
  return (props.rows || []).slice().sort((a: CityRow, b: CityRow) => b.count - a.count)
})
</script>

<template>
  <el-dialog
    :title="props.province ? `${props.province} - 城市明细` : '城市明细'"
    v-model:visible="visibleProxy"
    width="600px"
    @close="close"
  >
    <el-table :data="sortedRows" stripe style="width: 100%">
      <el-table-column prop="city" label="城市" />
      <el-table-column prop="count" label="数量" />
    </el-table>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="close">关闭</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<style scoped>
.dialog-footer {
  text-align: right;
}
</style>
