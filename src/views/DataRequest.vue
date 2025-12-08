<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api, { post as apiPost } from '../api'
import { API_BASE_URL } from '../config'

const router = useRouter()
api.setApiBase(API_BASE_URL)

// 表单数据
const keywords = ref('')
const useAllRegions = ref(true)
const selectedRegions = ref<string[]>([])
const availableRegions = ref<string[]>([])
const maxConcurrency = ref(2)
const delayMin = ref(1000)
const delayMax = ref(1500)

// 任务相关
const currentTaskId = ref<string | null>(null)
const taskStatus = ref<'idle' | 'running' | 'completed' | 'failed'>('idle')
const taskProgress = ref({ current: 0, total: 0, percentage: 0 })
const taskError = ref<string | null>(null)
const taskResult = ref<any>(null)

// 任务历史
const taskHistory = ref<any[]>([])

// 加载中状态
const loading = ref(false)
const loadingRegions = ref(false)

// 计算属性
const canStart = computed(() => {
  return keywords.value.trim() !== '' && !loading.value && taskStatus.value !== 'running'
})

const progressText = computed(() => {
  if (taskStatus.value === 'idle') return '等待开始'
  if (taskStatus.value === 'running') {
    return `${taskProgress.value.current} / ${taskProgress.value.total} (${taskProgress.value.percentage}%)`
  }
  if (taskStatus.value === 'completed') return '已完成'
  if (taskStatus.value === 'failed') return '失败'
  return ''
})

// 加载地区列表
async function loadRegions() {
  loadingRegions.value = true
  try {
    const body = await api.get('/api/regions')
    const data = (body && (body.data ?? body)) || []
    availableRegions.value = data
    if (data.length > 0 && selectedRegions.value.length === 0) {
      // 默认选择前几个地区作为示例
      selectedRegions.value = data.slice(0, 5)
    }
  } catch (err: unknown) {
    console.error(err)
    const msg = err instanceof Error ? err.message : String(err)
    ElMessage.error('加载地区列表失败: ' + msg)
  } finally {
    loadingRegions.value = false
  }
}

// 启动搜索任务
async function startSearch() {
  if (!canStart.value) return

  // 验证自定义地区选择
  if (!useAllRegions.value && selectedRegions.value.length === 0) {
    ElMessage.warning('请选择至少一个地区')
    return
  }

  loading.value = true
  taskStatus.value = 'idle'
  taskError.value = null
  taskResult.value = null
  currentTaskId.value = null

  try {
    const keyword = keywords.value.trim()

    let body: any
    let data: any

    if (useAllRegions.value) {
      // 使用全部地区：调用 GET 接口
      const params = new URLSearchParams({
        maxConcurrency: maxConcurrency.value.toString(),
        delayMin: delayMin.value.toString(),
        delayMax: delayMax.value.toString(),
      })

      body = await api.get(`/api/bulk-search/${encodeURIComponent(keyword)}?${params.toString()}`)
      data = (body && (body.data ?? body)) || {}
    } else {
      // 使用自定义地区：调用 POST 接口
      body = await apiPost('/api/bulk-search', {
        keywords: keyword,
        regions: selectedRegions.value,
        maxConcurrency: maxConcurrency.value,
        delayMin: delayMin.value,
        delayMax: delayMax.value,
      })
      data = (body && (body.data ?? body)) || {}
    }

    if (data.taskId) {
      currentTaskId.value = data.taskId
      taskStatus.value = 'running'
      ElMessage.success('任务已创建，正在后台运行...')

      // 开始轮询任务进度
      pollTaskProgress(data.taskId)
    } else {
      throw new Error('未获取到任务ID')
    }
  } catch (err: unknown) {
    console.error(err)
    const msg = err instanceof Error ? err.message : String(err)
    taskError.value = msg
    taskStatus.value = 'failed'
    ElMessage.error('启动搜索失败: ' + msg)
  } finally {
    loading.value = false
  }
}

// 轮询任务进度
let pollInterval: number | null = null

function pollTaskProgress(taskId: string) {
  // 清除之前的轮询
  if (pollInterval) {
    clearInterval(pollInterval)
  }

  // 立即查询一次
  queryTaskProgress(taskId)

  // 每2秒轮询一次
  pollInterval = window.setInterval(async () => {
    await queryTaskProgress(taskId)

    // 如果任务完成或失败，停止轮询
    if (taskStatus.value === 'completed' || taskStatus.value === 'failed') {
      if (pollInterval) {
        clearInterval(pollInterval)
        pollInterval = null
      }
    }
  }, 2000)
}

