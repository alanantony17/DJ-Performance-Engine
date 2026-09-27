@echo off
echo =======================================================
echo   DJ PERFORMANCE ENGINE - RESTORE TO WORKING VERSION
echo =======================================================
echo.
echo This will reset the codebase to the verified working build (tag: v1.0-working).
echo Any unsaved experimental changes will be discarded.
echo.
set /p confirm="Are you sure you want to restore? (y/n): "
if /i "%confirm%" neq "y" (
    echo.
    echo Restore cancelled.
    pause
    exit /b
)

git reset --hard v1.0-working
echo.
echo =======================================================
echo   SUCCESS: Codebase restored to v1.0-working!
echo =======================================================
pause
