#!/bin/bash
# 灵犀 · 统一 Agent 运营中台 —— 一键启动（零依赖，需 Node ≥ 22.5）
cd "$(dirname "$0")"
PORT="${PORT:-5180}"
echo "启动 灵犀 · 统一 Agent 运营中台 … http://localhost:$PORT/login.html"
echo "（初始密码 hub@2026；数据库文件 server/hub.db，首次运行自动生成）"
PORT="$PORT" node server/server.js
