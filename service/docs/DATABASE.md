# 数据库迁移指南

## 概述

项目已从 JSON 文件存储迁移到 PostgreSQL 数据库存储。

## 数据库文件存储说明

### 项目中的数据库相关文件

项目中的数据库相关代码和配置文件存储在以下位置：

```
map-search/
├── service/src/
│   └── db.ts              # 数据库连接和 Prisma Client 初始化
├── prisma/
│   └── schema.prisma      # 数据库 Schema 定义（表结构）
└── prisma.config.ts       # Prisma 配置文件
```

**说明**：

- `service/src/db.ts`：数据库连接逻辑，使用 Prisma Client
- `prisma/schema.prisma`：定义数据库表结构（POI 表、搜索记录表等）
- `prisma.config.ts`：Prisma 配置，包含数据库连接 URL

### PostgreSQL 数据文件存储位置

**重要**：PostgreSQL 数据库的数据文件**不存储在项目目录内**，而是存储在 PostgreSQL 的数据目录中：

#### macOS (Homebrew)

```
/opt/homebrew/var/postgresql@15/     # PostgreSQL 15
/usr/local/var/postgresql@15/       # Intel Mac
```

#### Linux

```
/var/lib/postgresql/{version}/main/  # 默认数据目录
```

#### Windows

```
C:\Program Files\PostgreSQL\{version}\data\
```

**查看数据目录**：

```bash
# 连接到 PostgreSQL
psql -U postgres

# 查看数据目录
SHOW data_directory;
```

### 为什么数据文件不在项目内？

1. **数据安全**：数据库文件包含敏感数据，不应提交到版本控制
2. **性能**：PostgreSQL 需要特定的文件系统权限和配置
3. **可移植性**：通过连接字符串连接数据库，便于在不同环境部署
4. **备份管理**：数据库备份应该单独管理，而不是作为项目文件

### 如果需要将数据库文件存储在项目内

如果需要在项目内存储数据库文件（例如使用 SQLite），需要：

1. **修改 Prisma Schema**：

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./data/database.db"
}
```

2. **创建数据目录**：

```bash
mkdir -p prisma/data
```

3. **更新 .gitignore**：

```
# 数据库文件
prisma/data/*.db
prisma/data/*.db-journal
```

4. **更新连接代码**：SQLite 不需要适配器，可以直接使用 Prisma Client

**注意**：当前项目使用 PostgreSQL，数据文件存储在 PostgreSQL 数据目录中，通过 `DATABASE_URL` 环境变量连接。

## 数据库配置

### 1. 安装 PostgreSQL

确保已安装 PostgreSQL 数据库（建议版本 12+）。

#### macOS 安装

```bash
# 使用 Homebrew 安装
brew install postgresql@15

# 启动 PostgreSQL 服务
brew services start postgresql@15

# 验证安装
psql --version
```

#### Ubuntu/Debian 安装

```bash
# 更新包列表
sudo apt update

# 安装 PostgreSQL
sudo apt install postgresql postgresql-contrib

# 启动 PostgreSQL 服务
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 验证安装
psql --version
```

#### Windows 安装

1. 访问 [PostgreSQL 官网](https://www.postgresql.org/download/windows/)
2. 下载 Windows 安装程序
3. 运行安装程序，按提示完成安装
4. 安装完成后，PostgreSQL 服务会自动启动

#### 验证安装

```bash
# 检查 PostgreSQL 服务状态
# macOS
brew services list | grep postgresql

# Linux
sudo systemctl status postgresql

# Windows (在 PowerShell 中)
Get-Service postgresql*
```

#### 安装 Node.js pg 库

项目的 `pg` 库（PostgreSQL 客户端）和 `@prisma/adapter-pg` 已包含在依赖中，运行以下命令安装：

```bash
pnpm install
```

如果单独安装：

```bash
pnpm add pg @prisma/adapter-pg
```

### 2. 配置环境变量

在 `.env` 文件中添加数据库连接字符串：

```env
DATABASE_URL=postgresql://用户名:密码@主机:端口/数据库名
```

示例：

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/map_search
```

### 3. 创建数据库

```bash
# 使用 psql 创建数据库
createdb map_search

# 或使用 SQL
psql -U postgres
CREATE DATABASE map_search;
```

### 4. 运行数据库迁移

```bash
# 生成迁移文件
npx prisma migrate dev --name init

# 或直接应用 schema（如果数据库已存在）
npx prisma db push
```

## 数据库 Schema

### POI 表 (pois)

存储所有 POI 数据：

- `id`: 主键（CUID）
- `amapId`: 高德地图 POI ID
- `keyword`: 搜索关键词
- `searchDate`: 搜索日期
- `name`: POI 名称
- `location`: 经纬度字符串 "经度,纬度"
- `longitude`, `latitude`: 经纬度数值（用于地理查询）
- `pname`, `cityname`: 省份名和城市名
- `extraData`: 其他扩展字段（JSON格式）

### 搜索记录表 (search_records)

记录每次搜索的元数据：

- `id`: 主键
- `keyword`: 搜索关键词
- `searchDate`: 搜索日期
- `totalCount`: 总 POI 数
- `regionBreakdown`: 按省份统计（JSON格式）

### 搜索任务表 (search_tasks)

记录搜索任务状态（可选，用于任务管理）：

- `id`: 主键
- `keyword`: 搜索关键词
- `status`: 任务状态
- `regions`: 城市列表
- `totalResults`: 总结果数

## 数据迁移（从 JSON 文件）

如果需要迁移现有的 JSON 文件数据到数据库，可以使用提供的迁移脚本：

```bash
# 运行迁移脚本
pnpm tsx service/scripts/migrate-json-to-db.ts
```

脚本会自动：

1. 扫描 `public/poi-data/` 目录下的所有 JSON 文件
2. 解析文件名获取关键词和日期
3. 批量插入 POI 数据到数据库（每批 1000 条）
4. 创建对应的搜索记录
5. 跳过已存在的数据（基于关键词+日期唯一约束）

## 常用命令

```bash
# 生成 Prisma Client
npx prisma generate

# 查看数据库
npx prisma studio

# 重置数据库（开发环境）
npx prisma migrate reset

# 查看迁移状态
npx prisma migrate status
```

## 注意事项

1. **数据备份**：在生产环境迁移前，请先备份现有数据
2. **性能优化**：大量数据插入时使用批量操作（已实现）
3. **索引**：已为常用查询字段创建索引
4. **唯一性**：`SearchRecord` 的 `keyword + searchDate` 组合是唯一的
5. **数据文件位置**：PostgreSQL 数据文件存储在系统目录，不在项目内
6. **版本控制**：数据库文件不应提交到 Git，只提交 Schema 定义
