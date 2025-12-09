# Service 目录结构说明

## 目录组织

```
service/
├── src/                    # 核心业务代码
│   ├── server.ts          # Express 服务器主文件
│   ├── amap.ts            # 高德地图 API 封装
│   ├── bulk-search.ts     # 批量搜索逻辑
│   ├── task-manager.ts    # 任务管理器
│   └── config.ts          # 配置管理
├── data/                   # 数据文件
│   ├── regions.json       # 省份列表
│   ├── cities.json        # 城市列表
│   ├── cities-detail.json # 城市详细信息
│   └── province-to-cities.json  # 省份到城市映射
├── scripts/                # 工具脚本
│   ├── convert-regions.ts      # 转换 Excel 到 JSON
│   ├── generate-city-mapping.ts # 生成城市映射
│   └── province-to-cities.ts   # 生成省份到城市映射
├── docs/                   # 文档
│   └── API.md             # API 接口文档
└── AMap_adcode_citycode.xlsx  # 高德官方城市编码 Excel 源文件
```

## 运行说明

### 启动服务器

```bash
pnpm dev:server
```

### 运行工具脚本

```bash
# 转换 Excel 文件
pnpm tsx service/scripts/convert-regions.ts

# 生成城市映射
pnpm tsx service/scripts/generate-city-mapping.ts

# 生成省份到城市映射
pnpm tsx service/scripts/province-to-cities.ts
```

## 文件说明

### 核心业务代码 (src/)

- **server.ts**: Express 服务器，定义所有 API 路由
- **amap.ts**: 高德地图 API 封装，处理 POI 搜索请求
- **bulk-search.ts**: 批量搜索逻辑，支持并发控制和任务管理
- **task-manager.ts**: 任务管理器，跟踪搜索任务状态
- **config.ts**: 配置管理，读取环境变量和默认配置

### 数据文件 (data/)

- **regions.json**: 34 个省/直辖市/自治区列表
- **cities.json**: 所有城市列表（367 个城市）
- **cities-detail.json**: 城市详细信息（包含 adcode、citycode 等）
- **province-to-cities.json**: 省份到城市的映射关系

### 工具脚本 (scripts/)

- **convert-regions.ts**: 从 Excel 文件提取城市数据
- **generate-city-mapping.ts**: 根据 adcode 规则生成省份到城市映射
- **province-to-cities.ts**: 从 cities-detail.json 生成省份到城市映射

## 注意事项

1. 所有数据文件位于 `data/` 目录，脚本生成的数据会自动保存到该目录
2. Excel 源文件 `AMap_adcode_citycode.xlsx` 位于 service 根目录
3. API 文档位于 `docs/API.md`
4. 服务器启动脚本路径已更新为 `service/src/server.ts`
