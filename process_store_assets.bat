@echo off
rem ===========================================================================
rem Image Processing Script for Store Assets
rem ===========================================================================
rem Description:
rem   This script uses ImageMagick to process images from the 'screenshots'
rem   directory and saves them to the 'store_assets' directory with specific
rem   resolutions required for the publication page.
rem
rem Requirements:
rem   - ImageMagick v7+ installed and available in PATH as 'magick'.
rem
rem Directory Structure Assumed:
rem   Input:
rem     - screenshots/screenshots/{lang}/*.jpg
rem     - screenshots/promo/*.jpg
rem   Output:
rem     - store_assets/screenshots/{lang}/*.jpg (1280x800)
rem     - store_assets/promo/*.jpg (440x280)
rem ===========================================================================

setlocal enabledelayedexpansion

rem Define root directory
set "ROOT=%~dp0"

echo [INFO] Starting image processing...
echo [INFO] Root directory: %ROOT%

rem ---------------------------------------------------------
rem Configuration
rem ---------------------------------------------------------
set "SRC_ROOT=%ROOT%screenshots"
set "DST_ROOT=%ROOT%store_assets"

set "SCREENSHOT_RES=1280x800"
set "PROMO_RES=440x280"

rem Check if source directory exists
if not exist "!SRC_ROOT!" (
    echo [ERROR] Source directory not found: !SRC_ROOT!
    pause
    exit /b 1
)

rem ---------------------------------------------------------
rem 1. Process Screenshots
rem ---------------------------------------------------------
set "S_SRC_BASE=!SRC_ROOT!\screenshots"
set "S_DST_BASE=!DST_ROOT!\screenshots"

if exist "!S_SRC_BASE!" (
    echo.
    echo [TASK] Processing Screenshots...
    
    rem Loop through all subdirectories (languages)
    for /d %%D in ("!S_SRC_BASE!\*") do (
        set "LANG_CODE=%%~nxD"
        set "CUR_SRC=%%D"
        set "CUR_DST=!S_DST_BASE!\!LANG_CODE!"
        
        echo    - Language: !LANG_CODE!
        
        if not exist "!CUR_DST!" (
            echo      Creating directory: !CUR_DST!
            mkdir "!CUR_DST!"
        )
        
        for %%F in ("!CUR_SRC!\*.*") do (
            echo      Converting: %%~nxF -^> !SCREENSHOT_RES!
            
            rem Resize logic:
            rem 1. -resize: Resize to fit within box preserving aspect ratio
            rem 2. -background: Set background color for padding
            rem 3. -gravity: Center the image
            rem 4. -extent: Pad to exact dimensions
            rem 5. -quality: Set JPEG quality
            
            magick "%%F" -resize !SCREENSHOT_RES! -background white -gravity center -extent !SCREENSHOT_RES! -quality 95 "!CUR_DST!\%%~nxF"
        )
    )
) else (
    echo [WARN] No screenshots subdirectory found in !SRC_ROOT!.
)

rem ---------------------------------------------------------
rem 2. Process Promo Images
rem ---------------------------------------------------------
set "P_SRC=!SRC_ROOT!\promo"
set "P_DST=!DST_ROOT!\promo"

if exist "!P_SRC!" (
    echo.
    echo [TASK] Processing Promo Images...
    
    if not exist "!P_DST!" (
        echo      Creating directory: !P_DST!
        mkdir "!P_DST!"
    )
    
    for %%F in ("!P_SRC!\*.*") do (
        echo      Converting: %%~nxF -^> !PROMO_RES!
        magick "%%F" -resize !PROMO_RES! -background white -gravity center -extent !PROMO_RES! -quality 95 "!P_DST!\%%~nxF"
    )
) else (
    echo [WARN] No promo subdirectory found in !SRC_ROOT!.
)

echo.
echo =======================================================
echo [SUCCESS] Processing complete.
echo Assets located in: !DST_ROOT!
echo =======================================================
pause
