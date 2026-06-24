@echo off
setlocal

:: 1. 获取当前脚本所在目录（去除末尾的反斜杠，为了后续操作安全）
set "scriptDir=%~dp0"
:: 移除末尾可能存在的反斜杠（虽然通过 cd 通常能处理，但这样更安全）
if "%scriptDir:~-1%"=="\" set "scriptDir=%scriptDir:~0,-1%"

:: 2. 设置关键路径变量
set "startupVbs=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\chromeEmbyQueryPlugin.vbs"
set "pyScriptName=server.py"

:: 3. 检查 uv 是否安装
where uv >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未找到 uv，请先安装 uv
    echo 安装命令: powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
    pause
    exit /b 1
)

echo [信息] 使用 uv 运行 Python 脚本...

:: 4. 创建 VBS 脚本
:: 注意逻辑修改：
:: - 先 cd /d 到脚本目录，确保 uv 能正确找到项目文件
:: - 使用双重引号 """ 处理路径中的空格问题。
(
echo Set WshShell = CreateObject("WScript.Shell"^)
echo ' 关键逻辑：切换目录 ^&^& 启动 uv
echo strCommand = "cmd /c cd /d """ ^& "%scriptDir%" ^& """ ^&^& uv run python " ^& "%pyScriptName%"
echo WshShell.Run strCommand, 0, True
) > "%startupVbs%"

echo ---------------------------------------------------
echo [信息] VBS 启动脚本已创建:
echo %startupVbs%
echo.
echo [目录] 目标工作目录: "%scriptDir%"
echo [脚本] 目标 Python 脚本: "%pyScriptName%"
echo ---------------------------------------------------

echo 正在保存...
timeout /nobreak /t 1 >nul

:: 5. 立即启动服务（用于测试，正常启动后不会有窗口）
echo 正在启动服务进行测试（可关闭此窗口，服务会继续运行）...
cd /d "%scriptDir%"
uv run python "%pyScriptName%"

echo.
echo 完成。可以手动关闭此窗口。
pause
