#!/bin/bash

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SERVER_SCRIPT="$SCRIPT_DIR/server.py"

# 检查 Python 是否安装
if ! command -v python3 > /dev/null 2>&1; then
    echo "Python3 未安装，请先安装 Python3"
    exit 1
fi

# 优先使用 uv 运行；否则回退到 .venv
USE_UV=""
UV_PATH=""
if command -v uv > /dev/null 2>&1; then
    UV_PATH="$(command -v uv)"
    USE_UV=1
    echo "检测到 uv: $UV_PATH"
elif [ -d "$SCRIPT_DIR/.venv" ]; then
    echo "未检测到 uv，将使用 .venv 虚拟环境"
else
    echo "未检测到 uv，也未找到 .venv 虚拟环境"
    echo "请先安装 uv（https://docs.astral.sh/uv/）或在项目目录运行："
    echo "  uv sync"
    exit 1
fi

# 创建开机启动脚本
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    PLIST_FILE="$HOME/Library/LaunchAgents/com.embyquery.server.plist"
    mkdir -p "$(dirname "$PLIST_FILE")"

    if [ -n "$USE_UV" ]; then
        cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.embyquery.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>${UV_PATH}</string>
        <string>run</string>
        <string>python</string>
        <string>${SERVER_SCRIPT}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>${SCRIPT_DIR}</string>
</dict>
</plist>
EOF
    else
        PYTHON_EXEC="$SCRIPT_DIR/.venv/bin/python"
        cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.embyquery.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>${PYTHON_EXEC}</string>
        <string>${SERVER_SCRIPT}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>${SCRIPT_DIR}</string>
</dict>
</plist>
EOF
    fi

    # 加载服务
    launchctl load "$PLIST_FILE" 2>/dev/null || launchctl bootstrap "gui/$(id -u)" "$PLIST_FILE"
    echo "已创建并加载 macOS 启动服务"

else
    # Ubuntu/Linux
    SERVICE_FILE="$HOME/.config/systemd/user/embyquery.service"
    mkdir -p "$HOME/.config/systemd/user"

    if [ -n "$USE_UV" ]; then
        cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Emby Query Server
After=network.target

[Service]
Type=simple
WorkingDirectory=${SCRIPT_DIR}
ExecStart=${UV_PATH} run python ${SERVER_SCRIPT}
Restart=always

[Install]
WantedBy=default.target
EOF
    else
        PYTHON_EXEC="$SCRIPT_DIR/.venv/bin/python"
        cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Emby Query Server
After=network.target

[Service]
Type=simple
WorkingDirectory=${SCRIPT_DIR}
ExecStart=${PYTHON_EXEC} ${SERVER_SCRIPT}
Restart=always

[Install]
WantedBy=default.target
EOF
    fi

    # 重新加载systemd
    systemctl --user daemon-reload
    # 启用并启动服务
    systemctl --user enable embyquery
    systemctl --user start embyquery
    echo "已创建并启动 Ubuntu/Linux 系统服务"
fi

# 立即启动服务器
if [ -n "$USE_UV" ]; then
    "$UV_PATH" run python "$SERVER_SCRIPT" > /tmp/embyquery_server.log 2>&1 &
else
    "$SCRIPT_DIR/.venv/bin/python" "$SERVER_SCRIPT" > /tmp/embyquery_server.log 2>&1 &
fi

SERVER_PID=$!
echo "$SERVER_PID" > /tmp/embyquery_server.pid

echo "服务器已在后台启动 (PID: $SERVER_PID)"
echo "日志: /tmp/embyquery_server.log"
echo "使用 'ps aux | grep server.py' 查看进程状态"
