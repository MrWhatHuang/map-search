# 故障排查指南

## 高德地图 API Key 错误

### 错误：USERKEY_PLAT_NOMATCH

**错误原因**：

- API Key 的平台类型不匹配
- 使用了服务端 Key 加载前端地图，或使用了前端 Key 调用服务端 API

**解决方案**：

#### 1. 检查 Key 类型

高德地图有两种类型的 Key：

- **Web 端（JS API）Key**：用于前端加载地图
  - 用途：`index.html` 中加载地图 JS API
  - 配置位置：`VITE_AMAP_KEY` 环境变量或 `src/config.ts`
- **服务端（Web Service API）Key**：用于后端调用 REST API
  - 用途：后端调用高德地图 REST API（如 POI 搜索）
  - 配置位置：`AMAP_KEY` 环境变量或 `service/config.ts`

#### 2. 创建正确的 Key

1. 访问 [高德开放平台](https://console.amap.com/)
2. 进入「应用管理」->「我的应用」
3. 创建两个 Key：
   - **前端 Key**：选择「Web 端（JS API）」
   - **后端 Key**：选择「Web 服务」

#### 3. 配置环境变量

创建 `.env` 文件：

```bash
# 前端 Web 端（JS API）Key
VITE_AMAP_KEY=your_web_js_api_key_here

# 后端 Web Service API Key
AMAP_KEY=your_web_service_api_key_here
```

#### 4. 配置域名白名单

在高德开放平台配置 Key 时，需要设置域名白名单：

- **前端 Key**：
  - 开发环境：`localhost`、`127.0.0.1`
  - 生产环境：你的域名（如 `example.com`）

- **后端 Key**：
  - 通常不需要设置域名白名单（服务端调用）

#### 5. 验证配置

1. 检查浏览器控制台是否有 Key 相关错误
2. 检查网络请求中 Key 是否正确传递
3. 确认使用的是正确的 Key 类型

### 其他常见错误

#### INVALID_USER_KEY

- Key 不存在或已删除
- 检查 Key 是否正确配置

#### DAILY_QUERY_OVER_LIMIT

- 超出每日调用量限制
- 检查高德开放平台的配额

#### USERKEY_PLAT_NOMATCH

- Key 平台类型不匹配（见上文）

## 地图不显示

### 可能原因

1. **API Key 错误**（见上文）
2. **网络问题**：无法加载高德地图 JS API
3. **容器高度未设置**：地图容器必须有明确的高度
4. **脚本加载顺序**：确保高德地图 API 在组件初始化前加载完成

### 排查步骤

1. 打开浏览器开发者工具
2. 检查 Network 标签，确认高德地图 API 是否加载成功
3. 检查 Console 标签，查看是否有错误信息
4. 检查地图容器是否有高度样式

## 后端 API 调用失败

### 可能原因

1. **Key 类型错误**：使用了前端 Key 调用后端 API
2. **Key 配置错误**：环境变量未正确读取
3. **网络问题**：无法访问高德地图 API 服务器

### 排查步骤

1. 检查 `service/config.ts` 中的 Key 配置
2. 检查环境变量 `AMAP_KEY` 是否正确设置
3. 查看后端日志，确认 API 调用详情
