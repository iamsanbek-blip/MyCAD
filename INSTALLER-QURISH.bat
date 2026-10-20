@echo off
setlocal
chcp 65001 >nul
title Rugby - imzolangan portable qurish
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 goto missing
call npm run check
if errorlevel 1 goto fail
call npm test
if errorlevel 1 goto fail
if exist package-lock.json (
  call npm ci --no-audit --no-fund
) else (
  call npm install --no-audit --no-fund
)
if errorlevel 1 goto fail
call npm run dist:portable
if errorlevel 1 goto fail
echo TAYYOR: dist papkasidagi Rugby-Portable.exe
echo Tarqatishdan oldin Windows Smart App Control yoqilgan kompyuterda tekshiring.
start "" "%cd%\dist"
pause
exit /b 0
:missing
echo Node.js va npm o'rnating, so'ng yana ishga tushiring.
pause
exit /b 1
:fail
echo Qurish yakunlanmadi. Yuqoridagi birinchi xatoni tekshiring.
pause
exit /b 1
