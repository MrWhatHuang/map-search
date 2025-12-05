<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goto(view: string) {
  router.push({ path: view })
}
</script>

<template>
  <div class="menu">
    <h2>功能菜单</h2>
    <div class="buttons">
      <button @click="goto('/dataView')">数据展示 (dataView)</button>
      <button @click="goto('/dataRequest')">数据爬取 (dataRequest)</button>
    </div>
  </div>
</template>

<style scoped>
.menu {
  padding: 24px;
}
.buttons {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}
button {
  padding: 8px 16px;
  cursor: pointer;
}
</style>
