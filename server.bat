@echo off
setlocal

:: 1. 获取当前脚本所在目录（去掉结尾的反斜杠，为了后续处理方便）
set "scriptDir=%~dp0"
:: 移除末尾可能存在的反斜杠（虽然通常 cd 接受，但在某些引用中更安全）
if "%scriptDir:~-1%"=="\" set "scriptDir=%scriptDir:~0,-1%"

:: 2. 设置关键路径变量
set "startupVbs=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\chromeEmbyQueryPlugin.vbs"
set "pyScriptName=server.py"

:: 3. 创建 VBS 脚本
:: 核心逻辑修改：
:: - 先 cd /d 进入脚本目录，确保 uv 能找到环境和依赖。
:: - 使用三层引号 """ 处理路径中的空格问题。
(
echo Set WshShell = CreateObject("WScript.Shell"^)
echo ' 构造命令: 切换目录 && 运行 uv
echo strCommand = "cmd /c cd /d """ ^& "%scriptDir%" ^& """ && uv run python " ^& "%pyScriptName%"
echo WshShell.Run strCommand, 0, True
) > "%startupVbs%"

echo ---------------------------------------------------
echo [信息] VBS 启动脚本已创建:
echo %startupVbs%
echo.
echo [检查] 目标工作目录: "%scriptDir%"
echo [检查] 目标 Python 脚本: "%pyScriptName%"
echo ---------------------------------------------------

echo 正在保存...
timeout /nobreak /t 1 >nul

:: 4. 测试运行
echo 正在尝试立即运行测试（请检查任务管理器中是否有 python 进程）...
wscript.exe "%startupVbs%"

echo.
echo 完成。请手动关闭此窗口。
pause