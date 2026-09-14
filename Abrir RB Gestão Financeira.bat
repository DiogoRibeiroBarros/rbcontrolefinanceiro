@echo off
setlocal
set "APP_DIR=%~dp0app"
set "APP_FILE=%APP_DIR%\index.html"
set "APP_URL=file:///%APP_FILE%"
set "APP_URL=%APP_URL:\=/%"

where msedge >nul 2>nul
if %errorlevel%==0 (
    start "RB Gestão Financeira" msedge --app="%APP_URL%"
    exit /b
)

where chrome >nul 2>nul
if %errorlevel%==0 (
    start "RB Gestão Financeira" chrome --app="%APP_URL%"
    exit /b
)

start "RB Gestão Financeira" "%APP_FILE%"
