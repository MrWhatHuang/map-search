<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goto(view: string) {
  router.push({ path: view })
}
</script>

<template>
  <div class="home-container">
    <div class="header">
      <h1 class="title">POI 数据管理系统</h1>
      <p class="subtitle">基于高德地图的批量搜索与数据可视化平台</p>
    </div>
    
    <div class="menu-cards">
      <div class="menu-card" @click="goto('/dataView')">
        <div class="card-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z" fill="currentColor"/>
          </svg>
        </div>
        <h3 class="card-title">数据展示</h3>
        <p class="card-desc">查看已采集的 POI 数据，按省份和城市进行统计分析</p>
        <div class="card-action">
          <span>进入 →</span>
        </div>
      </div>
      
      <div class="menu-card" @click="goto('/dataRequest')">
        <div class="card-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
          </svg>
        </div>
        <h3 class="card-title">数据爬取</h3>
        <p class="card-desc">批量搜索指定关键词在全国各地区的 POI 数据</p>
        <div class="card-action">
          <span>进入 →</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 60px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.header {
  text-align: center;
  margin-bottom: 60px;
  color: white;
}

.title {
  font-size: 48px;
  font-weight: 700;
  margin: 0 0 16px 0;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.subtitle {
  font-size: 18px;
  margin: 0;
  opacity: 0.9;
  font-weight: 300;
}

.menu-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 32px;
  max-width: 900px;
  width: 100%;
}

.menu-card {
  background: white;
  border-radius: 16px;
  padding: 40px 32px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.menu-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.menu-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.menu-card:hover::before {
  transform: scaleX(1);
}

.card-icon {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  color: white;
}

.card-icon svg {
  width: 32px;
  height: 32px;
}

.card-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: #1a1a1a;
}

.card-desc {
  font-size: 15px;
  color: #666;
  line-height: 1.6;
  margin: 0 0 24px 0;
  flex: 1;
}

.card-action {
  color: #667eea;
  font-weight: 500;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: gap 0.3s ease;
}

.menu-card:hover .card-action {
  gap: 12px;
}

@media (max-width: 768px) {
  .home-container {
    padding: 40px 16px;
  }
  
  .title {
    font-size: 36px;
  }
  
  .subtitle {
    font-size: 16px;
  }
  
  .menu-cards {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  .menu-card {
    padding: 32px 24px;
  }
}
</style>
