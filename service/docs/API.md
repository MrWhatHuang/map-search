# 服务 API 文档

本文档记录项目内部后端（位于 `service/server.ts`）提供的 HTTP 接口，主要用于前端调用与调试。

**说明**

- 服务器默认基址：`http://localhost:3000`
- 大部分接口返回一个 envelope：`{ code: number, data: any, message: string }`。在部分客户端封装（如 alova）中可能直接返回 `data`，前端需兼容两种形式。
- 数据文件位于项目：`public/poi-data`，保存格式为 `关键词_YYYY-MM-DD.json`。

---

**接口总览**

- `GET /health`
  - 描述：健康检查。
  - 返回：`{ code: 200, data: { status: 'ok', timestamp: string }, message: '成功' }`

- `GET /api/poi/search`
  - 描述：按关键词 + 城市分页搜索（调用高德 API）。
  - 查询参数：
    - `keywords` (string) 必需
    - `region` (string) 必需，**必须是城市级别**（如："南京市"），不能是省份（如："江苏省"）
    - `pageSize` (number, 可选, 默认 25)
    - `pageNum` (number, 可选, 默认 1)
    - `key` (string, 可选，高德 key)
  - 返回：`{ code:200, data: <高德接口原始结果>, message: '成功' }`

- `GET /api/poi/:keywords/:region`
  - 描述：简化单次搜索（path 参数形式）。
  - Path 参数：`keywords`, `region`（**必须是城市级别**）。可选 query `pageNum`。
  - 返回：同上。

- `GET /api/regions`
  - 描述：返回内置省份列表（来源 `service/regions.json`）。
  - 返回：`{ code:200, data: string[], message: '成功' }`

- `GET /api/cities`
  - 描述：返回所有城市列表（来源 `service/cities.json`）。
  - 返回：`{ code:200, data: string[], message: '成功' }`

- `GET /api/province-cities`
  - 描述：返回省份到城市的映射关系。
  - 返回：`{ code:200, data: Record<string, string[]>, message: '成功' }`

- `POST /api/bulk-search`
  - 描述：启动按关键词对指定城市批量搜索（**异步接口**，立即返回任务ID，搜索在后台执行）。
  - Body：
    - `keywords` (string) 必需
    - `regions` (string[]) 必需，**支持省份或城市**（省份会自动转换为城市列表，普通省份本身会被过滤，只保留地级市）
    - `maxConcurrency` (number, 可选，默认值见配置)
    - `delayMin` (number, 可选，默认值见配置，单位：毫秒)
    - `delayMax` (number, 可选，默认值见配置，单位：毫秒)
  - 返回 data 示例：
    ```json
    {
      "taskId": "task_xxx",
      "keyword": "古茗",
      "message": "任务已创建，正在后台运行",
      "delayRange": "1000ms - 1500ms",
      "totalCities": 367
    }
    ```
  - 注意：使用 `GET /api/task/:taskId` 查询任务进度和结果

- `GET /api/bulk-search/:keywords`
  - 描述：快速触发后台异步批量搜索，使用全部城市（自动从省份转换，返回任务ID）。
  - Query 可选：`maxConcurrency`, `delayMin`, `delayMax`。
  - 返回 data 示例：`{ taskId, keyword, message, delayRange, totalCities }`。

- `GET /api/task/:taskId`
  - 描述：查询任务进度与状态（由 `task-manager` 管理）。
  - 返回 data 示例：
    ```json
    {
      "id": "task_xxx",
      "keyword": "古茗",
      "status": "running" | "completed" | "failed" | "pending",
      "regions": ["南京市", "苏州市", ...],
      "progress": {
        "current": 50,
        "total": 367,
        "percentage": 13.6
      },
      "startTime": 1234567890,
      "endTime": null,
      "filePath": "/path/to/file.json",
      "totalResults": 12345,
      "regionResults": [
        {"region": "南京市", "total": 456},
        ...
      ],
      "error": null
    }
    ```
  - 状态说明：
    - `pending`: 等待中
    - `running`: 运行中
    - `completed`: 已完成
    - `failed`: 失败

- `GET /api/tasks/keyword/:keywords`
  - 描述：获取某关键词对应的任务历史列表。
  - 返回：`{ code:200, data: <task object[]>, message: '成功' }`
  - 返回的数组按时间倒序排列（最新的在前）

- `GET /api/tasks/stats`
  - 描述：获取任务管理器的统计信息。
  - 返回 data 示例：
    ```json
    {
      "total": 10,
      "pending": 0,
      "running": 2,
      "completed": 7,
      "failed": 1
    }
    ```

- `GET /api/saved-keywords`
  - 描述：列出 `public/poi-data` 中所有已保存的文件名（去掉后缀）。
  - 返回：`{ code:200, data: string[], message: '成功' }`（例如：`["古茗_2025-12-05","哪吒仙饮_2025-12-05"]`）

- `GET /api/saved-files/:keywords`
  - 描述：列出某关键词可用的日期文件（返回 `YYYY-MM-DD` 数组，按降序排序，最新在前）。
  - 返回：`{ code:200, data: string[], message: '成功' }`

- `GET /api/saved-pois/:keywords`
  - 描述：读取某关键词最新的已保存数据（自动选取目录中最新的文件）。
  - 返回 data：保存文件的完整内容，结构示例见下。
  - **重要**：如果数据中的 `regionBreakdown` 包含城市级别数据，会自动转换为省份级别（只保留省/直辖市）。

