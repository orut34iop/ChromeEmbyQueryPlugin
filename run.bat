@echo off
:: 快速启动脚本 - 使用 uv 运行服务器（前台运行，用于调试）

cd /d "%~dp0"

:: 检查 uv
where uv >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未找到 uv，请先安装 uv
    echo 安装命令: powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
    pause
    exit /b 1
)

echo [信息] 启动 Emby Query 服务器...
echo [提示] 按 Ctrl+C 停止服务器
echo.

uv run python server.py