// 查询任务进度
async function queryTaskProgress(taskId: string) {
  try {
    const body = await api.get(`/api/task/${taskId}`)
    const task = (body && (body.data ?? body)) || null

    if (!task) {
      taskStatus.value = 'failed'
      taskError.value = '任务未找到'
      return
    }

    // 更新任务状态
    taskStatus.value = task.status
    taskProgress.value = {
      current: task.progress?.current || 0,
      total: task.progress?.total || 0,
      percentage: task.progress?.percentage || 0,
    }

    if (task.status === 'completed') {
      taskResult.value = {
        totalResults: task.totalResults || 0,
        filePath: task.filePath || '',
        regionResults: task.regionResults || [],
      }
      ElMessage.success('搜索任务已完成！')
      // 加载任务历史
      loadTaskHistory()
    } else if (task.status === 'failed') {
      taskError.value = task.error || '任务执行失败'
      ElMessage.error('搜索任务失败: ' + taskError.value)
    }
  } catch (err: unknown) {
    console.error('查询任务进度失败:', err)
    // 查询失败不中断轮询，继续尝试
  }
}

// 加载任务历史
async function loadTaskHistory() {
  if (!keywords.value.trim()) return

  try {
    const body = await api.get(`/api/tasks/keyword/${encodeURIComponent(keywords.value.trim())}`)
    const tasks = (body && (body.data ?? body)) || []
    taskHistory.value = tasks.sort((a: any, b: any) => {
      return (b.startTime || 0) - (a.startTime || 0)
    })
  } catch (err: unknown) {
    console.error('加载任务历史失败:', err)
  }
}

