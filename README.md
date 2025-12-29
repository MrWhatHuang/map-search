# Map-Search - POI 数据管理系统

基于高德地图 API 的 POI（兴趣点）批量搜索、数据采集和可视化展示系统。

## 功能特性

- 🔍 **批量搜索**: 支持按关键词在全国各地区批量搜索 POI 数据
- 📊 **数据展示**: 表格和地图两种视图方式展示数据分布
- 🗺️ **地图可视化**: 在地图上直观展示 POI 点分布
- 📈 **统计分析**: 按省份、城市进行数据统计和分析
- ⚡ **异步任务**: 支持后台异步批量搜索，实时查看进度

## 技术栈

- **前端**: Vue 3 + TypeScript + Element Plus + ECharts
- **后端**: Node.js + Express + TypeScript
- **数据库**: PostgreSQL + Prisma ORM
- **地图**: 高德地图 JS API

## 快速开始

### 1. 安装依赖

```sh
pnpm install
```

### 2. 配置环境变量

**重要**: 项目需要配置高德地图 API Key 才能正常运行。

1. 复制环境变量示例文件：

```sh
cp .env.example .env
```

2. 编辑 `.env` 文件，将 `xxxx` 替换为你的实际配置：

```bash
# 前端：Web 端（JS API）Key
VITE_AMAP_KEY=你的前端Key

# 后端：Web 服务 Key
AMAP_KEY=你的后端Key

# PostgreSQL 数据库连接
DATABASE_URL=postgresql://用户名:密码@localhost:5432/map_search
```

**获取 API Key**:

1. 访问 [高德开放平台](https://console.amap.com/dev/key/app)
2. 注册/登录账号
3. 创建应用并添加 Key：
   - **前端 Key**: 选择「Web 端（JS API）」类型
   - **后端 Key**: 选择「Web 服务」类型
4. 配置域名白名单（前端 Key 需要配置 `localhost` 和 `127.0.0.1`）

> ⚠️ **注意**: 前端和后端需要使用不同类型的 Key，不能混用！详见 [配置说明](./CONFIG.md)

### 3. 配置数据库

**重要**: 项目使用 PostgreSQL 数据库存储数据，需要先配置数据库。

1. **安装 PostgreSQL**（如果未安装）：
   ```bash
   # macOS
   brew install postgresql
   
   # Ubuntu/Debian
   sudo apt-get install postgresql
   ```

2. **创建数据库**：
   ```bash
   createdb map_search
   ```

3. **运行数据库迁移**：
   ```bash
   npx prisma migrate dev --name init
   # 或
   npx prisma db push
   ```

详细说明请查看 [数据库迁移指南](./service/docs/DATABASE.md)

### 4. 启动服务

**启动前端开发服务器**:

```sh
pnpm dev
```

**启动后端服务器**（新终端窗口）:

```sh
pnpm dev:server
```

访问 http://localhost:5173 查看应用。

## 项目结构

```
map-search/
├── service/              # 后端服务代码
│   ├── src/              # 核心业务代码
│   │   ├── server.ts    # Express 服务器
│   │   ├── amap.ts      # 高德地图 API 封装
│   │   ├── bulk-search.ts # 批量搜索逻辑
│   │   ├── db.ts        # 数据库连接
│   │   └── config.ts    # 后端配置
│   ├── data/            # 数据文件
│   ├── scripts/         # 工具脚本
│   └── docs/            # 文档
├── prisma/              # Prisma 配置
│   └── schema.prisma    # 数据库 Schema
├── src/                 # 前端源代码
│   ├── views/           # 页面组件
│   ├── components/      # 通用组件
│   └── config.ts        # 前端配置
├── .env.example         # 环境变量示例文件
└── README.md           # 项目说明
```

## 开发命令

```sh
# 开发模式（前端）
pnpm dev

# 开发模式（后端）
pnpm dev:server

# 构建生产版本
pnpm build

# 类型检查
pnpm type-check

# 代码检查
pnpm lint

# 代码格式化
pnpm format
```

## 配置说明

详细配置说明请查看 [CONFIG.md](./CONFIG.md)

## 故障排查

遇到问题？请查看 [故障排查指南](./TROUBLESHOOTING.md)

## 相关文档

- [API 接口文档](./service/docs/API.md)
- [数据库迁移指南](./service/docs/DATABASE.md)
- [配置说明](./CONFIG.md)
- [故障排查指南](./TROUBLESHOOTING.md)
- [AI 项目描述文档](./docs/AI_DESCRIPTION.md)

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
pnpm install
```

### Compile and Hot-Reload for Development

```sh
pnpm dev
```

### Type-Check, Compile and Minify for Production

```sh
pnpm build
```

### Lint with [ESLint](https://eslint.org/)

```sh
pnpm lint
```
