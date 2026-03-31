@echo off
setlocal enabledelayedexpansion

:: ============================================================
:: My Everything (ME) Deploy Script
:: Extracts update zips, validates build, commits & pushes
:: Usage: deploy.bat <zip-file> "commit message"
:: Example: deploy.bat %USERPROFILE%\Downloads\ME-v5.2.zip "feat: add analytics"
:: ============================================================

:: ---- Parse arguments ----

set "ZIP_FILE=%~1"
set "COMMIT_MSG=%~2"
set "NO_PUSH=false"
set "DRY_RUN=false"

if "%ZIP_FILE%"=="--help" goto :show_help
if "%ZIP_FILE%"=="" goto :no_zip

:: Check for flags in any position
for %%a in (%*) do (
    if "%%~a"=="--no-push" set "NO_PUSH=true"
    if "%%~a"=="--dry-run" set "DRY_RUN=true"
    if "%%~a"=="--help" goto :show_help
)

:: ---- Validate zip file ----

if not exist "%ZIP_FILE%" (
    :: Try Downloads folder
    if exist "%USERPROFILE%\Downloads\%ZIP_FILE%" (
        set "ZIP_FILE=%USERPROFILE%\Downloads\%ZIP_FILE%"
    ) else (
        echo.
        echo   ERROR: Zip file not found: %ZIP_FILE%
        echo   Also checked: %USERPROFILE%\Downloads\%ZIP_FILE%
        echo.
        exit /b 1
    )
)

:: Auto-generate commit message if not provided
if "%COMMIT_MSG%"=="" (
    for %%F in ("%ZIP_FILE%") do set "BASENAME=%%~nF"
    set "COMMIT_MSG=update: !BASENAME!"
    echo   NOTE: No commit message provided, using: "!COMMIT_MSG!"
)

:: ---- Get project directory (where this script lives) ----

set "PROJECT_DIR=%~dp0"
set "BACKUP_DIR=%PROJECT_DIR%.backups"

echo.
echo ========================================
echo   ME Deploy Script
echo ========================================
echo   Zip:     %ZIP_FILE%
echo   Project: %PROJECT_DIR%
if "%DRY_RUN%"=="true" echo   Mode:    DRY RUN
if "%NO_PUSH%"=="true" echo   Mode:    COMMIT ONLY (no push)
echo.

:: ---- Step 1: Backup ----

echo [1] Creating backup...

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: Get timestamp
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set "DT=%%I"
set "TIMESTAMP=%DT:~0,8%_%DT:~8,6%"

:: Save current git hash as backup reference
git rev-parse --short HEAD > "%BACKUP_DIR%\backup_%TIMESTAMP%.ref" 2>nul
if %errorlevel% equ 0 (
    set /p CURRENT_HASH=<"%BACKUP_DIR%\backup_%TIMESTAMP%.ref"
    echo   OK - Backup reference saved (git: !CURRENT_HASH!)
) else (
    echo   OK - No git history yet, skipping backup ref
)

:: ---- Step 2: Extract zip ----

echo.
echo [2] Extracting update...
echo.
echo   Files in update:

:: List contents of zip
tar -tf "%ZIP_FILE%" 2>nul | findstr /v /r "/$" | head 2>nul
if %errorlevel% neq 0 (
    powershell -command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::OpenRead('%ZIP_FILE%').Entries | ForEach-Object { Write-Host ('    ' + $_.FullName) }" 2>nul
)

echo.

:: Extract using tar (built into Windows 10+) or PowerShell fallback
tar -xf "%ZIP_FILE%" -C "%PROJECT_DIR%" 2>nul
if %errorlevel% neq 0 (
    powershell -command "Expand-Archive -Path '%ZIP_FILE%' -DestinationPath '%PROJECT_DIR%' -Force"
)

echo   OK - Files extracted

:: ---- Step 3: Validate build ----

echo.
echo [3] Validating build...

cd /d "%PROJECT_DIR%"

