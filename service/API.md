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
  - 描述：按关键词 + 行政区分页搜索（调用高德 API）。
  - 查询参数：
    - `keywords` (string) 必需
    - `region` (string) 必需
    - `pageSize` (number, 可选, 默认 25)
    - `pageNum` (number, 可选, 默认 1)
    - `key` (string, 可选，高德 key)
  - 返回：`{ code:200, data: <高德接口原始结果>, message: '成功' }`

- `GET /api/poi/:keywords/:region`
  - 描述：简化单次搜索（path 参数形式）。
  - Path 参数：`keywords`, `region`。可选 query `pageNum`。
  - 返回：同上。

- `GET /api/regions`
  - 描述：返回内置地区列表（来源 `service/regions.json`）。
  - 返回：`{ code:200, data: string[], message: '成功' }`

- `POST /api/bulk-search`
  - 描述：启动按关键词对全部地区批量搜索（同步接口，会在返回时给出概要，具体搜索会并发执行）。
  - Body：
    - `keywords` (string) 必需
    - `regions` (string[]) 必需
    - `maxConcurrency` (number, 可选)
    - `delayMin`/`delayMax` (ms, 可选)
  - 返回 data 示例：
    ```json
    {
      "keyword": "古茗",
      "totalResults": 12345,
      "filePath": "/.../古茗_2025-12-05.json",
      "delayRange": "10ms - 100ms",
      "regionSummary": [{"region":"江苏省","count":123}, ...]
    }
    ```

- `GET /api/bulk-search/:keywords`
  - 描述：快速触发后台异步批量搜索，使用内置全部地区（返回任务ID）。
  - Query 可选：`maxConcurrency`, `delayMin`, `delayMax`。
  - 返回 data 示例：`{ taskId, keyword, message, delayRange }`。

- `GET /api/task/:taskId`
  - 描述：查询任务进度与状态（由 `task-manager` 管理）。
  - 返回：`{ code:200, data: <task object>, message: '成功' }`

- `GET /api/tasks/keyword/:keywords`
  - 描述：获取某关键词对应的任务历史列表。

- `GET /api/tasks/stats`
  - 描述：获取任务管理器的统计信息。

- `GET /api/saved-keywords`
  - 描述：列出 `public/poi-data` 中所有已保存的文件名（去掉后缀）。
  - 返回：`{ code:200, data: string[], message: '成功' }`（例如：`["古茗_2025-12-05","哪吒仙饮_2025-12-05"]`）

- `GET /api/saved-files/:keywords`
  - 描述：列出某关键词可用的日期文件（返回 `YYYY-MM-DD` 数组，按降序排序，最新在前）。
  - 返回：`{ code:200, data: string[], message: '成功' }`

- `GET /api/saved-pois/:keywords`
  - 描述：读取某关键词最新的已保存数据（自动选取目录中最新的文件）。
  - 返回 data：保存文件的完整内容，结构示例见下。

- `GET /api/saved-pois/:keywords/:date`
  - 描述：按指定日期读取保存文件（`date` 格式 `YYYY-MM-DD`）。
  - 返回：`{ code:200, data: <fileContent>, message: '成功' }`。

- `GET /api/test/concurrent`
  - 描述：用于测试并发请求高德API的能力（调试用）。
  - Query：`keywords` (string), `region` (string), `count` (number)

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

- 参数错误或资源未找到会返回相应 HTTP 状态（如 `400`, `404`）与 envelope：`{ code, message }`。
- 服务内部错误会返回 `500` 并带 `message` 描述。

**前端注意事项**

- `service` 返回的 envelope 为 `{ code, data, message }`，但客户端封装 `src/api.ts` 在启用了 alova 时可能返回已解包的 `data`。前端在解析接口返回值时应使用 `body?.data ?? body` 的兼容写法（该项目中的 `DataView.vue` 已适配）。
- `el-date-picker` 与保存文件命名使用 `YYYY-MM-DD`，前端在请求 `/api/saved-pois/:keywords/:date` 时请使用该格式。

---

如果你希望我把这份文档转为 README 或将接口示例请求直接附到前端页面调试工具中（例如 POSTMAN/HTTPie 导出），我可以继续帮你生成样例请求集合。
