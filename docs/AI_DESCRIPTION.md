# Map-Search 项目 AI 描述文档

本文档旨在帮助 AI Agent 快速理解项目结构、功能和技术实现，便于后续的对话和开发。

## 项目概述

**项目名称**: map-search  
**项目类型**: 全栈 Web 应用（Vue 3 前端 + Express 后端）  
**核心功能**: 基于高德地图 API 的 POI（兴趣点）批量搜索、数据采集和可视化展示系统

### 主要功能模块

1. **数据爬取模块** (`/dataRequest`): 批量搜索指定关键词在全国各地区的 POI 数据
2. **数据展示模块** (`/dataView`): 可视化展示已采集的 POI 数据，支持按省份、城市查看分布情况

## 技术栈

### 前端

- **框架**: Vue 3 (Composition API)
- **路由**: Vue Router 4
- **状态管理**: Pinia
- **UI 组件库**: Element Plus
- **图表库**: ECharts (vue-echarts)
- **构建工具**: Vite 7
- **语言**: TypeScript

### 后端

- **框架**: Express.js
- **语言**: TypeScript (Node.js)
- **运行环境**: Node.js ^20.19.0 || >=22.12.0
- **数据库**: PostgreSQL
- **ORM**: Prisma

### 核心依赖

- `cors`: 跨域支持
- `express`: HTTP 服务器
- `prisma` / `@prisma/client`: 数据库 ORM
- `element-plus`: UI 组件
- `echarts` / `vue-echarts`: 数据可视化
- `pinia`: 状态管理
- `vue-router`: 路由管理

## 项目结构

```
map-search/
├── service/              # 后端服务代码
│   ├── src/             # 核心业务代码
│   │   ├── server.ts    # Express 服务器主文件
│   │   ├── amap.ts      # 高德地图 API 封装
│   │   ├── bulk-search.ts # 批量搜索核心逻辑
│   │   ├── task-manager.ts # 任务管理器（进度跟踪）
│   │   ├── db.ts        # 数据库连接（Prisma Client）
│   │   └── config.ts    # 配置文件（API Key、并发数等）
│   ├── data/            # 数据文件
│   │   ├── regions.json # 全国省份列表
│   │   ├── cities.json  # 城市列表
│   │   └── province-to-cities.json # 省份到城市映射
│   ├── scripts/         # 工具脚本
│   │   ├── convert-regions.ts # Excel 转 JSON
│   │   └── migrate-json-to-db.ts # JSON 数据迁移脚本
│   └── docs/            # 文档
│       ├── API.md       # API 接口文档
│       └── DATABASE.md  # 数据库迁移指南
├── prisma/              # Prisma 配置
│   └── schema.prisma    # 数据库 Schema
├── src/                 # 前端源代码
│   ├── views/           # 页面组件
│   │   ├── Home.vue            # 首页（功能菜单）
│   │   ├── DataRequest.vue     # 数据爬取页面
│   │   └── DataView/           # 数据展示模块
│   │       ├── index.vue                    # 主页面
│   │       └── components/
│   │           ├── ProvinceTable.vue        # 省份表格组件
│   │           └── CityDetailsModal.vue     # 城市详情弹窗
│   ├── components/      # 通用组件
│   │   └── AmapView.vue # 高德地图组件
│   ├── api.ts           # API 请求封装（支持 alova 回退到 fetch）
│   ├── router/          # 路由配置
│   ├── stores/          # Pinia 状态管理
│   ├── App.vue          # 根组件
│   └── main.ts          # 入口文件
├── docs/                # 文档目录
├── package.json         # 项目配置和依赖
└── vite.config.ts      # Vite 构建配置
```

## 核心功能详解

### 1. 高德地图 API 集成 (`service/amap.ts`)

**主要函数**:

- `searchAMapPoi(params)`: 搜索高德 POI，支持：
  - 自动重试机制（默认 3 次）
  - 随机延迟控制（避免触发并发限制）
  - 并发限制检测和处理
  - 分页支持（pageSize, pageNum）

**关键特性**:

- 自动检测 `CUQPS_HAS_EXCEEDED_THE_LIMIT` 错误并重试
- 支持自定义延迟范围（delayMin, delayMax）
- 可配置重试次数和重试延迟

### 2. 批量搜索系统 (`service/bulk-search.ts`)

