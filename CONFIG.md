# 配置文件说明

本项目使用统一的配置文件管理高德地图 API Key 和其他配置项。

## 配置文件位置

### 前端配置

- **文件**: `src/config.ts`
- **用途**: 前端应用配置（高德地图 Key、API 地址等）

### 后端配置

- **文件**: `service/config.ts`
- **用途**: 后端服务配置（端口、高德地图 Key、并发参数等）

## 环境变量配置

### 创建环境变量文件

在项目根目录创建 `.env` 文件（开发环境）或 `.env.production`（生产环境）：

```bash
# 高德地图 API Key（前端）
VITE_AMAP_KEY=your_amap_key_here

# API 基础地址（前端）
VITE_API_BASE_URL=http://localhost:3000

# 高德地图 API Key（后端）
AMAP_KEY=your_amap_key_here

# 后端服务端口
PORT=3000

# PostgreSQL 数据库连接
DATABASE_URL=postgresql://用户名:密码@localhost:5432/map_search
```

### 环境变量说明

| 变量名              | 用途             | 默认值                             | 说明                                              |
| ------------------- | ---------------- | ---------------------------------- | ------------------------------------------------- |
| `VITE_AMAP_KEY`     | 前端高德地图 Key | 无（必须配置）                     | **Web 端（JS API）类型**，用于加载高德地图 JS API |
| `VITE_API_BASE_URL` | 前端 API 地址    | `http://localhost:3000`            | 后端 API 服务地址                                 |
| `AMAP_KEY`          | 后端高德地图 Key | 无（必须配置）                     | **Web 服务类型**，用于后端调用高德 REST API       |
| `PORT`              | 后端服务端口     | `3000`                             | Express 服务器端口                                |
| `DATABASE_URL`      | 数据库连接      | 无（必须配置）                     | PostgreSQL 数据库连接字符串                      |

## 使用方式

### 前端使用配置

```typescript
import { AMAP_KEY, API_BASE_URL, appConfig } from '@/config'

// 使用高德地图 Key
console.log(AMAP_KEY)

// 使用 API 地址
console.log(API_BASE_URL)

// 使用配置对象
console.log(appConfig.amapKey)
```

### 后端使用配置

```typescript
import { config } from './config.js'

// 使用高德地图 Key
console.log(config.amapKey)

// 使用端口
console.log(config.port)
```

## 获取高德地图 API Key

**重要**：高德地图有两种类型的 Key，不能混用！

### 前端 Key（Web 端 JS API）

1. 访问 [高德开放平台](https://console.amap.com/)
2. 注册/登录账号
3. 进入「应用管理」->「我的应用」
4. 创建新应用或使用现有应用
5. 添加 Key，**必须选择「Web 端（JS API）」**
6. 配置域名白名单（开发环境：`localhost`、`127.0.0.1`）
7. 将获取的 Key 配置到 `VITE_AMAP_KEY` 环境变量

### 后端 Key（Web Service API）

1. 在同一应用中，添加另一个 Key
2. **必须选择「Web 服务」类型**
3. 将获取的 Key 配置到 `AMAP_KEY` 环境变量

### 常见错误

- **USERKEY_PLAT_NOMATCH**：Key 类型不匹配
  - 前端必须使用「Web 端（JS API）」类型的 Key
  - 后端必须使用「Web 服务」类型的 Key
  - 两种 Key 不能混用！

详见 [故障排查指南](./TROUBLESHOOTING.md)

## 安全建议

1. **不要将 `.env` 文件提交到版本控制**
   - `.env` 已在 `.gitignore` 中（如果未添加，请手动添加）
   - 使用 `.env.example` 作为模板

2. **生产环境使用环境变量**
   - 不要在代码中硬编码 API Key
   - 使用 CI/CD 平台的环境变量配置

3. **不同环境使用不同的 Key**
   - 开发环境：使用测试 Key
   - 生产环境：使用正式 Key，并配置域名白名单

## 配置优先级

### 前端

1. 环境变量 `VITE_AMAP_KEY`
2. `src/config.ts` 中的默认值

### 后端

1. 环境变量 `AMAP_KEY`
2. `service/config.ts` 中的默认值

## 示例

### 开发环境 (.env)

```bash
# 前端：Web 端（JS API）Key
VITE_AMAP_KEY=your_web_js_api_key_here

# 后端：Web 服务 Key（可以与前端不同）
AMAP_KEY=your_web_service_key_here

VITE_API_BASE_URL=http://localhost:3000
PORT=3000
```

### 生产环境 (.env.production)

```bash
# 前端：Web 端（JS API）Key（需配置域名白名单）
VITE_AMAP_KEY=your_prod_web_js_api_key_here

# 后端：Web 服务 Key
AMAP_KEY=your_prod_web_service_key_here

VITE_API_BASE_URL=https://api.example.com
PORT=3000

# PostgreSQL 数据库连接（生产环境）
DATABASE_URL=postgresql://user:password@db.example.com:5432/map_search
```

**注意**：
- 前端和后端的 Key 可以是不同的，因为它们类型不同！
- 数据库连接字符串格式：`postgresql://用户名:密码@主机:端口/数据库名`

## 数据库配置

### PostgreSQL 连接字符串格式

```
postgresql://用户名:密码@主机:端口/数据库名
```

示例：
- 本地开发：`postgresql://postgres:password@localhost:5432/map_search`
- 远程服务器：`postgresql://user:pass@db.example.com:5432/map_search`

### 数据库初始化

1. **创建数据库**：
   ```bash
   createdb map_search
   ```

2. **运行迁移**：
   ```bash
   npx prisma migrate dev --name init
   ```

详细说明请查看 [数据库迁移指南](./service/docs/DATABASE.md)

## 注意事项

- 修改环境变量后需要重启开发服务器
- Vite 的环境变量必须以 `VITE_` 开头才能在前端使用
- 后端环境变量不需要前缀，直接使用变量名
- **数据库连接是必需的**，服务启动时会自动测试连接，失败则无法启动
