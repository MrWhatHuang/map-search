import { EventEmitter } from 'events'

export interface Task {
    id: string
    keyword: string
    status: 'pending' | 'running' | 'completed' | 'failed'
    progress: {
        current: number
        total: number
        percentage: number
    }
    regions: string[]
    totalResults: number
    error?: string
    startTime: number
    endTime?: number
    filePath?: string
    regionResults: Array<{
        region: string
        count: number
    }>
}

class TaskManager extends EventEmitter {
    private tasks: Map<string, Task> = new Map()

    /**
     * 创建新任务
     */
    createTask(keyword: string, regions: string[]): string {
        const id = `${keyword}-${Date.now()}`
        const task: Task = {
            id,
            keyword,
            status: 'pending',
            progress: {
                current: 0,
                total: regions.length,
                percentage: 0
            },
            regions,
            totalResults: 0,
            startTime: Date.now(),
            regionResults: []
        }
        this.tasks.set(id, task)
        return id
    }

    /**
     * 获取任务状态
     */
    getTask(id: string): Task | undefined {
        return this.tasks.get(id)
    }

    /**
     * 获取关键词的所有任务
     */
    getTasksByKeyword(keyword: string): Task[] {
        return Array.from(this.tasks.values()).filter(t => t.keyword === keyword)
    }

    /**
     * 启动任务
     */
    startTask(id: string): void {
        const task = this.tasks.get(id)
        if (task) {
            task.status = 'running'
            this.emit('task:start', task)
        }
    }

    /**
     * 更新任务进度
     */
    updateProgress(id: string, current: number, regionResult?: { region: string; count: number }): void {
        const task = this.tasks.get(id)
        if (task) {
            task.progress.current = current
            task.progress.percentage = Math.round((current / task.progress.total) * 100)
            task.totalResults += regionResult?.count || 0

            if (regionResult) {
                task.regionResults.push(regionResult)
            }

            this.emit('task:progress', task)
        }
    }

    /**
     * 完成任务
     */
    completeTask(id: string, filePath: string): void {
        const task = this.tasks.get(id)
        if (task) {
            task.status = 'completed'
            task.endTime = Date.now()
            task.filePath = filePath
            this.emit('task:complete', task)
        }
    }

    /**
     * 任务失败
     */
    failTask(id: string, error: string): void {
        const task = this.tasks.get(id)
        if (task) {
            task.status = 'failed'
            task.error = error
            task.endTime = Date.now()
            this.emit('task:fail', task)
        }
    }

    /**
     * 清理旧任务（保留最近1小时的任务）
     */
    cleanup(): void {
        const now = Date.now()
        const oneHourAgo = now - 60 * 60 * 1000

        for (const [id, task] of this.tasks.entries()) {
            if (task.endTime && task.endTime < oneHourAgo) {
                this.tasks.delete(id)
            }
        }
    }

    /**
     * 获取所有任务统计
     */
    getStats() {
        const tasks = Array.from(this.tasks.values())
        return {
            total: tasks.length,
            pending: tasks.filter(t => t.status === 'pending').length,
            running: tasks.filter(t => t.status === 'running').length,
            completed: tasks.filter(t => t.status === 'completed').length,
            failed: tasks.filter(t => t.status === 'failed').length
        }
    }
}

export const taskManager = new TaskManager()

// 每10分钟清理一次旧任务
setInterval(() => {
    taskManager.cleanup()
}, 10 * 60 * 1000)