- `GET /api/saved-pois/:keywords/:date`
  - 描述：按指定日期读取保存文件（`date` 格式 `YYYY-MM-DD`）。
  - 返回：`{ code:200, data: <fileContent>, message: '成功' }`。
  - **重要**：如果数据中的 `regionBreakdown` 包含城市级别数据，会自动转换为省份级别（只保留省/直辖市）。
  - 如果文件不存在，返回 `404`。

- `GET /api/test/concurrent`
  - 描述：用于测试并发请求高德API的能力（调试用）。
  - Query 参数：
    - `keywords` (string, 可选, 默认 "古茗")
    - `region` (string, 可选, 默认 "南京市")，**必须是城市级别**
    - `count` (number, 可选, 默认 5, 范围 1-50)
  - 返回 data 示例：
    ```json
    {
      "concurrentCount": 5,
      "duration": "1234ms",
      "successful": 5,
      "failed": 0,
      "results": [
        {
          "index": 1,
          "status": "success",
          "code": "1",
          "info": "OK",
          "count": "25",
          "poiCount": 25,
          "message": "OK"
        },
        ...
      ],
      "summary": {
        "keyword": "古茗",
        "region": "南京市",
        "totalRequests": 5,
        "successfulRequests": 5,
        "failedRequests": 0,
        "averageTime": "246.80ms per request"
      }
    }
    ```

---

**保存文件（数据）结构说明**

批量搜索保存到 `public/poi-data/关键词_YYYY-MM-DD.json`，文件中 JSON 的主要字段示例：

```json
{
  "keyword": "古茗",
  "timestamp": "2025-12-05T08:00:00.000Z",
  "totalCount": 1234,
  "regionBreakdown": [
    {"region": "江苏省", "count": 456},
    {"region": "浙江省", "count": 300}
  ],
  "pois": [
    {"id": "...", "name": "门店A", "type": "餐饮", ...},
    ...
  ]
}
```

- `keyword`：关键词字符串
- `timestamp`：文件生成时间（ISO 字符串）
- `totalCount`：合计 POI 数量
- `regionBreakdown`：按地区汇总，用于前端展示柱状图（字段 `region`, `count`）
- `pois`：完整 POI 列表

---

**错误与状态码**

- `200`: 成功
- `400`: 参数错误（如缺少必需参数、参数格式错误、参数值超出范围）
  - 示例：`{ code: 400, message: '缺少必要参数: keywords 和 region' }`
- `404`: 资源未找到（如任务不存在、文件不存在）
  - 示例：`{ code: 404, message: '任务未找到' }`
- `500`: 服务内部错误
  - 示例：`{ code: 500, message: '内部服务器错误', error: '详细错误信息' }`

**重要说明**

1. **region 参数限制**：
   - 高德API的 `region` 参数**只支持城市级别**，不支持省份级别
   - 例如：可以使用"南京市"，不能使用"江苏省"
   - 直辖市（如"北京市"、"上海市"）可以直接使用，因为本身就是城市级别

2. **省份自动转换**：
   - 在 `POST /api/bulk-search` 中，如果传入省份（如"江苏省"），会自动转换为该省份下的所有地级市
   - 普通省份本身会被过滤掉（因为不是城市级别），只保留地级市
   - 直辖市会被保留（因为本身就是城市级别）

3. **regionBreakdown 自动转换**：
   - `GET /api/saved-pois/:keywords` 和 `GET /api/saved-pois/:keywords/:date` 接口会自动检测并转换 `regionBreakdown`
   - 如果数据中包含城市级别统计，会自动聚合为省份级别统计
   - 只保留省/直辖市，过滤掉无法转换的城市

**前端注意事项**

- `service` 返回的 envelope 为 `{ code, data, message }`，但客户端封装 `src/api.ts` 在启用了 alova 时可能返回已解包的 `data`。前端在解析接口返回值时应使用 `body?.data ?? body` 的兼容写法（该项目中的 `DataView.vue` 已适配）。
- `el-date-picker` 与保存文件命名使用 `YYYY-MM-DD`，前端在请求 `/api/saved-pois/:keywords/:date` 时请使用该格式。
- 批量搜索接口（`POST /api/bulk-search` 和 `GET /api/bulk-search/:keywords`）是异步的，需要轮询 `GET /api/task/:taskId` 来获取任务进度和结果。

**请求示例**

```bash
# 健康检查
curl http://localhost:3000/health

# 单次搜索
curl "http://localhost:3000/api/poi/search?keywords=古茗&region=南京市&pageSize=25&pageNum=1"

# 批量搜索（异步）
curl -X POST http://localhost:3000/api/bulk-search \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": "古茗",
    "regions": ["江苏省", "浙江省"],
    "maxConcurrency": 2,
    "delayMin": 1000,
    "delayMax": 1500
  }'

# 查询任务进度
curl http://localhost:3000/api/task/task_xxx

# 获取已保存的数据
curl http://localhost:3000/api/saved-pois/古茗
curl http://localhost:3000/api/saved-pois/古茗/2025-12-08
```

---

如果你希望我把这份文档转为 README 或将接口示例请求直接附到前端页面调试工具中（例如 POSTMAN/HTTPie 导出），我可以继续帮你生成样例请求集合。
