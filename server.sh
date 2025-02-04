#!/bin/bash

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SERVER_SCRIPT="$SCRIPT_DIR/server.py"

# 检查 Python 是否安装
if ! command -v python3 &> /dev/null; then
    echo "Python3 未安装，请先安装 Python3"
    exit 1
fi

# 创建开机启动脚本
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    PLIST_FILE="$HOME/Library/LaunchAgents/com.embyquery.server.plist"
    cat > "$PLIST_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.embyquery.server</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>${SERVER_SCRIPT}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
EOF
    # 加载服务
    launchctl load "$PLIST_FILE"
    echo "已创建并加载 macOS 启动服务"

else
    # Ubuntu/Linux
    SERVICE_FILE="$HOME/.config/systemd/user/embyquery.service"
    mkdir -p "$HOME/.config/systemd/user"
    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Emby Query Server
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 ${SERVER_SCRIPT}
Restart=always

[Install]
WantedBy=default.target
EOF
    # 重新加载systemd
    systemctl --user daemon-reload
    # 启用并启动服务
    systemctl --user enable embyquery
    systemctl --user start embyquery
    echo "已创建并启动 Ubuntu/Linux 系统服务"
fi

# 立即启动服务器
python3 "$SERVER_SCRIPT" &

echo "服务器已在后台启动"
echo "使用 'ps aux | grep server.py' 查看进程状态"
