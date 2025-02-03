@echo off


:: 查找Python路径并存储到pythonPath变量中
for /f "tokens=*" %%i in ('where python') do set pythonPath=%%i && goto :foundPython

:foundPython
echo Python路径是: %pythonPath%

:: 设置变量
set "startupVbs=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\chromeEmbyQueryPlugin.vbs"
set "batPath=%~dp0server.py"

:: 创建一个有效的VBS脚本
(
echo Set WshShell = CreateObject("WScript.Shell"^)
echo WshShell.Run "%pythonPath% %batPath%", 0, True
) > "%startupVbs%"

echo startupVbs路径: %startupVbs%

echo 正在将命令写入VBS脚本并保存至启动文件夹...
timeout /nobreak /t 1 >nul

echo 立即执行创建的VBS脚本...
:: 如果需要立即测试新创建的VBS脚本，请取消以下行的注释:
cmd /c start wscript.exe "%startupVbs%"

echo 请手动关闭此窗口
pause