/**
 * 数据库连接和 Prisma Client 初始化
 */
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

// 创建 PostgreSQL 连接池
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL 环境变量未配置')
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

// 全局单例模式，避免在开发环境中创建多个 Prisma Client 实例
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// 优雅关闭
process.on('beforeExit', async () => {
  await prisma.$disconnect()
  await pool.end()
})
