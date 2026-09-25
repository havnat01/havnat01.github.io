@echo off
chcp 65001 >nul
title Xuất PDF CV Vũ Ngọc Minh
echo ===================================================================
echo   Đang tiến hành xuất file PDF CV (Không ngắt trang & Chuẩn A4)...
echo ===================================================================
echo.

node scripts\export_pdf.js

echo.
echo ===================================================================
echo   Hoàn tất! Các file PDF đã được tạo tại thư mục gốc:
echo   1. Vu-Ngoc-Minh-CV-Continuous.pdf  (1 trang liền mạch, KHÔNG ngắt trang)
echo   2. Vu-Ngoc-Minh-CV-A4.pdf          (Phân trang A4 chuẩn chống cắt chữ)
echo ===================================================================
echo.
pause
