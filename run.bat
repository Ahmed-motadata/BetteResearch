@echo off
echo Starting BetteResearch application...

REM Check if Docker is installed
WHERE docker >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo Docker is not installed. Please install Docker first.
    pause
    exit /b
)

REM Check if Docker Compose is installed
WHERE docker-compose >nul 2>nul
IF %ERRORLEVEL% NEQ 0 (
    echo Docker Compose is not installed. Please install Docker Compose first.
    pause
    exit /b
)

REM For Windows, we need to set up X server (VcXsrv or Xming)
echo Please make sure you have an X server (VcXsrv or Xming) running.
echo With VcXsrv, use these settings:
echo - Multiple windows, Display number: 0, Start no client
echo - Select "Disable access control"
echo.
echo If you don't have it, download from:
echo https://sourceforge.net/projects/vcxsrv/
echo.
echo Press any key when your X server is running...
pause > nul

REM Copy Docker env file
copy /Y .env.docker .env

REM Set DISPLAY for X server
SET DISPLAY=host.docker.internal:0.0

REM Build and start Docker containers
echo Starting PostgreSQL database...
docker-compose up -d postgres

REM Wait for PostgreSQL to be ready
echo Waiting for PostgreSQL to start...
timeout /t 5 /nobreak > nul

REM Start the application
echo Starting BetteResearch application...
docker-compose up app

echo.
echo Application stopped. Press any key to exit...
pause > nul