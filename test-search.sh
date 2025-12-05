#!/bin/bash

# 启动服务器（如果还没启动）
echo "🚀 启动服务器..."
cd /Users/huang/Documents/code/lab/map-search

# 杀死旧进程
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 1

# 启动新服务器
pnpm run dev:server &
SERVER_PID=$!

sleep 3

echo "📍 发起批量搜索请求..."
RESPONSE=$(curl -s http://localhost:3000/api/bulk-search/奶茶)
TASK_ID=$(echo $RESPONSE | grep -o '"taskId":"[^"]*' | cut -d'"' -f4)

echo "✅ 任务已创建，Task ID: $TASK_ID"
echo ""
echo "📊 实时查看进度:"

# 每2秒查询一次进度
for i in {1..60}; do
  TASK_INFO=$(curl -s http://localhost:3000/api/task/$TASK_ID)
  STATUS=$(echo $TASK_INFO | grep -o '"status":"[^"]*' | cut -d'"' -f4)
  CURRENT=$(echo $TASK_INFO | grep -o '"current":[0-9]*' | cut -d':' -f2)
  TOTAL=$(echo $TASK_INFO | grep -o '"total":[0-9]*' | cut -d':' -f2)
  
  if [ "$STATUS" = "completed" ]; then
    echo "✅ 任务已完成！"
    break
  elif [ "$STATUS" = "failed" ]; then
    echo "❌ 任务失败"
    break
  fi
  
  echo "Task $TASK_ID - Status: $STATUS - Progress: $CURRENT/$TOTAL"
  sleep 2
done

echo ""
echo "📊 获取最终结果..."
RESULT=$(curl -s http://localhost:3000/api/saved-pois/奶茶)
echo $RESULT | head -20
