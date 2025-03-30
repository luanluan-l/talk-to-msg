#!/bin/bash

# 如果.cursor目录不存在，则创建它
mkdir -p .cursor

# 获取当前目录路径
CURRENT_DIR=$(pwd)

bun install

# 使用当前目录路径创建mcp.json文件
echo "{
  \"mcpServers\": {
    \"TalkToMsg\": {
      \"command\": \"bun\",
      \"args\": [
        \"${CURRENT_DIR}/src/talk_to_msg_mcp/server.ts\"
      ]
    }
  }
}" > .cursor/mcp.json 