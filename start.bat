@echo off
chcp 65001 >nul 2>&1
title 双语逐页朗读器

cd /d "%~dp0"

echo.
echo ========================================
echo    双语逐页朗读器
echo ========================================
echo.

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js
    echo 下载地址: https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: 检查 Node.js 版本
for /f "tokens=1 delims=v" %%v in ('node -v 2^>nul') do set NODE_VER=%%v
echo Node.js 版本: v%NODE_VER%

:: 检查是否已构建
if not exist "dist\index.html" (
    echo.
    echo 未找到构建产物，正在执行构建...
    echo.

    where npm >nul 2>&1
    if %errorlevel% neq 0 (
        echo [错误] 未找到 npm，无法构建
        pause
        exit /b 1
    )

    call npm install
    if %errorlevel% neq 0 (
        echo [错误] npm install 失败
        pause
        exit /b 1
    )

    call npm run build
    if %errorlevel% neq 0 (
        echo [错误] 构建失败
        pause
        exit /b 1
    )

    echo 构建完成!
)

echo.
echo 正在启动服务，浏览器将自动打开...
echo 如需停止，关闭此窗口即可
echo.

node server.mjs
if %errorlevel% neq 0 (
    echo.
    echo [错误] 服务启动失败
    pause
)