:: Install dependencies if needed
if not exist "node_modules" (
    echo   Installing dependencies...
    call npm install --silent 2>nul
)

:: Check if package.json was in the zip (new dependencies might be needed)
tar -tf "%ZIP_FILE%" 2>nul | findstr /i "package.json" >nul 2>nul
if %errorlevel% equ 0 (
    echo   package.json updated, reinstalling dependencies...
    call npm install --silent 2>nul
)

:: Run build
echo   Running build...
call npx vite build >"%TEMP%\me_build.log" 2>&1
if %errorlevel% neq 0 (
    echo.
    echo   BUILD FAILED!
    echo.
    echo   Build output:
    type "%TEMP%\me_build.log" | more
    echo.

    :: Rollback
    if exist "%BACKUP_DIR%\backup_%TIMESTAMP%.ref" (
        set /p RESTORE_HASH=<"%BACKUP_DIR%\backup_%TIMESTAMP%.ref"
        echo   Rolling back...
        git checkout -- . 2>nul
        echo   Rolled back to !RESTORE_HASH!
    )

    echo.
    echo   Deploy aborted. Fix the errors and try again.
    del "%TEMP%\me_build.log" 2>nul
    exit /b 1
)

echo   OK - Build passed!

:: Show build info
for /f "delims=" %%L in ('findstr /i "dist built" "%TEMP%\me_build.log" 2^>nul') do echo     %%L
del "%TEMP%\me_build.log" 2>nul

:: ---- Stop if dry run ----

if "%DRY_RUN%"=="true" (
    echo.
    echo   Dry run complete. No git operations performed.
    exit /b 0
)

:: ---- Step 4: Git commit ----

echo.
echo [4] Committing changes...

cd /d "%PROJECT_DIR%"

:: Check for changes
git diff --quiet 2>nul && git diff --cached --quiet 2>nul
if %errorlevel% equ 0 (
    echo   No changes detected. Nothing to commit.
    exit /b 0
)

git add -A
git commit -m "%COMMIT_MSG%" --quiet

for /f "delims=" %%H in ('git rev-parse --short HEAD') do set "COMMIT_HASH=%%H"
echo   OK - Committed: %COMMIT_HASH% - %COMMIT_MSG%

:: Show what changed
echo.
echo   Changes:
git diff --stat HEAD~1 2>nul

:: ---- Stop if no-push ----

if "%NO_PUSH%"=="true" (
    echo.
    echo   Committed locally. Run "git push" when ready.
    exit /b 0
)

:: ---- Step 5: Push to GitHub ----

echo.
echo [5] Pushing to GitHub...

for /f "delims=" %%B in ('git branch --show-current') do set "BRANCH=%%B"
git push origin %BRANCH% --quiet 2>&1

if %errorlevel% neq 0 (
    echo   Push failed. You may need to run: git push -u origin %BRANCH%
    exit /b 1
)

echo   OK - Pushed to origin/%BRANCH%

:: ---- Done ----

echo.
echo ========================================
echo   Deploy complete!
echo ========================================
echo   Commit:  %COMMIT_HASH%
echo   Branch:  %BRANCH%
echo   Message: %COMMIT_MSG%
echo.

exit /b 0

:: ---- Help text ----

:show_help
echo.
echo My Everything (ME) Deploy Script
echo =================================
echo.
echo Usage:
echo   deploy.bat ^<zip-file^> "commit message"
echo.
echo Examples:
echo   deploy.bat %%USERPROFILE%%\Downloads\ME-v5.2.zip "feat: add analytics"
echo   deploy.bat ME-v5.3.zip "fix: timer pause bug"
echo.
echo Options:
echo   --help        Show this help message
echo   --no-push     Commit but don't push to GitHub
echo   --dry-run     Extract and build only, no git operations
echo.
exit /b 0

:no_zip
echo.
echo   ERROR: No zip file specified.
echo   Usage: deploy.bat ^<zip-file^> "commit message"
echo   Run "deploy.bat --help" for more info.
echo.
exit /b 1
