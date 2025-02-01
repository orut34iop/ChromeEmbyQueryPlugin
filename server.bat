@echo off
chcp 936

set pythonPath="python"

for /F "usebackq tokens=*" %%A in (`%pythonPath% --version 2^>^&1`) do set PYTHON_VERSION=%%A

if "%PYTHON_VERSION:~0,6%" == "Python" (
    echo Python 版本: %PYTHON_VERSION%
    %pythonPath% -c "import sys; print(sys.executable)"
) else (
    echo 未能检测到Python，请确认安装并添加至系统路径。
    exit /b
)

:: 设置变量
set "startupVbs=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\chromeEmbyQueryPlugin.vbs"
set "batPath=%~dp0server.bat"

:: 创建一个有效的VBS脚本
(
echo Set WshShell = CreateObject("WScript.Shell"^)
echo WshShell.Run "%pythonPath% %batPath%", 0, True
) > "%startupVbs%"

echo startupVbs路径: %startupVbs%

echo 正在将命令写入VBS脚本并保存至启动文件夹...
timeout /nobreak /t 1 >nul
echo 请手动关闭此窗口

:: 如果需要立即测试新创建的VBS脚本，请取消以下行的注释:
:: wscript.exe "%startupVbs%"