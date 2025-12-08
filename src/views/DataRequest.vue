<script setup lang="ts">
// 占位页面：数据爬取，后续实现爬取功能
</script>

<template>
  <div class="data-request-container">
    <div class="page-header">
      <h1 class="page-title">数据爬取</h1>
      <p class="page-subtitle">批量搜索指定关键词在全国各地区的 POI 数据</p>
    </div>

    <div class="content-card">
      <div class="coming-soon">
        <div class="coming-soon-icon">🚧</div>
        <h3 class="coming-soon-title">功能开发中</h3>
        <p class="coming-soon-text">数据爬取功能正在开发中，敬请期待...</p>
        <div class="coming-soon-features">
          <div class="feature-item">
            <span class="feature-icon">✅</span>
            <span>支持批量关键词搜索</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">✅</span>
            <span>自定义地区范围选择</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">✅</span>
            <span>实时任务进度跟踪</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon">✅</span>
            <span>并发参数配置</span>
          </div>
        </div>
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
  padding: 60px 32px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.coming-soon {
  text-align: center;
  max-width: 500px;
}

.coming-soon-icon {
  font-size: 80px;
  margin-bottom: 24px;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.coming-soon-title {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 16px 0;
}

.coming-soon-text {
  font-size: 16px;
  color: #666;
  margin: 0 0 32px 0;
  line-height: 1.6;
}

.coming-soon-features {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  text-align: left;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 14px;
  color: #333;
}

.feature-icon {
  font-size: 18px;
}

@media (max-width: 768px) {
  .data-request-container {
    padding: 16px;
  }

  .page-title {
    font-size: 24px;
  }

  .content-card {
    padding: 40px 20px;
  }

  .coming-soon-features {
    grid-template-columns: 1fr;
  }
}
</style>
