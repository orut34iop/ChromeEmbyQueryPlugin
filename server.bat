@echo off
chcp 936

set pythonPath="python"

for /F "usebackq tokens=*" %%A in (`%pythonPath% --version 2^>^&1`) do set PYTHON_VERSION=%%A

if "%PYTHON_VERSION:~0,6%" == "Python" (
    echo Python �汾: %PYTHON_VERSION%
    %pythonPath% -c "import sys; print(sys.executable)"
) else (
    echo δ�ܼ�⵽Python����ȷ�ϰ�װ�������ϵͳ·����
    exit /b
)

:: ���ñ���
set "startupVbs=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\chromeEmbyQueryPlugin.vbs"
set "batPath=%~dp0server.bat"

:: ����һ����Ч��VBS�ű�
(
echo Set WshShell = CreateObject("WScript.Shell"^)
echo WshShell.Run "%pythonPath% %batPath%", 0, True
) > "%startupVbs%"

echo startupVbs·��: %startupVbs%

echo ���ڽ�����д��VBS�ű��������������ļ���...
timeout /nobreak /t 1 >nul
echo ���ֶ��رմ˴���

:: �����Ҫ���������´�����VBS�ű�����ȡ�������е�ע��:
:: wscript.exe "%startupVbs%"