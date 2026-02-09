#!/bin/bash
# 快速启动脚本 - 使用 uv 运行服务器（前台运行，用于调试）

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 检查 uv
if ! command -v uv &> /dev/null; then
    echo "[错误] 未找到 uv，请先安装 uv"
    echo "安装命令: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

echo "[信息] 启动 Emby Query 服务器..."
echo "[提示] 按 Ctrl+C 停止服务器"
echo

uv run python server.py