// 重置表单
function resetForm() {
  keywords.value = ''
  useAllRegions.value = true
  selectedRegions.value = []
  currentTaskId.value = null
  taskStatus.value = 'idle'
  taskError.value = null
  taskResult.value = null
  taskHistory.value = []

  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

onMounted(() => {
  loadRegions()
})
</script>

<template>
  <div class="data-request-container">
    <div class="page-header">
      <div class="header-content">
        <div>
          <h1 class="page-title">数据爬取</h1>
          <p class="page-subtitle">
            批量搜索指定关键词在全国各城市的 POI 数据（支持按省份选择，自动转换为城市）
          </p>
        </div>
        <el-button type="primary" @click="router.push('/')"> ← 返回首页 </el-button>
      </div>
    </div>

    <div class="content-card">
      <el-form
        :model="{ keywords, maxConcurrency, delayMin, delayMax }"
        label-width="140px"
        class="search-form"
      >
        <el-form-item label="搜索关键词" required>
          <el-input
            v-model="keywords"
            placeholder="请输入关键词，例如：古茗、哪吒仙饮"
            size="large"
            :disabled="taskStatus === 'running'"
            clearable
          >
            <template #prefix>🔍</template>
          </el-input>
        </el-form-item>

        <el-form-item label="地区范围">
          <el-radio-group v-model="useAllRegions" :disabled="taskStatus === 'running'">
            <el-radio :label="true">使用全部省份</el-radio>
            <el-radio :label="false">自定义省份</el-radio>
          </el-radio-group>
          <div v-if="!useAllRegions" class="region-selector">
            <el-select
              v-model="selectedRegions"
              multiple
              placeholder="选择省份（将自动转换为城市进行搜索）"
              size="large"
              :loading="loadingRegions"
              :disabled="taskStatus === 'running'"
              style="width: 100%"
            >
              <el-option
                v-for="region in availableRegions"
                :key="region"
                :label="region"
                :value="region"
              />
            </el-select>
            <div class="region-hint">
              已选择 {{ selectedRegions.length }} 个省份（将自动转换为对应的城市列表）
            </div>
          </div>
          <div v-else class="region-hint" style="margin-top: 8px; font-size: 12px; color: #999">
            将使用所有省份，自动转换为城市进行搜索
          </div>
        </el-form-item>

        <el-form-item label="并发参数">
          <div class="concurrency-config">
            <div class="config-item">
              <label>最大并发数：</label>
              <el-input-number
                v-model="maxConcurrency"
                :min="1"
                :max="10"
                :disabled="taskStatus === 'running'"
                size="small"
              />
              <span class="config-hint">同时处理的城市数（建议1-3）</span>
            </div>
            <div class="config-item">
              <label>延迟范围：</label>
              <el-input-number
                v-model="delayMin"
                :min="0"
                :max="5000"
                :disabled="taskStatus === 'running'"
                size="small"
              />
              <span> - </span>
              <el-input-number
                v-model="delayMax"
                :min="0"
                :max="5000"
                :disabled="taskStatus === 'running'"
                size="small"
              />
              <span class="config-hint">毫秒（避免触发API限制）</span>
            </div>
          </div>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            :disabled="!canStart"
            @click="startSearch"
          >
            {{ taskStatus === 'running' ? '搜索进行中...' : '开始搜索' }}
          </el-button>
          <el-button size="large" :disabled="taskStatus === 'running'" @click="resetForm">
            重置
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 任务进度 -->
      <div v-if="taskStatus !== 'idle'" class="task-section">
        <h3 class="section-title">任务进度</h3>

        <div
          v-if="taskStatus === 'running' || taskStatus === 'completed' || taskStatus === 'failed'"
          class="progress-container"
        >
          <el-progress
            :percentage="taskProgress.percentage"
            :status="
              taskStatus === 'failed'
                ? 'exception'
                : taskStatus === 'completed'
                  ? 'success'
                  : undefined
            "
            :stroke-width="20"
          />
          <div class="progress-info">
            <span>{{ progressText }}</span>
            <span v-if="taskProgress.total > 0" class="progress-detail">
              {{ taskProgress.current }} / {{ taskProgress.total }} 个城市
            </span>
          </div>
        </div>

        <div v-if="taskStatus === 'completed' && taskResult" class="result-container">
          <el-alert type="success" :closable="false" show-icon>
            <template #title>
              <div class="result-content">
                <div class="result-item">
                  <strong>总 POI 数：</strong>{{ taskResult.totalResults.toLocaleString() }}
                </div>
                <div v-if="taskResult.filePath" class="result-item">
                  <strong>文件路径：</strong>{{ taskResult.filePath }}
                </div>
              </div>
            </template>
          </el-alert>
        </div>

        <div v-if="taskStatus === 'failed' && taskError" class="error-container">
          <el-alert type="error" :title="taskError" :closable="false" show-icon />
        </div>
      </div>

      <!-- 任务历史 -->
      <div v-if="taskHistory.length > 0" class="task-history-section">
        <h3 class="section-title">任务历史</h3>
        <el-table :data="taskHistory" stripe style="width: 100%">
          <el-table-column prop="keyword" label="关键词" width="150" />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag
                :type="
                  row.status === 'completed'
                    ? 'success'
                    : row.status === 'failed'
                      ? 'danger'
                      : row.status === 'running'
                        ? 'warning'
                        : 'info'
                "
              >
                {{
                  row.status === 'completed'
                    ? '已完成'
                    : row.status === 'failed'
                      ? '失败'
                      : row.status === 'running'
                        ? '运行中'
                        : '等待中'
                }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="进度" width="150">
            <template #default="{ row }">
              {{ row.progress?.current || 0 }} / {{ row.progress?.total || 0 }} ({{
                row.progress?.percentage || 0
              }}%)
            </template>
          </el-table-column>
          <el-table-column prop="totalResults" label="POI 数" width="120">
            <template #default="{ row }">
              {{ row.totalResults ? row.totalResults.toLocaleString() : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="开始时间" width="180">
            <template #default="{ row }">
              {{ row.startTime ? new Date(row.startTime).toLocaleString() : '-' }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.data-request-container {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
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

.search-form {
  margin-bottom: 32px;
}

.region-selector {
  margin-top: 12px;
  width: 100%;
}

.region-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #999;
}

.concurrency-config {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-item label {
  min-width: 100px;
  font-size: 14px;
  color: #333;
}

.config-hint {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
}

.task-section {
  margin-top: 32px;
  padding-top: 32px;
  border-top: 1px solid #ebeef5;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 16px 0;
}

.progress-container {
  margin-bottom: 24px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  font-size: 14px;
  color: #666;
}

.progress-detail {
  color: #999;
  font-size: 12px;
}

.result-container {
  margin-bottom: 24px;
}

.result-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-item {
  font-size: 14px;
  color: #333;
}

.result-item strong {
  color: #667eea;
  font-weight: 600;
}

.error-container {
  margin-bottom: 24px;
}

.task-history-section {
  margin-top: 32px;
  padding-top: 32px;
  border-top: 1px solid #ebeef5;
}

@media (max-width: 768px) {
  .data-request-container {
    padding: 16px;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
  }

  .page-title {
    font-size: 24px;
  }

  .content-card {
    padding: 20px;
  }

  .concurrency-config {
    gap: 12px;
  }

  .config-item {
    flex-wrap: wrap;
  }

  .config-hint {
    width: 100%;
    margin-left: 0;
    margin-top: 4px;
  }
}
</style>