**核心函数**:

- `bulkSearchByKeyword(keywords, regions, options)`: 批量搜索多个地区
  - 支持并发控制（maxConcurrency）
  - 支持任务进度跟踪（taskId）
  - 自动翻页获取所有数据
  - 结果保存到 PostgreSQL 数据库（按关键词和日期组织）

**数据流程**:

1. 遍历所有地区列表
2. 对每个地区并发搜索（可配置并发数）
3. 每个地区内部支持多页并发（maxPageConcurrency = 2）
4. 合并所有结果并批量保存到 PostgreSQL 数据库
5. 创建搜索记录（包含统计信息）
6. 返回统计信息

**数据库表结构**:

- **`pois` 表**：存储所有 POI 数据（包含经纬度、地址、类型等）
- **`search_records` 表**：存储搜索记录元数据（关键词、日期、总数、地区统计）
- **`search_tasks` 表**：存储搜索任务状态（可选）

**数据查询结构**:

```json
{
  "keyword": "关键词",
  "timestamp": "ISO 时间戳",
  "totalCount": 总数量,
  "regionBreakdown": [
    {"region": "省份", "count": 数量}
  ],
  "pois": [/* POI 对象数组 */]
}
```

### 3. 任务管理系统 (`service/task-manager.ts`)

**功能**:

- 创建、跟踪、更新任务状态
- 任务状态: `pending` → `running` → `completed` / `failed`
- 实时进度更新（百分比、已完成地区数）
- 自动清理旧任务（1小时前完成的任务）

**任务对象结构**:

```typescript
{
  id: string,
  keyword: string,
  status: 'pending' | 'running' | 'completed' | 'failed',
  progress: { current, total, percentage },
  regions: string[],
  totalResults: number,
  regionResults: Array<{region, count}>,
  startTime: number,
  endTime?: number,
  filePath?: string
}
```

### 4. 后端 API 服务 (`service/server.ts`)

**主要接口**:

#### POI 搜索

- `GET /api/poi/search` - 单次搜索（query 参数）
- `GET /api/poi/:keywords/:region` - 简化搜索（path 参数）

#### 批量搜索

- `POST /api/bulk-search` - 同步批量搜索（指定地区列表）
- `GET /api/bulk-search/:keywords` - 异步批量搜索（使用全部地区，返回任务ID）

#### 任务管理

- `GET /api/task/:taskId` - 查询任务进度
- `GET /api/tasks/keyword/:keywords` - 获取关键词的任务历史
- `GET /api/tasks/stats` - 任务统计信息

#### 数据获取

- `GET /api/saved-keywords` - 列出数据库中所有已保存的关键词
- `GET /api/saved-files/:keywords` - 列出关键词在数据库中的可用日期
- `GET /api/saved-pois/:keywords` - 从数据库获取最新日期的数据
- `GET /api/saved-pois/:keywords/:date` - 从数据库获取指定日期的数据

#### 其他

- `GET /api/regions` - 获取地区列表
- `GET /api/test/concurrent` - 并发测试接口
- `GET /health` - 健康检查

**响应格式**:

```typescript
{
  code: number,      // 200 成功, 400 参数错误, 404 未找到, 500 服务器错误
  data: any,         // 实际数据
  message: string    // 消息描述
}
```

### 5. 前端数据展示 (`src/views/DataView/`)

**功能**:

- 关键词选择（从已保存的文件中读取）
- 日期选择（支持多日期版本）
- 省份分布表格（按数量排序）
- 城市详情弹窗（点击省份查看该省各城市分布）

**数据流**:

1. 从数据库加载已保存的关键词列表
2. 选择关键词后从数据库加载可用日期
3. 选择日期后从数据库查询对应数据
4. 展示省份统计表格
5. 点击省份查看城市详情

**关键组件**:

- `ProvinceTable.vue`: 展示省份统计表格，支持点击查看详情
- `CityDetailsModal.vue`: 城市详情弹窗，展示选中省份的各城市分布

### 6. API 请求封装 (`src/api.ts`)

**特性**:

- 支持动态加载 `alova`（如果可用）
- 回退到原生 `fetch` API
- 统一的错误处理
- 可配置 API 基址（默认 `http://localhost:3000`）

**主要函数**:

