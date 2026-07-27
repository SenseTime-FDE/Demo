#!/usr/bin/env bash
# 声渡 VoxOne · 一键启动(零依赖,需 Node ≥ 22.5 以启用 node:sqlite)
cd "$(dirname "$0")"
PORT="${PORT:-5190}" exec node server/server.js
