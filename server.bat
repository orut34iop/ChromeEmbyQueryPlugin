@echo off


:: ����Python·�����洢��pythonPath������
for /f "tokens=*" %%i in ('where python') do set pythonPath=%%i && goto :foundPython

:foundPython
echo Python·����: %pythonPath%

:: ���ñ���
set "startupVbs=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\chromeEmbyQueryPlugin.vbs"
set "batPath=%~dp0server.py"

:: ����һ����Ч��VBS�ű�
(
echo Set WshShell = CreateObject("WScript.Shell"^)
echo WshShell.Run "%pythonPath% %batPath%", 0, True
) > "%startupVbs%"

echo startupVbs·��: %startupVbs%

echo ���ڽ�����д��VBS�ű��������������ļ���...
timeout /nobreak /t 1 >nul

echo ����ִ�д�����VBS�ű�...
:: �����Ҫ���������´�����VBS�ű�����ȡ�������е�ע��:
cmd /c start wscript.exe "%startupVbs%"

echo ���ֶ��رմ˴���
pause