- `setApiBase(url)`: 设置 API 基址
- `get(path)`: GET 请求（优先使用 alova，回退到 fetch）
- `getJson(url)`: 直接使用 fetch 请求外部 URL

## 配置文件

### `service/config.ts`

```typescript
{
  port: 3000,                    // 服务器端口
  amapKey: '...',                // 高德 API Key
  bulkSearch: {
    maxConcurrency: 1,           // 地区并发数
    delayMin: 1000,              // 延迟最小值（ms）
    delayMax: 1500,              // 延迟最大值（ms）
    maxPageConcurrency: 1,        // 页面并发数
    pageSize: 25                 // 每页 POI 数量
  },
  apiRetry: {
    retryCount: 3,               // 重试次数
    retryDelay: 1000             // 重试延迟（ms）
  }
}
```

## 开发指南

### 启动开发环境

```bash
# 安装依赖
pnpm install

# 启动前端开发服务器
pnpm dev

# 启动后端服务器（新终端）
pnpm dev:server
```

### 构建生产版本

```bash
# 类型检查 + 构建
pnpm build

# 仅构建
pnpm build-only

# 类型检查
pnpm type-check
```

### 代码质量

```bash
# ESLint 检查并修复
pnpm lint

# Prettier 格式化
pnpm format
```

## 关键设计决策

1. **并发控制**: 为避免触发高德 API 并发限制，使用多层并发控制：
   - 地区级别并发（maxConcurrency）
   - 页面级别并发（maxPageConcurrency）
   - 请求延迟（delayMin/Max）

2. **错误处理**:
   - 自动检测并发限制错误并重试
   - 网络错误自动重试
   - 任务失败状态跟踪

3. **数据存储**:
   - 使用 PostgreSQL 数据库存储（高性能、可扩展）
   - 数据按关键词和日期组织，支持多版本数据
   - 自动选择最新日期数据
   - 支持批量插入和索引优化
   - 提供数据迁移脚本（从 JSON 文件迁移）

4. **任务管理**:
   - 异步任务支持（不阻塞 HTTP 响应）
   - 实时进度更新
   - 任务历史记录

## 常见问题

### Q: 如何修改并发数和延迟？

A: 修改 `service/config.ts` 中的 `bulkSearch` 配置，或通过 API 请求参数传递。

### Q: 数据保存在哪里？

A: 数据存储在 PostgreSQL 数据库中。如果需要迁移现有的 JSON 文件，可以使用 `service/scripts/migrate-json-to-db.ts` 脚本。

### Q: 如何查看任务进度？

A: 调用 `GET /api/task/:taskId` 接口，或在前端实现轮询。

### Q: API 返回格式不一致？

A: 前端使用 `body?.data ?? body` 兼容处理，因为 alova 可能自动解包。

## 扩展建议

1. **数据爬取页面**: `DataRequest.vue` 目前是占位页面，可以添加：
   - 关键词输入
   - 地区选择（多选）
   - 并发参数配置
   - 任务创建和进度展示

2. **数据可视化**: 可以添加：
   - 地图热力图
   - 省份分布饼图
   - 时间趋势分析

3. **数据导出**: 支持导出为 Excel、CSV 等格式

4. **用户认证**: 如果需要多用户支持，可以添加登录系统

5. **数据导出**: 支持导出为 Excel、CSV 等格式

## 注意事项

1. **API Key 安全**: `service/config.ts` 中的高德 API Key 应该通过环境变量管理，不要提交到版本控制
2. **数据库配置**: 必须配置 `DATABASE_URL` 环境变量，服务启动时会自动测试连接
3. **并发限制**: 高德 API 有并发限制，需要合理设置并发数和延迟
4. **数据量**: 批量搜索可能产生大量数据，注意数据库存储空间和性能
5. **任务清理**: 任务管理器会自动清理 1 小时前的任务，如需保留更久可调整
6. **数据库迁移**: 首次使用需要运行 `npx prisma migrate dev` 创建数据库表

## 相关文档

- `service/docs/API.md`: 详细的 API 接口文档
- `service/docs/DATABASE.md`: 数据库迁移指南
- `README.md`: 项目基础说明
- `CONFIG.md`: 配置说明
- `TROUBLESHOOTING.md`: 故障排查指南

---

**最后更新**: 2025-12-08  
**维护者**: 项目开发团队
