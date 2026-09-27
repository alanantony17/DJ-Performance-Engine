@echo off
echo ========================================================
echo   DJ PERFORMANCE ENGINE - PUSH TO GITHUB
echo ========================================================
echo.
echo Pushing branch 'main' and all version tags to:
echo https://github.com/alanantony17/DJ-Performance-Engine.git
echo.
git push -u origin main --tags
echo.
if %ERRORLEVEL% equ 0 (
    echo ========================================================
    echo   SUCCESS: Code and tags pushed to GitHub!
    echo ========================================================
) else (
    echo ========================================================
    echo   Push encountered an error. 
    echo   If prompted, sign in via your browser window.
    echo ========================================================
)
echo.
pause
