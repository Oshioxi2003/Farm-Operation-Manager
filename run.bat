@echo off
chcp 65001 >nul
title Farm Operation Manager

echo ==========================================
echo    Farm Operation Manager - Launcher
echo ==========================================
echo.

:: Kiểm tra Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [LỖI] Không tìm thấy Node.js. Vui lòng cài đặt Node.js trước.
    pause
    exit /b 1
)

:: Kiểm tra thư mục node_modules
if not exist "node_modules" (
    echo [INFO] Đang cài đặt dependencies...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [LỖI] Cài đặt dependencies thất bại!
        pause
        exit /b 1
    )
    echo.
    echo [OK] Cài đặt dependencies thành công!
    echo.
)

:: Đồng bộ database schema
echo [INFO] Đang đồng bộ database schema...
echo.
call npx drizzle-kit push --force
if %errorlevel% neq 0 (
    echo [CẢNH BÁO] Đồng bộ database thất bại. Kiểm tra lại kết nối database trong file .env
    echo.
)

:: Chạy ứng dụng
echo.
echo [INFO] Đang khởi động ứng dụng...
echo.
call npm run dev
